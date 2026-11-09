import { Body, Controller, Delete, Get, Header, HttpCode, NotFoundException, Param, Patch, Post, Put, Query, Req, Res, BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import type { User } from '../generated/prisma/client.js';
import { CurrentUser, Roles } from '../auth/guards.js';
import { parse } from '../auth/identifiers.js';
import { RateLimitService } from '../security/rate-limit.service.js';
import { clientIp, userAgent } from '../security/request.js';
import type { Block, Clause, ListItem } from './blocks.js';
import { GazetteService, STATUSES } from './gazette.service.js';
import { GazetteStorage, MAX_FILE_BYTES } from './storage.js';
import { NEW_TYPES } from './types.js';

// ---- what the portal may send ----

const text = (max: number) => z.string().max(max);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));

// the transcription, in the public Gazette's block schema (see blocks.ts)
const clause: z.ZodType<Clause> = z.lazy(() =>
  z.object({ label: text(40).optional(), text: text(20_000).optional(), items: z.array(clause).max(200).optional() }).strict(),
);
const listItem: z.ZodType<ListItem> = z
  .object({ label: text(40).optional(), text: text(20_000), items: z.array(clause).max(200).optional(), after: text(20_000).optional() })
  .strict();
const block: z.ZodType<Block> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('chapter'), text: text(300), subtitle: text(300).optional() }).strict(),
  z.object({ type: z.literal('heading'), text: text(1000) }).strict(),
  z.object({ type: z.literal('article'), number: text(20), title: text(300).optional(), clauses: z.array(clause).max(200) }).strict(),
  z.object({ type: z.literal('paragraph'), text: text(50_000) }).strict(),
  z.object({ type: z.literal('list'), items: z.array(listItem).max(500) }).strict(),
  z
    .object({ type: z.literal('table'), caption: text(300).optional(), columns: z.array(text(300)).max(30).optional(), rows: z.array(z.array(text(5000)).max(30)).max(1000) })
    .strict(),
  z.object({ type: z.literal('signatures'), items: z.array(z.object({ caption: text(200).optional(), name: text(200), title: text(500).optional() }).strict()).max(20) }).strict(),
]) as z.ZodType<Block>;
const blocks = z.array(block).max(5000);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();

const createBody = z.object({ cover: z.boolean() }).strict();
const uploadBody = z.object({ kind: z.enum(['main', 'appendix']), size: z.number().int().min(1).max(MAX_FILE_BYTES) }).strict();
const attachBody = z.object({ kind: z.enum(['main', 'appendix']), path: z.string().min(1).max(200), name: z.string().trim().min(1).max(200) }).strict();
const pathBody = z.object({ path: z.string().min(1).max(200) }).strict();
const draftBody = z
  .object({
    type: z.enum(NEW_TYPES),
    docNumber: optionalText(100),
    title: z.string().trim().max(500),
    issuingBody: optionalText(200),
    commencesOn: isoDate.nullable(),
    blocks,
    appendixOrder: z.array(z.string().max(200)).max(50),
  })
  .partial()
  .strict()
  .refine((changes) => Object.keys(changes).length > 0);
const publishedBody = z
  .object({ status: z.enum(STATUSES as [string, ...string[]]), commencesOn: isoDate.nullable(), blocks })
  .partial()
  .strict()
  .refine((changes) => Object.keys(changes).length > 0);
const dateBody = z.object({ date: isoDate }).strict();
const publishBody = z.object({ date: isoDate, acknowledged: z.boolean() }).strict();

function uuid(raw: string): string {
  if (!z.uuid().safeParse(raw).success) throw new NotFoundException({ code: 'not_found' });
  return raw;
}

// A document is published on the day it goes up (Director's Order Number 01/2026, point 32). The
// portal sends its own calendar date, which may be a day either side of the server's.
function today(date: string): string {
  const now = Date.now();
  const allowed = [-1, 0, 1].map((offset) => new Date(now + offset * 86_400_000).toISOString().slice(0, 10));
  if (!allowed.includes(date)) throw new BadRequestException({ code: 'date_not_today' });
  return date;
}

const caller = (req: Request) => ({ ip: clientIp(req), userAgent: userAgent(req) });

// The portal's Gazette tab: admins (the main account among them) make, check and publish documents.
@Controller('gazette')
export class GazetteController {
  constructor(
    private readonly gazette: GazetteService,
    private readonly limits: RateLimitService,
  ) {}

  // 120 changes a minute per admin
  private writing(me: User) {
    return this.limits.enforce([{ key: `gazette-write:${me.id}`, max: 120, windowSeconds: 60 }]);
  }

  @Get()
  @Roles('ADMIN')
  @Header('Cache-Control', 'no-store')
  async list() {
    return { documents: await this.gazette.list() };
  }

  @Get('next')
  @Roles('ADMIN')
  @Header('Cache-Control', 'no-store')
  async next(@Query('date') date: string) {
    return this.gazette.next(parse(isoDate, date));
  }

  @Get(':id')
  @Roles('ADMIN')
  @Header('Cache-Control', 'no-store')
  async get(@Param('id') id: string) {
    return { document: await this.gazette.get(uuid(id)) };
  }

