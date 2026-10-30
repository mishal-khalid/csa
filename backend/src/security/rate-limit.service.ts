import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

export interface Limit {
  // what's being counted, e.g. `lookup:${ip}`
  key: string;
  max: number;
  windowSeconds: number;
}

// Counts requests per key in fixed time windows, in the database so every server instance shares
// the counts (Vercel runs many). Going over a limit answers 429 with when to try again.
@Injectable()
export class RateLimitService {
  constructor(private readonly prisma: PrismaService) {}

  async enforce(limits: Limit[]): Promise<void> {
    for (const limit of limits) {
      const retryAfter = await this.hit(limit);
      if (retryAfter > 0) {
        throw new HttpException({ code: 'rate_limited', retryAfter }, HttpStatus.TOO_MANY_REQUESTS);
      }
    }
  }

  // counts one request; returns 0 if it's allowed, or the seconds until the window ends if not
  private async hit({ key, max, windowSeconds }: Limit): Promise<number> {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
    const row = await this.increment(key, windowStart);
    // now and then, clear out windows that ended more than a day ago
    if (Math.random() < 0.01) {
      await this.prisma.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now - 86_400_000) } } });
    }
    return row.count > max ? Math.ceil((windowStart.getTime() + windowMs - now) / 1000) : 0;
  }

  // two requests can race to create the same window's row; the loser just retries the update
  private async increment(key: string, windowStart: Date) {
    const args = {
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart, count: 1 },
      update: { count: { increment: 1 } },
    };
    try {
      return await this.prisma.rateLimit.upsert(args);
    } catch {
      return this.prisma.rateLimit.upsert(args);
    }
  }
}
