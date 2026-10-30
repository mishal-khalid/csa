// End-to-end checks of the Directory against the local test database. Each run makes its own
// throwaway entries (and accounts) and deletes them afterwards.
import { createHash, randomBytes } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createApp } from '../src/main.js';
import { PrismaService } from '../src/prisma.service.js';
import { config } from '../src/config.js';

const origin = config.portalOrigin;
const tag = randomBytes(4).toString('hex');

let app: NestExpressApplication;
let prisma: PrismaService;
let admin: string[];
let citizen: string[];

type Entry = { id: string; parentId: string | null; name: string; position: number };

const server = () => app.getHttpServer();
const send = (method: 'post' | 'patch' | 'delete', path: string, body: object, cookies = admin) =>
  request(server())[method](path).set('Origin', origin).set('Cookie', cookies).send(body);

// a session made straight in the database
async function sessionFor(role: 'ADMIN' | 'CITIZEN') {
  const user = await prisma.user.create({
    data: { email: `${role}-${tag}@example.com`, username: `${role.toLowerCase()}.${tag}`, name: `Test ${role}`, role, passwordHash: 'x' },
  });
  const token = randomBytes(32).toString('base64url');
  await prisma.session.create({
    data: { userId: user.id, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3_600_000) },
  });
  return [`__Host-csa_session=${token}`];
}

async function add(name: string, parentId: string | null, kind?: string) {
  const res = await send('post', '/directory', { parentId, folder: !kind, ...(kind && { kind }), name: `${name} ${tag}` });
  expect(res.status).toBe(201);
  return res.body.entry as Entry;
}

// what's inside a parent, by name, in order
async function inside(parentId: string | null) {
  const res = await request(server()).get('/directory').set('Cookie', admin);
  return (res.body.entries as Entry[]).filter((e) => e.parentId === parentId && e.name.includes(tag)).map((e) => e.name.replace(` ${tag}`, ''));
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
  // deepest first: whatever has nothing inside it, until none are left
  for (let round = 0; round < 10; round++) {
    await prisma.directoryEntry.deleteMany({ where: { name: { contains: tag }, children: { none: {} } } });
  }
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.rateLimit.deleteMany({});
  await app.close();
});

describe('reading and access', () => {
  it('can be read by any signed-in account', async () => {
    expect((await request(server()).get('/directory')).status).toBe(401);
    const res = await request(server()).get('/directory').set('Cookie', citizen);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.entries)).toBe(true);
  });

  it('can only be changed by admins', async () => {
    expect((await send('post', '/directory', { parentId: null, folder: true, name: `Nope ${tag}` }, citizen)).status).toBe(403);
  });
});

describe('adding and editing', () => {
  it('adds folders and entries inside one another; entries need a kind', async () => {
    const folder = await add('Ministries', null);
    const department = await add('Department of Finance', folder.id, 'Department');
    await add('Revenue Board', department.id, 'Body');
    await add('Mint', department.id, 'Mining Agency');
    expect(await inside(department.id)).toEqual(['Revenue Board', 'Mint']);
    expect((await send('post', '/directory', { parentId: folder.id, folder: false, name: `No kind ${tag}` })).status).toBe(400);
    expect((await send('post', '/directory', { parentId: '00000000-0000-4000-8000-000000000000', folder: true, name: `Lost ${tag}` })).status).toBe(404);
  });

  it('edits details, tidies web addresses, and clears blanks', async () => {
    const entry = await add('Statistics Office', null, 'Institution');
    const res = await send('patch', `/directory/${entry.id}`, { headName: 'Zaha Rasheed', headPost: 'Director', email: 'stats@tdo.csa', website: 'stats.agee.pro', phone: '+960 330 1234' });
    expect(res.status).toBe(200);
    expect(res.body.entry).toMatchObject({ headName: 'Zaha Rasheed', website: 'https://stats.agee.pro', phone: '+960 330 1234' });
    expect((await send('patch', `/directory/${entry.id}`, { email: '' })).body.entry.email).toBeNull();
    for (const bad of [{ email: 'not an email' }, { website: 'nowhere' }, { phone: 'call me' }, { name: '' }, { colour: 'red' }]) {
      expect((await send('patch', `/directory/${entry.id}`, bad)).status).toBe(400);
    }
  });

  it('keeps folders to a name', async () => {
    const folder = await add('Plain folder', null);
    expect((await send('patch', `/directory/${folder.id}`, { headName: 'Someone' })).body.code).toBe('folder');
    expect((await send('patch', `/directory/${folder.id}`, { name: `Renamed ${tag}` })).status).toBe(200);
  });
});

