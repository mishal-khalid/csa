import { Body, Controller, Delete, Get, Header, HttpCode, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import type { Request } from 'express';
import { z } from 'zod';
import type { User } from '../generated/prisma/client.js';
import { CurrentUser, MainAccountOnly } from '../auth/guards.js';
import { parse } from '../auth/identifiers.js';
import { RateLimitService } from '../security/rate-limit.service.js';
import { clientIp, userAgent } from '../security/request.js';
import { FingerprintsService } from './fingerprints.service.js';
import { registrationReading } from './webauthn.js';

const name = z.string().trim().min(1).max(100);
const nameBody = z.object({ name }).strict();
const registerBody = z.object({ name, reading: registrationReading }).strict();
const deleteBody = z.object({ name: z.string().max(200) }).strict();
const linkBody = z.object({ userId: z.uuid() }).strict();

// ids are UUIDs; anything else can't be a fingerprint or an account
function uuid(raw: string): string {
  if (!z.uuid().safeParse(raw).success) throw new NotFoundException({ code: 'not_found' });
  return raw;
}

const caller = (req: Request) => ({ ip: clientIp(req), userAgent: userAgent(req) });

// The portal's Fingerprint Management tab, for the main account only: add fingerprints, name them,
// link them to accounts and delete them.
@Controller('fingerprints')
@MainAccountOnly()
export class FingerprintsController {
  constructor(
    private readonly fingerprints: FingerprintsService,
    private readonly limits: RateLimitService,
  ) {}

  // changes: 60 a minute
  private writing(me: User) {
    return this.limits.enforce([{ key: `fingerprints-write:${me.id}`, max: 60, windowSeconds: 60 }]);
  }

  @Get()
  @Header('Cache-Control', 'no-store')
  async list() {
    return { fingerprints: await this.fingerprints.list() };
  }

  // the first half of adding a fingerprint: what the browser needs to read it
  @Post('options')
  @HttpCode(200)
  async options(@Body() body: unknown, @CurrentUser() me: User) {
    await this.writing(me);
    return this.fingerprints.registrationOptions(parse(nameBody, body).name, me);
  }

  // the second half: the reading itself
  @Post()
  async register(@Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    const { name: given, reading } = parse(registerBody, body);
    return { fingerprint: await this.fingerprints.register(given, reading as RegistrationResponseJSON, me, caller(req)) };
  }

  @Patch(':id')
  async rename(@Param('id') id: string, @Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    return { fingerprint: await this.fingerprints.rename(uuid(id), parse(nameBody, body).name, me, caller(req)) };
  }

  // the body carries the fingerprint's name, typed out to confirm
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    await this.fingerprints.remove(uuid(id), parse(deleteBody, body).name, me, caller(req));
  }

  @Post(':id/accounts')
  @HttpCode(200)
  async link(@Param('id') id: string, @Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    return { fingerprint: await this.fingerprints.link(uuid(id), parse(linkBody, body).userId, me, caller(req)) };
  }

  @Delete(':id/accounts/:userId')
  async unlink(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    return { fingerprint: await this.fingerprints.unlink(uuid(id), uuid(userId), me, caller(req)) };
  }
}
