import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { config } from '../config.js';
import { PrismaService } from '../prisma.service.js';

// Fingerprints are passkeys (WebAuthn). A passkey only works on the site it was made for, the
// "relying party": the portal's own address (portal.agee.pro, or localhost locally).
export const relyingParty = {
  name: 'CSA Portal',
  id: new URL(config.portalOrigin).hostname,
  origin: config.portalOrigin,
};

const CHALLENGE_MS = 5 * 60 * 1000;

export type ChallengePurpose = 'register' | 'login';

// The random challenges a fingerprint reader signs. Each is used up by the first reading that
// comes back with it, so a recorded reading can't be sent again.
@Injectable()
export class ChallengesService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(challenge: string, purpose: ChallengePurpose, userId?: string): Promise<void> {
    await this.prisma.webauthnChallenge.create({
      data: { challenge, purpose, userId, expiresAt: new Date(Date.now() + CHALLENGE_MS) },
    });
    // now and then, clear out ones that were never used
    if (Math.random() < 0.05) await this.prisma.webauthnChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }

  // true once, for a challenge issued for this purpose (and account) that hasn't expired
  async take(challenge: string, purpose: ChallengePurpose, userId?: string): Promise<boolean> {
    const { count } = await this.prisma.webauthnChallenge.deleteMany({
      where: { challenge, purpose, userId: userId ?? null, expiresAt: { gt: new Date() } },
    });
    return count === 1;
  }
}

// What the browser sends back from the fingerprint reader, when adding one (registration) and when
// signing in (authentication). Only their outline is checked here; the WebAuthn library checks the
// contents, and their signature, properly.
const base64url = z.string().max(4096).regex(/^[A-Za-z0-9_-]*$/);
const reading = <T extends z.ZodRawShape>(response: T) =>
  z
    .object({
      id: base64url,
      rawId: base64url,
      type: z.literal('public-key'),
      response: z.looseObject({ clientDataJSON: base64url, ...response }),
      clientExtensionResults: z.looseObject({}),
      authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
    })
    .strict();

export const registrationReading = reading({ attestationObject: base64url });
export const loginReading = reading({ authenticatorData: base64url, signature: base64url, userHandle: base64url.optional() });
