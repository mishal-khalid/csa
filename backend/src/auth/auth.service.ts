import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type { AuthEventType, User } from '../generated/prisma/client.js';
import type { Identifier } from './identifiers.js';
import { checkAgainstNothing, checkPassword } from './passwords.js';

// after this many wrong passwords in a row the account locks for LOCK_MINUTES
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

export type LoginResult =
  | { outcome: 'ok'; user: User }
  | { outcome: 'no_account' }
  | { outcome: 'wrong_password' }
  | { outcome: 'locked'; retryAfter: number };

export interface Caller {
  ip: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private find(identifier: Identifier) {
    return identifier.kind === 'email'
      ? this.prisma.user.findUnique({ where: { email: identifier.value } })
      : this.prisma.user.findUnique({ where: { username: identifier.value } });
  }

  // whether an active account has this email or username (the portal's green tick)
  async exists(identifier: Identifier): Promise<boolean> {
    const user = await this.find(identifier);
    return Boolean(user?.active);
  }

  async login(identifier: Identifier, password: string, caller: Caller): Promise<LoginResult> {
    const user = await this.find(identifier);
    if (!user || !user.active) {
      await checkAgainstNothing(password);
      return { outcome: 'no_account' };
    }

    // a locked account isn't checked at all, so guessing can't continue while it's locked
    const now = Date.now();
    if (user.lockedUntil && user.lockedUntil.getTime() > now) {
      return { outcome: 'locked', retryAfter: Math.ceil((user.lockedUntil.getTime() - now) / 1000) };
    }

    if (!(await checkPassword(user.passwordHash, password))) {
      // counted in the database itself, so simultaneous guesses can't slip past the limit
      const { failedLogins } = await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: { increment: 1 } },
        select: { failedLogins: true },
      });
      if (failedLogins >= MAX_FAILED_LOGINS) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { failedLogins: 0, lockedUntil: new Date(now + LOCK_MINUTES * 60_000) },
        });
        await this.record('ACCOUNT_LOCKED', user.id, caller);
        return { outcome: 'locked', retryAfter: LOCK_MINUTES * 60 };
      }
      await this.record('LOGIN_FAILURE', user.id, caller);
      return { outcome: 'wrong_password' };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date(now) },
    });
    await this.record('LOGIN_SUCCESS', user.id, caller);
    return { outcome: 'ok', user };
  }

  // the sign-in record (and what it was about: the account or fingerprint acted on, and what changed)
  record(type: AuthEventType, userId: string | null, caller: Caller, about?: { targetId?: string; detail?: string }) {
    return this.prisma.authEvent.create({ data: { type, userId, ip: caller.ip, userAgent: caller.userAgent, ...about } });
  }
}
