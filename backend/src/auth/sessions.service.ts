import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { PrismaService } from '../prisma.service.js';
import type { User } from '../generated/prisma/client.js';

export const SESSION_COOKIE = '__Host-csa_session';
// a session ends after 12 hours, or after 30 minutes without use
const LIFETIME_MS = 12 * 60 * 60 * 1000;
const IDLE_MS = 30 * 60 * 1000;

// The cookie can't be read by the page's scripts (httpOnly), only travels over HTTPS (secure), and
// is never sent from another site (sameSite strict). The __Host- prefix makes browsers refuse it
// unless it's also scoped to exactly this host.
const cookie: CookieOptions = { httpOnly: true, secure: true, sameSite: 'strict', path: '/' };

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

// Server-side sessions: a random 256-bit token in the cookie, its hash in the database. Signing out
// (or an expired, idle or revoked session) ends it on the server, not just in the browser.
@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async start(res: Response, userId: string, ip: string, userAgent?: string): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.session.create({
      data: { tokenHash: digest(token), userId, ip, userAgent, expiresAt: new Date(Date.now() + LIFETIME_MS) },
    });
    res.cookie(SESSION_COOKIE, token, { ...cookie, maxAge: LIFETIME_MS });
  }

  // the signed-in account, or null
  async current(req: Request): Promise<User | null> {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || token.length > 100) return null;
    const session = await this.prisma.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: true } });
    const now = Date.now();
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= now ||
      session.lastSeenAt.getTime() <= now - IDLE_MS ||
      !session.user.active
    ) {
      return null;
    }
    // note the use (at most once a minute) to keep the idle timer going
    if (session.lastSeenAt.getTime() < now - 60_000) {
      await this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
    }
    return session.user;
  }

  // signs out: ends the session on the server and clears the cookie; returns whose it was
  async end(req: Request, res: Response): Promise<string | null> {
    res.clearCookie(SESSION_COOKIE, cookie);
    return this.revoke(req);
  }

  // ends every session of an account except this browser's (after its password is changed)
  async revokeOthers(userId: string, req: Request): Promise<void> {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    const keep = typeof token === 'string' && token.length <= 100 ? digest(token) : '';
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null, tokenHash: { not: keep } },
      data: { revokedAt: new Date() },
    });
  }

  // ends the browser's session on the server only (e.g. before a fresh login replaces the cookie)
  async revoke(req: Request): Promise<string | null> {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || token.length > 100) return null;
    const session = await this.prisma.session.findUnique({ where: { tokenHash: digest(token) } });
    if (!session || session.revokedAt) return null;
    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return session.userId;
  }
}
