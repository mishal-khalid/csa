import { Body, Controller, Get, HttpCode, HttpException, HttpStatus, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { HumanService } from '../security/human.service.js';
import { RateLimitService } from '../security/rate-limit.service.js';
import { atLeast, clientIp, userAgent } from '../security/request.js';
import { AuthService } from './auth.service.js';
import { classify, humanBody, identifierBody, loginBody, parse } from './identifiers.js';
import { profile } from './profile.js';
import { SessionsService } from './sessions.service.js';


// The portal's sign-in API. Every reply that touches an account takes a fixed minimum time, so
// timing reveals nothing beyond the answer itself.
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
    private readonly human: HumanService,
    private readonly limits: RateLimitService,
  ) {}

  // The bot check: swaps a Turnstile token for the 20-minute cookie that lookups and logins need.
  @Post('human')
  @HttpCode(204)
  async verifyHuman(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = clientIp(req);
    await this.limits.enforce([{ key: `human:${ip}`, max: 10, windowSeconds: 60 }]);
    const { token } = parse(humanBody, body);
    if (!(await this.human.verifyTurnstile(token, ip))) throw new HttpException({ code: 'not_verified' }, HttpStatus.FORBIDDEN);
    this.human.grant(res);
  }

  // Whether an email or username has an account: the green tick. Allowed 30 a minute and 300 an
  // hour per IP address, and only with the bot-check cookie.
  @Post('lookup')
  @HttpCode(200)
  async lookup(@Body() body: unknown, @Req() req: Request) {
    this.human.require(req);
    const ip = clientIp(req);
    await this.limits.enforce([
      { key: `lookup:${ip}`, max: 30, windowSeconds: 60 },
      { key: `lookup-hour:${ip}`, max: 300, windowSeconds: 3600 },
    ]);
    const identifier = classify(parse(identifierBody, body).identifier);
    if (!identifier) throw new HttpException({ code: 'invalid' }, HttpStatus.BAD_REQUEST);
    return atLeast(400, this.auth.exists(identifier).then((exists) => ({ exists })));
  }

  // Signs in. A wrong password counts towards the account's lock; separately, each IP address gets
  // 20 attempts per 10 minutes, whichever accounts they're for.
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.human.require(req);
    const ip = clientIp(req);
    await this.limits.enforce([{ key: `login:${ip}`, max: 20, windowSeconds: 600 }]);
    const { identifier: raw, password } = parse(loginBody, body);
    const identifier = classify(raw);
    if (!identifier) throw new HttpException({ code: 'invalid' }, HttpStatus.BAD_REQUEST);

    const caller = { ip, userAgent: userAgent(req) };
    const result = await atLeast(600, this.auth.login(identifier, password, caller));
    switch (result.outcome) {
      case 'no_account':
        throw new HttpException({ code: 'no_account' }, HttpStatus.UNAUTHORIZED);
      case 'wrong_password':
        throw new HttpException({ code: 'wrong_password' }, HttpStatus.UNAUTHORIZED);
      case 'locked':
        throw new HttpException({ code: 'locked', retryAfter: result.retryAfter }, HttpStatus.LOCKED);
      case 'ok':
        // end any session this browser already had, then start a fresh one
        await this.sessions.revoke(req);
        await this.sessions.start(res, result.user.id, ip, caller.userAgent);
        return { user: profile(result.user) };
    }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const userId = await this.sessions.end(req, res);
    if (userId) await this.auth.record('LOGOUT', userId, { ip: clientIp(req), userAgent: userAgent(req) });
  }

  // the signed-in account, or null (a plain answer rather than a 401, which browsers log as an
  // error on every signed-out visit)
  @Get('me')
  async me(@Req() req: Request) {
    const user = await this.sessions.current(req);
    return { user: user ? profile(user) : null };
  }
}
