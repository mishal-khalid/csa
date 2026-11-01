import { createHash, randomBytes } from 'node:crypto';
import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import type { Instructor } from '../generated/mjscc/client.js';
import { isListed } from './config.js';
import { MjsccPrisma } from './prisma.service.js';

// The evaluation's own sign-in cookie (the portal's is __Host-csa_session; they never mix). It lasts
// a day, with no idle limit, since a phone can sit in a pocket between parts.
export const SESSION_COOKIE = '__Host-mjscc_session';
const LIFETIME_MS = 24 * 60 * 60 * 1000;

// http-only, HTTPS only, never sent from another site, and (__Host-) only to exactly this host
const cookie: CookieOptions = { httpOnly: true, secure: true, sameSite: 'strict', path: '/' };

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

function tokenOf(req: Request): string | null {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  return typeof token === 'string' && token.length <= 100 ? token : null;
}

@Injectable()
export class MjsccSessions {
  constructor(private readonly db: MjsccPrisma) {}

  async start(res: Response, instructorId: string): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    await this.db.session.create({
      data: { tokenHash: digest(token), instructorId, expiresAt: new Date(Date.now() + LIFETIME_MS) },
    });
    res.cookie(SESSION_COOKIE, token, { ...cookie, maxAge: LIFETIME_MS });
  }

  // the signed-in instructor, or null (also if they've since been taken off the list)
  async current(req: Request): Promise<Instructor | null> {
    const token = tokenOf(req);
    if (!token) return null;
    const session = await this.db.session.findUnique({ where: { tokenHash: digest(token) }, include: { instructor: true } });
    if (!session || session.expiresAt.getTime() <= Date.now() || !isListed(session.instructor.nameKey)) return null;
    return session.instructor;
  }

  // signs this phone out, on the server and in the browser
  async end(req: Request, res: Response): Promise<void> {
    res.clearCookie(SESSION_COOKIE, cookie);
    await this.revoke(req);
  }

  // ends this phone's session on the server only (before a fresh sign-in replaces the cookie)
  async revoke(req: Request): Promise<void> {
    const token = tokenOf(req);
    if (token) await this.db.session.deleteMany({ where: { tokenHash: digest(token) } });
  }
}

type SignedInRequest = Request & { instructor?: Instructor };

// The route needs a signed-in instructor, who is attached to the request.
@Injectable()
export class InstructorSignedIn implements CanActivate {
  constructor(private readonly sessions: MjsccSessions) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<SignedInRequest>();
    const instructor = await this.sessions.current(req);
    if (!instructor) throw new HttpException({ code: 'unauthenticated' }, HttpStatus.UNAUTHORIZED);
    req.instructor = instructor;
    return true;
  }
}

export const CurrentInstructor = createParamDecorator(
  (_: unknown, context: ExecutionContext) => context.switchToHttp().getRequest<SignedInRequest>().instructor!,
);
