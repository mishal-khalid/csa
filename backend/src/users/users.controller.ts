import { Body, Controller, Delete, Get, Header, HttpCode, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import type { User } from '../generated/prisma/client.js';
import { CurrentUser, Roles } from '../auth/guards.js';
import { normalise, parse, USERNAME } from '../auth/identifiers.js';
import { MIN_PASSWORD_LENGTH } from '../auth/passwords.js';
import { RateLimitService } from '../security/rate-limit.service.js';
import { clientIp, userAgent } from '../security/request.js';
import { UsersService } from './users.service.js';

// the same rules as the staff script and the login form
const fields = {
  name: z.string().trim().min(1).max(100),
  email: z.string().max(254).transform(normalise).pipe(z.email()),
  username: z.string().max(64).transform(normalise).pipe(z.string().regex(USERNAME)),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(256),
  role: z.enum(['CITIZEN', 'STAFF', 'ADMIN']),
};

const createBody = z.object(fields).strict();
// one cell at a time from the table, but any mix is accepted
const updateBody = z
  .object(fields)
  .partial()
  .strict()
  .refine((changes) => Object.keys(changes).length > 0);
const deleteBody = z.object({ username: z.string().max(64) }).strict();

// ids are UUIDs; anything else can't be an account
function accountId(raw: string): string {
  if (!z.uuid().safeParse(raw).success) throw new NotFoundException({ code: 'not_found' });
  return raw;
}

const caller = (req: Request) => ({ ip: clientIp(req), userAgent: userAgent(req) });

// The portal's User Management tab: admins (the main account among them) list, create, edit and
// delete accounts, and see their passwords.
@Controller('users')
@Roles('ADMIN')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly limits: RateLimitService,
  ) {}

  // changes: 60 a minute per admin
  private writing(me: User) {
    return this.limits.enforce([{ key: `users-write:${me.id}`, max: 60, windowSeconds: 60 }]);
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  async list() {
    return { users: await this.users.list() };
  }

  @Post()
  async create(@Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    return { user: await this.users.create(parse(createBody, body), me, caller(req)) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    return { user: await this.users.update(accountId(id), parse(updateBody, body), me, caller(req), req) };
  }

  // the body carries the account's username, typed out to confirm
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    await this.users.remove(accountId(id), parse(deleteBody, body).username, me, caller(req));
  }

  // Shows an account's password: 30 a minute per admin, each one recorded. A POST, so the
  // same-origin check applies, and never cached.
  @Post(':id/password')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async password(@Param('id') id: string, @CurrentUser() me: User, @Req() req: Request) {
    await this.limits.enforce([{ key: `users-password:${me.id}`, max: 30, windowSeconds: 60 }]);
    return this.users.password(accountId(id), me, caller(req));
  }
}