describe('moving', () => {
  it('reorders, and moves into other entries, keeping the order gapless', async () => {
    const box = await add('Box', null);
    const [a, b, c] = [await add('A', box.id, 'Body'), await add('B', box.id, 'Body'), await add('C', box.id, 'Body')];
    await send('post', `/directory/${c.id}/move`, { parentId: box.id, index: 0 });
    expect(await inside(box.id)).toEqual(['C', 'A', 'B']);

    const res = await send('post', `/directory/${a.id}/move`, { parentId: b.id, index: 0 });
    expect(res.status).toBe(200);
    expect(await inside(box.id)).toEqual(['C', 'B']);
    expect(await inside(b.id)).toEqual(['A']);
    const positions = (res.body.entries as Entry[]).filter((e) => e.parentId === box.id).map((e) => e.position);
    expect(positions).toEqual([0, 1]);
  });

  it('won’t move an entry inside itself or anything inside it', async () => {
    const outer = await add('Outer', null, 'Department');
    const inner = await add('Inner', outer.id, 'Body');
    expect((await send('post', `/directory/${outer.id}/move`, { parentId: outer.id, index: 0 })).body.code).toBe('into_itself');
    expect((await send('post', `/directory/${outer.id}/move`, { parentId: inner.id, index: 0 })).body.code).toBe('into_itself');
    // out to the top level is fine (at the end, so real entries keep their places)
    expect((await send('post', `/directory/${inner.id}/move`, { parentId: null, index: 10_000 })).status).toBe(200);
  });
});

describe('deleting', () => {
  it('only deletes empty entries', async () => {
    const holder = await add('Holder', null, 'Commission');
    const [x, y] = [await add('X', holder.id, 'Company'), await add('Y', holder.id, 'Company')];
    expect((await request(server()).delete(`/directory/${holder.id}`).set('Origin', origin).set('Cookie', admin).send({})).body.code).toBe('not_empty');
    expect((await request(server()).delete(`/directory/${x.id}`).set('Origin', origin).set('Cookie', admin).send({})).status).toBe(204);
    expect((await prisma.directoryEntry.findUniqueOrThrow({ where: { id: y.id } })).position).toBe(0);
    const events = (await prisma.authEvent.findMany({ where: { targetId: x.id } })).map((e) => e.type);
    expect(events).toEqual(expect.arrayContaining(['DIRECTORY_ADDED', 'DIRECTORY_DELETED']));
  });
});

describe('adding many at once', () => {
  const folder = (name: string, children: object[] = []) => ({ folder: true, name: `${name} ${tag}`, children });
  const entry = (name: string, kind: string) => ({ folder: false, kind, name: `${name} ${tag}` });

  it('adds a whole tree, in order, after what’s already there', async () => {
    const home = await add('Bulk home', null);
    await add('Already here', home.id, 'Body');
    const res = await send('post', '/directory/bulk', {
      parentId: home.id,
      entries: [
        folder('Cabinet', [folder('Security', [entry('Defence', 'Department')]), entry('Justice', 'Department')]),
        entry('Audit', 'Commission'),
        entry('Maritime', 'Authority'),
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.added).toHaveLength(3);
    expect(await inside(home.id)).toEqual(['Already here', 'Cabinet', 'Audit', 'Maritime']);
    const byName = (n: string) => (res.body.entries as (Entry & { kind: string })[]).find((e) => e.name === `${n} ${tag}`)!;
    expect(await inside(byName('Cabinet').id)).toEqual(['Security', 'Justice']);
    expect(byName('Defence').parentId).toBe(byName('Security').id);
    expect(byName('Maritime').kind).toBe('Authority');
    expect((await prisma.authEvent.count({ where: { type: 'DIRECTORY_ADDED', targetId: byName('Defence').id } }))).toBe(1);
  });

  it('refuses malformed trees, and adds none of them', async () => {
    const before = await prisma.directoryEntry.count();
    for (const entries of [
      [{ folder: true, kind: 'Department', name: `Both ${tag}` }],
      [{ folder: false, name: `No kind ${tag}` }],
      [{ ...entry('Holder', 'Body'), children: [entry('Inside', 'Body')] }],
      [entry('Fine', 'Body'), { folder: false, kind: 'Body', name: '' }],
      Array.from({ length: 301 }, (_, i) => entry(`Many ${i}`, 'Body')),
    ]) {
      expect((await send('post', '/directory/bulk', { parentId: null, entries })).status).toBe(400);
    }
    // 300 split across folders still counts as 300
    const nested = [folder('Big', Array.from({ length: 300 }, (_, i) => entry(`Lot ${i}`, 'Body')))];
    expect((await send('post', '/directory/bulk', { parentId: null, entries: nested })).body.code).toBe('too_many');
    expect(await prisma.directoryEntry.count()).toBe(before);
  });
});
