import { Body, Controller, HttpCode, HttpException, HttpStatus, Post, Req, Res } from '@nestjs/common';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import type { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import type { Fingerprint, User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { parse } from '../auth/identifiers.js';
import { profile } from '../auth/profile.js';
import { SessionsService } from '../auth/sessions.service.js';
import { HumanService } from '../security/human.service.js';
import { RateLimitService } from '../security/rate-limit.service.js';
import { clientIp, userAgent } from '../security/request.js';
import { signed, unsigned } from '../security/signing.js';
import { FingerprintsService } from './fingerprints.service.js';
import { loginReading } from './webauthn.js';

// After a fingerprint linked to several accounts is read, the browser holds this signed cookie for
// 3 minutes while the person picks one. It says which fingerprint was read, and nothing else.
const PICK_COOKIE = '__Host-csa_pick';
const PICK_MS = 3 * 60 * 1000;
const cookie: CookieOptions = { httpOnly: true, secure: true, sameSite: 'strict', path: '/' };

const loginBody = z.object({ reading: loginReading }).strict();
const chooseBody = z.object({ userId: z.uuid() }).strict();

// Signing in with a fingerprint, from the login page: no password needed. The bot check and rate
// limits apply as for a password login.
// - A fingerprint linked to one account signs straight in to it.
// - One linked to several answers with the accounts (names and usernames only) to choose from.
@Controller('auth/fingerprint')
export class FingerprintLoginController {
  constructor(
    private readonly fingerprints: FingerprintsService,
    private readonly sessions: SessionsService,
    private readonly auth: AuthService,
    private readonly human: HumanService,
    private readonly limits: RateLimitService,
    private readonly prisma: PrismaService,
  ) {}

  // what the browser needs to ask for a fingerprint
  @Post('options')
  @HttpCode(200)
  async options(@Req() req: Request) {
    this.human.require(req);
    await this.limits.enforce([{ key: `fingerprint-options:${clientIp(req)}`, max: 30, windowSeconds: 60 }]);
    return this.fingerprints.loginOptions();
  }

  @Post()
  @HttpCode(200)
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.human.require(req);
    const ip = clientIp(req);
    await this.limits.enforce([{ key: `fingerprint:${ip}`, max: 20, windowSeconds: 600 }]);
    const { reading } = parse(loginBody, body);

    const result = await this.fingerprints.verifyLogin(reading as AuthenticationResponseJSON);
    if (result.outcome !== 'ok') {
      await this.auth.record('LOGIN_FAILURE', null, { ip, userAgent: userAgent(req) }, { detail: 'fingerprint' });
      const code = result.outcome === 'unknown' ? 'unknown_fingerprint' : 'not_verified';
      throw new HttpException({ code }, HttpStatus.UNAUTHORIZED);
    }

    const { fingerprint, accounts } = result;
    if (accounts.length === 0) throw new HttpException({ code: 'not_linked' }, HttpStatus.UNAUTHORIZED);
    if (accounts.length === 1) return { user: await this.signIn(accounts[0], fingerprint, req, res) };

    res.cookie(PICK_COOKIE, signed('pick', `${fingerprint.id}.${Date.now() + PICK_MS}`), { ...cookie, maxAge: PICK_MS });
    return { choose: accounts.map(({ id, name, username }) => ({ id, name, username })) };
  }

  // the account picked, for a fingerprint linked to several
  @Post('choose')
  @HttpCode(200)
  async choose(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.human.require(req);
    await this.limits.enforce([{ key: `fingerprint-choose:${clientIp(req)}`, max: 20, windowSeconds: 600 }]);
    const { userId } = parse(chooseBody, body);

    const [fingerprintId, expires] = unsigned('pick', req.cookies?.[PICK_COOKIE])?.split('.') ?? [];
    if (!fingerprintId || !(Number(expires) > Date.now())) throw new HttpException({ code: 'expired' }, HttpStatus.UNAUTHORIZED);
    const link = await this.fingerprints.linkedAccount(fingerprintId, userId);
    if (!link) throw new HttpException({ code: 'not_linked' }, HttpStatus.FORBIDDEN);

    res.clearCookie(PICK_COOKIE, cookie);
    return { user: await this.signIn(link.user, link.fingerprint, req, res) };
  }

  // a fresh session for the account (ending any this browser already had), as a password login does
  private async signIn(user: User, fingerprint: Fingerprint, req: Request, res: Response) {
    const caller = { ip: clientIp(req), userAgent: userAgent(req) };
    await this.sessions.revoke(req);
    await this.sessions.start(res, user.id, caller.ip, caller.userAgent);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.auth.record('LOGIN_SUCCESS', user.id, caller, { targetId: fingerprint.id, detail: 'fingerprint' });
    return profile(user);
  }
}
