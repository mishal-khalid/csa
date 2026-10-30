import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { Fingerprint, FingerprintAccount, User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { AuthService, type Caller } from '../auth/auth.service.js';
import { ChallengesService, relyingParty } from './webauthn.js';

const withAccounts = { accounts: { include: { user: true } } } as const;
type WithAccounts = Fingerprint & { accounts: (FingerprintAccount & { user: User })[] };

// a fingerprint's linked accounts, in account-number order
const accountsOf = (fingerprint: WithAccounts) => fingerprint.accounts.map((link) => link.user).sort((a, b) => a.number - b.number);

// one row of the Fingerprint Management table
const row = (fingerprint: WithAccounts) => ({
  id: fingerprint.id,
  name: fingerprint.name,
  createdAt: fingerprint.createdAt,
  lastUsedAt: fingerprint.lastUsedAt,
  accounts: accountsOf(fingerprint).map(({ id, name, username }) => ({ id, name, username })),
});

const isUniqueViolation = (error: unknown) => (error as { code?: string } | null)?.code === 'P2002';

// how long a reader may take: long enough to scan a QR code with a phone
const READ_MS = 2 * 60 * 1000;

export type FingerprintLogin =
  | { outcome: 'unknown' }
  | { outcome: 'not_verified' }
  | { outcome: 'ok'; fingerprint: Fingerprint; accounts: User[] };

// Fingerprint Management (for the main account) and fingerprint sign-in. Each fingerprint is a
// passkey: adding one asks the browser to make a passkey that needs the device's fingerprint
// (user verification required) and can be found without a username (a "discoverable" credential),
// so the login page can ask for any fingerprint at all. Every change goes in the sign-in record.
@Injectable()
export class FingerprintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly challenges: ChallengesService,
    private readonly auth: AuthService,
  ) {}

  async list() {
    const fingerprints = await this.prisma.fingerprint.findMany({ include: withAccounts, orderBy: { createdAt: 'asc' } });
    return fingerprints.map(row);
  }

  // What the browser needs to read a new fingerprint. The passkey is named after the fingerprint,
  // which is what devices show when they ask which passkey to use.
  async registrationOptions(name: string, me: User) {
    const options = await generateRegistrationOptions({
      rpName: relyingParty.name,
      rpID: relyingParty.id,
      userName: name,
      userDisplayName: name,
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      timeout: READ_MS,
    });
    await this.challenges.issue(options.challenge, 'register', me.id);
    return options;
  }

  async register(name: string, reading: RegistrationResponseJSON, me: User, caller: Caller) {
    const verification = await verifyRegistrationResponse({
      response: reading,
      expectedChallenge: (challenge) => this.challenges.take(challenge, 'register', me.id),
      expectedOrigin: relyingParty.origin,
      expectedRPID: relyingParty.id,
      requireUserVerification: true,
    }).catch(() => null);
    if (!verification?.verified) throw new BadRequestException({ code: 'not_verified' });

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    try {
      const fingerprint = await this.prisma.fingerprint.create({
        data: {
          name,
          credentialId: credential.id,
          publicKey: credential.publicKey,
          counter: BigInt(credential.counter),
          transports: credential.transports ?? [],
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          createdById: me.id,
        },
        include: withAccounts,
      });
      await this.auth.record('FINGERPRINT_ADDED', me.id, caller, { targetId: fingerprint.id, detail: name });
      return row(fingerprint);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException({ code: 'already_added' });
      throw error;
    }
  }

  async rename(id: string, name: string, me: User, caller: Caller) {
    await this.find(id);
    const fingerprint = await this.prisma.fingerprint.update({ where: { id }, data: { name }, include: withAccounts });
    await this.auth.record('FINGERPRINT_UPDATED', me.id, caller, { targetId: id, detail: 'name' });
    return row(fingerprint);
  }

  // `confirm` is the fingerprint's name, typed out (case and outer spaces don't matter)
  async remove(id: string, confirm: string, me: User, caller: Caller) {
    const fingerprint = await this.find(id);
    if (confirm.trim().toLowerCase() !== fingerprint.name.trim().toLowerCase()) throw new BadRequestException({ code: 'confirm' });
    await this.prisma.fingerprint.delete({ where: { id } });
    await this.auth.record('FINGERPRINT_DELETED', me.id, caller, { targetId: id, detail: fingerprint.name });
  }

  async link(id: string, userId: string, me: User, caller: Caller) {
    await this.find(id);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'no_account' });
    await this.prisma.fingerprintAccount.upsert({
      where: { fingerprintId_userId: { fingerprintId: id, userId } },
      create: { fingerprintId: id, userId },
      update: {},
    });
    await this.auth.record('FINGERPRINT_UPDATED', me.id, caller, { targetId: id, detail: `linked ${user.username}` });
    return row(await this.find(id));
  }

  async unlink(id: string, userId: string, me: User, caller: Caller) {
    await this.find(id);
    const { count } = await this.prisma.fingerprintAccount.deleteMany({ where: { fingerprintId: id, userId } });
    if (count) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
      await this.auth.record('FINGERPRINT_UPDATED', me.id, caller, { targetId: id, detail: `unlinked ${user?.username ?? userId}` });
    }
    return row(await this.find(id));
  }

  // What the login page's browser needs to ask for a fingerprint: any passkey for the portal, as
  // long as the device checks the finger (or its own PIN) first.
  async loginOptions() {
    const options = await generateAuthenticationOptions({
      rpID: relyingParty.id,
      userVerification: 'required',
      timeout: READ_MS,
    });
    await this.challenges.issue(options.challenge, 'login');
    return options;
  }

  // Checks a fingerprint reading from the login page; if it's one of ours, notes the use and says
  // which active accounts it signs in to.
  async verifyLogin(reading: AuthenticationResponseJSON): Promise<FingerprintLogin> {
    const fingerprint = await this.prisma.fingerprint.findUnique({ where: { credentialId: reading.id }, include: withAccounts });
    if (!fingerprint) return { outcome: 'unknown' };

    const verification = await verifyAuthenticationResponse({
      response: reading,
      expectedChallenge: (challenge) => this.challenges.take(challenge, 'login'),
      expectedOrigin: relyingParty.origin,
      expectedRPID: relyingParty.id,
      credential: {
        id: fingerprint.credentialId,
        publicKey: fingerprint.publicKey,
        counter: Number(fingerprint.counter),
        transports: fingerprint.transports,
      },
      requireUserVerification: true,
    }).catch(() => null);
    if (!verification?.verified) return { outcome: 'not_verified' };

    await this.prisma.fingerprint.update({
      where: { id: fingerprint.id },
      data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() },
    });
    return { outcome: 'ok', fingerprint, accounts: accountsOf(fingerprint).filter((user) => user.active) };
  }

  // the account, if this fingerprint is (still) linked to it and it's active
  async linkedAccount(fingerprintId: string, userId: string) {
    const link = await this.prisma.fingerprintAccount.findUnique({
      where: { fingerprintId_userId: { fingerprintId, userId } },
      include: { user: true, fingerprint: true },
    });
    return link?.user.active ? link : null;
  }

  private async find(id: string): Promise<WithAccounts> {
    const fingerprint = await this.prisma.fingerprint.findUnique({ where: { id }, include: withAccounts });
    if (!fingerprint) throw new NotFoundException({ code: 'not_found' });
    return fingerprint;
  }
}
