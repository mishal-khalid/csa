import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { mjsccConfig } from './config.js';
import { MjsccPrisma } from './prisma.service.js';

// Cross-site request forgery protection for the evaluation's routes, as the portal has for its
// own: anything that changes something must come from the evaluation's site and be JSON.
export function fromEvaluationSite(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const fromSite = req.headers.origin === mjsccConfig?.origin;
  const isJson = req.headers['content-type']?.split(';')[0].trim() === 'application/json';
  if (fromSite && isJson) return next();
  res.status(403).json({ code: 'forbidden' });
}

// Request counts per key in fixed time windows, kept in the evaluation's own table so every server
// instance shares them. Going over answers 429 with when to try again.
@Injectable()
export class MjsccRateLimit {
  constructor(private readonly db: MjsccPrisma) {}

  async enforce(key: string, max: number, windowSeconds: number): Promise<void> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
    const args = {
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart, count: 1 },
      update: { count: { increment: 1 } },
    };
    // two requests can race to create the same window's row; the loser just retries the update
    const row = await this.db.rateLimit.upsert(args).catch(() => this.db.rateLimit.upsert(args));
    if (Math.random() < 0.01) {
      await this.db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now - 86_400_000) } } });
    }
    if (row.count > max) {
      const retryAfter = Math.ceil((windowStart.getTime() + windowMs - now) / 1000);
      throw new HttpException({ code: 'rate_limited', retryAfter }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
