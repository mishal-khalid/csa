import { Body, Controller, Delete, Get, Header, HttpCode, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import type { User } from '../generated/prisma/client.js';
import { CurrentUser, Roles, SignedIn } from '../auth/guards.js';
import { parse } from '../auth/identifiers.js';
import { RateLimitService } from '../security/rate-limit.service.js';
import { clientIp, userAgent } from '../security/request.js';
import { DirectoryService, MAX_BULK, type BulkEntry } from './directory.service.js';

const name = z.string().trim().min(1).max(150);
const kind = z.string().trim().min(1).max(40);
// an optional detail: blank clears it
const optional = (schema: z.ZodType<string, string>) =>
  z
    .string()
    .trim()
    .max(300)
    .transform((value) => value || null)
    .pipe(z.union([z.null(), schema]));

// a web address, with https:// added if it has no scheme
const website = z
  .string()
  .transform((value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`))
  .pipe(z.url({ protocol: /^https?$/, hostname: /\./ }));

const createBody = z
  .object({ parentId: z.uuid().nullable(), folder: z.boolean(), kind: kind.optional(), name })
  .strict()
  .refine((entry) => entry.folder || entry.kind, { path: ['kind'] });

const updateBody = z
  .object({
    name,
    kind,
    headName: optional(z.string().max(150)),
    headPost: optional(z.string().max(150)),
    email: optional(z.email().max(254)),
    phone: optional(z.string().max(40).regex(/^\+?[0-9 ()./-]{3,}$/)),
    website: optional(website),
    address: optional(z.string().max(300)),
  })
  .partial()
  .strict()
  .refine((changes) => Object.keys(changes).length > 0);

const moveBody = z.object({ parentId: z.uuid().nullable(), index: z.number().int().min(0).max(10_000) }).strict();

// the bulk add's tree; the service checks the total, the depth, and that only folders hold things
const bulkEntry: z.ZodType<BulkEntry> = z.lazy(() =>
  z.object({ folder: z.boolean(), kind: kind.optional(), name, children: z.array(bulkEntry).max(MAX_BULK).optional() }).strict(),
);
const bulkBody = z.object({ parentId: z.uuid().nullable(), entries: z.array(bulkEntry).min(1).max(MAX_BULK) }).strict();

function uuid(raw: string): string {
  if (!z.uuid().safeParse(raw).success) throw new NotFoundException({ code: 'not_found' });
  return raw;
}

const caller = (req: Request) => ({ ip: clientIp(req), userAgent: userAgent(req) });

// The portal's Directory tab: every signed-in account can read it; admins (the main account among
// them) add, edit, move and delete.
@Controller('directory')
export class DirectoryController {
  constructor(
    private readonly directory: DirectoryService,
    private readonly limits: RateLimitService,
  ) {}

  // changes: 120 a minute per admin (dragging things about adds up)
  private writing(me: User) {
    return this.limits.enforce([{ key: `directory-write:${me.id}`, max: 120, windowSeconds: 60 }]);
  }

  @Get()
  @UseGuards(SignedIn)
  @Header('Cache-Control', 'no-store')
  async list() {
    return { entries: await this.directory.list() };
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    const { parentId, folder, kind: given, name: entryName } = parse(createBody, body);
    return { entry: await this.directory.create({ parentId, folder, kind: given, name: entryName }, me, caller(req)) };
  }

  // many at once, from the Add modal's bulk field
  @Post('bulk')
  @Roles('ADMIN')
  async bulk(@Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    const { parentId, entries } = parse(bulkBody, body);
    return this.directory.bulkCreate(parentId, entries, me, caller(req));
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    return { entry: await this.directory.update(uuid(id), parse(updateBody, body), me, caller(req)) };
  }

  @Post(':id/move')
  @Roles('ADMIN')
  @HttpCode(200)
  async move(@Param('id') id: string, @Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    const { parentId, index } = parse(moveBody, body);
    return { entries: await this.directory.move(uuid(id), parentId, index, me, caller(req)) };
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    await this.directory.remove(uuid(id), me, caller(req));
  }
}
