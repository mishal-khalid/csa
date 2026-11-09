// End-to-end checks of the Gazette tab against the local test database, with files kept on this
// computer. Each run makes its own throwaway accounts and documents and deletes them afterwards.
import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import request from 'supertest';
import { createApp } from '../src/main.js';
import { PrismaService } from '../src/prisma.service.js';
import { config } from '../src/config.js';
import { GazetteStorage } from '../src/gazette/storage.js';

const origin = config.portalOrigin;
const tag = randomBytes(4).toString('hex');
const today = new Date().toISOString().slice(0, 10);

let app: NestExpressApplication;
let prisma: PrismaService;
let admin: string[];
let citizen: string[];
const made: string[] = [];

const server = () => app.getHttpServer();
const send = (method: 'post' | 'patch' | 'delete', path: string, body: object, cookies = admin) =>
  request(server())[method](path).set('Origin', origin).set('Cookie', cookies).send(body);

async function sessionFor(role: 'ADMIN' | 'CITIZEN') {
  const user = await prisma.user.create({
    data: { email: `gz-${role}-${tag}@example.com`, username: `gz${role.toLowerCase()}.${tag}`, name: `Test ${role}`, role, passwordHash: 'x' },
  });
  const token = randomBytes(32).toString('base64url');
  await prisma.session.create({
    data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3_600_000) },
  });
  return [`__Host-csa_session=${token}`];
}

// a one-page Notice, laid out like the CSA's: letterhead, reference and date, title, text, signature.
// `saved` changes the file's own dates, so the same Notice can be saved as a different file.
async function noticePdf(reference = `PO/2026/N/${tag}`, title = `Notice of an End-to-End Test ${tag}`, saved = new Date('2026-11-08T00:00:00Z')) {
  const doc = await PDFDocument.create();
  doc.setCreationDate(saved);
  doc.setModificationDate(saved);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595.32, 841.92]);
  const line = (text: string, y: number, font = regular, size = 11, x = 54) => page.drawText(text, { x, y: 841.92 - y, size, font });
  line('The President’s Office'.replace('’', "'"), 80, bold, 12);
  line('Continental Security Agency', 96, bold, 11);
  line('Washington, D.C.', 112, bold, 9);
  line(`Reference: ${reference}`, 140);
  line('Date: 08 November 2026', 156);
  line(title, 210, bold, 12, 200);
  line('This Notice is made by the API’s end-to-end tests and deleted after them.'.replace('’', "'"), 240);
  line('It is long enough for the Gazette tab to tell it from any other document by its words alone,', 256);
  line('so that saving it as a PDF a second time is still seen as the same Notice uploaded again.', 272);
  line('Dr. Enzo Hernandez', 320, bold);
  line('President', 336);
  return doc.save();
}

beforeAll(async () => {
  app = await createApp();
  await app.init();
  prisma = app.get(PrismaService);
  await prisma.rateLimit.deleteMany({});
  admin = await sessionFor('ADMIN');
  citizen = await sessionFor('CITIZEN');
});

