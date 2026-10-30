import { randomBytes } from 'node:crypto';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { config } from '../config.js';
import { signed, unsigned } from './signing.js';

const COOKIE = '__Host-csa_human';
const LIFETIME_MS = 20 * 60 * 1000;

// The bot check. The portal runs Cloudflare Turnstile invisibly and sends its token here once; if
// Cloudflare vouches for it, the browser gets a signed cookie, good for 20 minutes, which account
// lookups and logins require. Without it they answer 403 "challenge", and the portal runs the
// check again.
@Injectable()
export class HumanService {
  async verifyTurnstile(token: string, ip: string): Promise<boolean> {
    try {
      const reply = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({ secret: config.turnstileSecret, response: token, remoteip: ip }),
        signal: AbortSignal.timeout(5000),
      });
      const result = (await reply.json()) as { success?: boolean };
      return result.success === true;
    } catch {
      return false;
    }
  }

  grant(res: Response): void {
    const expires = Date.now() + LIFETIME_MS;
    const payload = `${expires}.${randomBytes(16).toString('base64url')}`;
    res.cookie(COOKIE, signed('human', payload), {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: LIFETIME_MS,
    });
  }

  require(req: Request): void {
    if (!this.isHuman(req)) throw new ForbiddenException({ code: 'challenge' });
  }

  private isHuman(req: Request): boolean {
    const payload = unsigned('human', req.cookies?.[COOKIE]);
    return payload !== null && Number(payload.split('.')[0]) > Date.now();
  }
}