  @Post()
  @Roles('ADMIN')
  async create(@Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    return { document: await this.gazette.createDraft(parse(createBody, body).cover, me, caller(req)) };
  }

  @Post(':id/uploads')
  @Roles('ADMIN')
  @HttpCode(200)
  async upload(@Param('id') id: string, @Body() body: unknown, @CurrentUser() me: User) {
    await this.writing(me);
    const { kind, size } = parse(uploadBody, body);
    return this.gazette.uploadTarget(uuid(id), kind, size);
  }

  @Post(':id/files')
  @Roles('ADMIN')
  @HttpCode(200)
  async attach(@Param('id') id: string, @Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    const { kind, path, name } = parse(attachBody, body);
    return { document: await this.gazette.attach(uuid(id), kind, path, name, me, caller(req)) };
  }

  @Post(':id/appendices/remove')
  @Roles('ADMIN')
  @HttpCode(200)
  async removeAppendix(@Param('id') id: string, @Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    return { document: await this.gazette.removeAppendix(uuid(id), parse(pathBody, body).path, me, caller(req)) };
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    const current = await this.gazette.get(uuid(id));
    const changes = current.state === 'PUBLISHED' ? parse(publishedBody, body) : parse(draftBody, body);
    return { document: await this.gazette.update(id, changes, me, caller(req)) };
  }

  @Post(':id/preview')
  @Roles('ADMIN')
  @HttpCode(200)
  async preview(@Param('id') id: string, @Body() body: unknown, @CurrentUser() me: User) {
    await this.writing(me);
    return this.gazette.preview(uuid(id), parse(dateBody, body).date);
  }

  @Post(':id/check')
  @Roles('ADMIN')
  @HttpCode(200)
  async check(@Param('id') id: string, @Body() body: unknown) {
    return this.gazette.check(uuid(id), parse(dateBody, body).date);
  }

  @Post(':id/publish')
  @Roles('ADMIN')
  @HttpCode(200)
  async publish(@Param('id') id: string, @Body() body: unknown, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    const { date, acknowledged } = parse(publishBody, body);
    return { document: await this.gazette.publish(uuid(id), today(date), acknowledged, me, caller(req)) };
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() me: User, @Req() req: Request) {
    await this.writing(me);
    await this.gazette.remove(uuid(id), me, caller(req));
  }
}

// The public Gazette's data (read by the website's server): published documents only.
@Controller('gazette/public')
export class GazettePublicController {
  constructor(private readonly gazette: GazetteService) {}

  @Get('documents')
  @Header('Cache-Control', 'public, max-age=30, s-maxage=30')
  async list() {
    return { documents: await this.gazette.publicList() };
  }

  @Get('documents/:serial')
  @Header('Cache-Control', 'public, max-age=30, s-maxage=30')
  async get(@Param('serial') serial: string) {
    if (!/^\d{1,9}$/.test(serial)) throw new NotFoundException({ code: 'not_found' });
    return { document: await this.gazette.publicGet(Number(serial)) };
  }

  // an address from before the Gazette was renumbered (/g/<YYYYMMDDNN>)
  @Get('legacy/:index')
  @Header('Cache-Control', 'public, max-age=300')
  async legacy(@Param('index') index: string) {
    if (!/^\d{10}$/.test(index)) throw new NotFoundException({ code: 'not_found' });
    return this.gazette.publicByIndex(index);
  }
}

// Files kept on this computer, in local development only (in production they're on Supabase
// Storage, which serves them itself). Every link is signed by the API and runs out.
@Controller('gazette/files')
export class GazetteFilesController {
  constructor(private readonly storage: GazetteStorage) {}

  @Put('upload')
  @HttpCode(204)
  async upload(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const target = this.storage.verifyLocalUpload(query);
    if (!target) throw new NotFoundException({ code: 'not_found' });
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req as AsyncIterable<Buffer>) {
      size += chunk.length;
      if (size > MAX_FILE_BYTES) throw new BadRequestException({ code: 'too_large' });
      chunks.push(chunk);
    }
    await this.storage.put(target.bucket, target.path, new Uint8Array(Buffer.concat(chunks)));
  }

  @Get('read')
  async read(@Query() query: Record<string, unknown>, @Res() res: Response) {
    const target = this.storage.verifyLocalRead(query);
    if (!target) throw new NotFoundException({ code: 'not_found' });
    const bytes = await this.storage.get(target.bucket, target.path);
    if (!bytes) throw new NotFoundException({ code: 'not_found' });
    const download = typeof query.download === 'string' ? query.download : null;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${(download ?? 'document.pdf').replace(/"/g, '')}"`);
    // the portal shows the preview in a frame
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${config.portalOrigin}`);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.end(Buffer.from(bytes));
  }

  @Get('public/:name')
  async publicFile(@Param('name') name: string, @Res() res: Response) {
    if (!this.storage.isLocal || !/^\d+(-appendix-\d+)?\.pdf$/.test(name)) throw new NotFoundException({ code: 'not_found' });
    const bytes = await this.storage.get('gazette', name);
    if (!bytes) throw new NotFoundException({ code: 'not_found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.end(Buffer.from(bytes));
  }
}