afterAll(async () => {
  const docs = await prisma.gazetteDocument.findMany({ where: { id: { in: made } } });
  const storage = app.get(GazetteStorage);
  for (const doc of docs) {
    if (doc.serial) await rm(storage.localFile('gazette', `${doc.serial}.pdf`), { force: true });
    await rm(storage.localFile('gazette-drafts', `drafts/${doc.id}`), { recursive: true, force: true });
  }
  await prisma.gazetteDocument.deleteMany({ where: { id: { in: made } } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.rateLimit.deleteMany({});
  await app.close();
});

describe('access', () => {
  it('is for admins only', async () => {
    expect((await request(server()).get('/gazette')).status).toBe(401);
    expect((await request(server()).get('/gazette').set('Cookie', citizen)).status).toBe(403);
    expect((await request(server()).get('/gazette').set('Cookie', admin)).status).toBe(200);
    expect((await send('post', '/gazette', { cover: true }, citizen)).status).toBe(403);
  });

  it('needs the portal as the origin to change anything', async () => {
    expect((await request(server()).post('/gazette').set('Cookie', admin).send({ cover: true })).status).toBe(403);
  });

  it('serves the public Gazette to anyone, without drafts', async () => {
    const draft = await send('post', '/gazette', { cover: true });
    made.push(draft.body.document.id);
    const res = await request(server()).get('/gazette/public/documents');
    expect(res.status).toBe(200);
    expect(res.body.documents.some((doc: { title: string; serial: number | null }) => doc.serial === null)).toBe(false);
  });

  it('refuses an upload link it didn’t sign', async () => {
    const res = await request(server()).put('/gazette/files/upload?bucket=gazette&path=1.pdf&expires=9999999999&sig=nope').send(Buffer.from('%PDF'));
    expect(res.status).toBe(404);
  });
});

describe('making and publishing a Notice', () => {
  it('reads it, checks it and publishes it after the last document', async () => {
    const created = await send('post', '/gazette', { cover: false });
    expect(created.status).toBe(201);
    const id = created.body.document.id as string;
    made.push(id);
    expect(created.body.document.type).toBe('notice');

    // a Notice has no cover, so it can't become an Act
    expect((await send('patch', `/gazette/${id}`, { type: 'act' })).status).toBe(400);

    const pdf = await noticePdf();
    const target = await send('post', `/gazette/${id}/uploads`, { kind: 'main', size: pdf.length });
    expect(target.status).toBe(200);
    const url = new URL(target.body.upload.url);
    expect((await request(server()).put(`${url.pathname}${url.search}`).set('Content-Type', 'application/pdf').send(Buffer.from(pdf))).status).toBe(204);
    const taken = await send('post', `/gazette/${id}/files`, { kind: 'main', path: target.body.path, name: 'notice.pdf' });
    expect(taken.status).toBe(200);
    expect(taken.body.document).toMatchObject({ docNumber: `PO/2026/N/${tag}`, title: `Notice of an End-to-End Test ${tag}` });
    expect(taken.body.document.blocks.length).toBeGreaterThan(0);

    expect((await send('patch', `/gazette/${id}`, { issuingBody: 'The President’s Office' })).status).toBe(200);

    const preview = await send('post', `/gazette/${id}/preview`, { date: today });
    expect(preview.status).toBe(200);
    const next = preview.body.place;

    const check = await send('post', `/gazette/${id}/check`, { date: today });
    expect(check.status).toBe(200);
    expect(check.body.issues.filter((issue: { level: string }) => issue.level === 'error')).toEqual([]);

    // warnings have to be accepted
    if (check.body.issues.length) expect((await send('post', `/gazette/${id}/publish`, { date: today, acknowledged: false })).status).toBe(409);
    const published = await send('post', `/gazette/${id}/publish`, { date: today, acknowledged: true });
    expect(published.status).toBe(200);
    expect(published.body.document).toMatchObject({ state: 'PUBLISHED', serial: next.serial, volume: next.volume, number: next.number, status: 'In Force' });

    // its place is fixed: only its status, commencement and transcription can change now
    expect((await send('patch', `/gazette/${id}`, { title: 'Changed' })).status).toBe(400);
    expect((await send('patch', `/gazette/${id}`, { status: 'Repealed' })).status).toBe(200);
    expect((await send('delete', `/gazette/${id}`, {})).status).toBe(409);

    const shown = await request(server()).get(`/gazette/public/documents/${next.serial}`);
    expect(shown.status).toBe(200);
    expect(shown.body.document).toMatchObject({ tag: 'Notice', reference: `PO/2026/N/${tag}`, status: 'Repealed' });
  });

  it('turns away a document that’s already uploaded, and throws its upload away', async () => {
    const storage = app.get(GazetteStorage);
    const draft = async () => {
      const res = await send('post', '/gazette', { cover: false });
      made.push(res.body.document.id);
      return res.body.document.id as string;
    };
    const upload = async (id: string, kind: 'main' | 'appendix', pdf: Uint8Array) => {
      const target = await send('post', `/gazette/${id}/uploads`, { kind, size: pdf.length });
      const url = new URL(target.body.upload.url);
      await request(server()).put(`${url.pathname}${url.search}`).set('Content-Type', 'application/pdf').send(Buffer.from(pdf));
      const res = await send('post', `/gazette/${id}/files`, { kind, path: target.body.path, name: 'notice.pdf' });
      return { res, kept: existsSync(storage.localFile('gazette-drafts', target.body.path)) };
    };
    const reference = `PO/2026/N/${tag}-1`;
    const pdf = await noticePdf(reference, `Notice of a Repeat Test ${tag}`);
    const first = await draft();
    expect((await upload(first, 'main', pdf)).res.status).toBe(200);

    // the same file, to another draft or as the first one's own appendix
    const second = await draft();
    const again = await upload(second, 'main', pdf);
    expect(again.res.status).toBe(409);
    expect(again.res.body).toMatchObject({ code: 'duplicate', reason: 'same_file', duplicate: { id: first, self: false } });
    expect(again.kept).toBe(false);
    expect((await upload(first, 'appendix', pdf)).res.body).toMatchObject({ code: 'duplicate', duplicate: { id: first, self: true } });

    // the same Notice saved as a PDF again: another file, the same words
    const resaved = await upload(second, 'main', await noticePdf(reference, `Notice of a Repeat Test ${tag}`, new Date('2026-11-09T10:00:00Z')));
    expect(resaved.res.body).toMatchObject({ code: 'duplicate', reason: 'same_text', duplicate: { id: first } });

    // another Notice with the first one's reference, now or given it later
    const other = (ref: string) => noticePdf(ref, `Another Notice of a Repeat Test ${tag}`);
    expect((await upload(second, 'main', await other(reference))).res.body).toMatchObject({ code: 'duplicate', reason: 'same_number' });
    expect((await upload(second, 'main', await other(`PO/2026/N/${tag}-2`))).res.status).toBe(200);
    const renumbered = await send('patch', `/gazette/${second}`, { docNumber: ` po/2026/n/${tag}-1 ` });
    expect(renumbered.status).toBe(409);
    expect(renumbered.body).toMatchObject({ code: 'duplicate', reason: 'same_number', duplicate: { id: first } });
  });

  it('won’t publish on any day but today', async () => {
    const created = await send('post', '/gazette', { cover: false });
    made.push(created.body.document.id);
    const res = await send('post', `/gazette/${created.body.document.id}/publish`, { date: '2020-01-01', acknowledged: true });
    expect(res.status).toBe(400);
  });
});
