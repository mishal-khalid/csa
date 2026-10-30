// End-to-end checks of User Management against the local test database. Each run makes its own
// throwaway accounts and deletes them afterwards.
import { randomBytes } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { hashPassword } from '../src/auth/passwords.js';
import { seal } from '../src/auth/sealed.js';
import { createApp } from '../src/main.js';
import { PrismaService } from '../src/prisma.service.js';
import { config } from '../src/config.js';

const origin = config.portalOrigin;
const tag = randomBytes(4).toString('hex');
const password = () => randomBytes(15).toString('base64url');
const admin = { email: `admin-${tag}@example.com`, username: `admin.${tag}`, password: password() };
const citizen = { email: `citizen-${tag}@example.com`, username: `citizen.${tag}`, password: password() };

let app: NestExpressApplication;
let prisma: PrismaService;
let adminCookies: string[];
let mainId: string;

const server = () => app.getHttpServer();
const cookiesOf = (res: request.Response) => ([] as string[]).concat(res.headers['set-cookie'] ?? []).map((c) => c.split(';')[0]);
const send = (method: 'post' | 'patch' | 'delete', path: string, body: object, cookies: string[]) =>
  request(server())[method](path).set('Origin', origin).set('Cookie', cookies).send(body);

async function signIn(identifier: string, secret: string): Promise<string[]> {
  const res = await send('post', '/auth/login', { identifier, password: secret }, []);
  expect(res.status).toBe(200);
  return cookiesOf(res);
}

beforeAll(async () => {
  app = await createApp();
  await app.init();
  prisma = app.get(PrismaService);
  await prisma.rateLimit.deleteMany({});
  for (const [account, role] of [
    [admin, 'ADMIN'],
    [citizen, 'CITIZEN'],
  ] as const) {
    await prisma.user.create({
      data: { email: account.email, username: account.username, name: `Test ${role}`, role, passwordHash: await hashPassword(account.password) },
    });
  }
  // the database's main account, or a throwaway one (deleted with the rest) if it has none yet
  const main = await prisma.user.findFirst({ where: { mainAccount: true } });
  if (main) mainId = main.id;
  else {
    const made = await prisma.user.create({
      data: { email: `main-${tag}@example.com`, username: `main.${tag}`, name: 'Test Main', role: 'ADMIN', mainAccount: true, passwordHash: await hashPassword(password()) },
    });
    mainId = made.id;
  }
  adminCookies = await signIn(admin.username, admin.password);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.rateLimit.deleteMany({});
  await app.close();
});

describe('access', () => {
  it('needs a session, then the Admin role', async () => {
    expect((await request(server()).get('/users')).status).toBe(401);
    const cookies = await signIn(citizen.email, citizen.password);
    const res = await request(server()).get('/users').set('Cookie', cookies);
    expect(res.status).toBe(403);
  });

  it('lets the portal send PATCH and DELETE, but only as JSON', async () => {
    const preflight = await request(server()).options('/users/x').set('Origin', origin).set('Access-Control-Request-Method', 'PATCH');
    expect(preflight.headers['access-control-allow-methods']).toContain('PATCH');
    const form = await request(server()).patch(`/users/${mainId}`).set('Origin', origin).set('Cookie', adminCookies).type('form').send({ name: 'x' });
    expect(form.status).toBe(403);
  });
});

describe('the table', () => {
  it('lists every account by number, without any password', async () => {
    const res = await request(server()).get('/users').set('Cookie', adminCookies);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const numbers = res.body.users.map((u: { number: number }) => u.number);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    expect(res.body.users.find((u: { username: string }) => u.username === admin.username)).toMatchObject({ role: 'ADMIN', main: false });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|passwordSealed|\$argon2/);
  });
});

describe('creating', () => {
  const made = { name: 'Aisha Naseem', email: `Aisha-${tag}@Example.com`, username: `aisha.${tag}`, password: password(), role: 'STAFF' };

  it('creates an account that can sign in, and shows its password', async () => {
    const res = await send('post', '/users', made, adminCookies);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: made.email.toLowerCase(), role: 'STAFF', passwordStored: true, main: false });
    await signIn(made.username, made.password);

    const shown = await send('post', `/users/${res.body.user.id}/password`, {}, adminCookies);
    expect(shown.status).toBe(200);
    expect(shown.body).toEqual({ password: made.password });
    const types = (await prisma.authEvent.findMany({ where: { targetId: res.body.user.id } })).map((e) => e.type);
    expect(types).toEqual(expect.arrayContaining(['USER_CREATED', 'PASSWORD_VIEWED']));
  });

  it('says which of email or username is taken', async () => {
    const email = await send('post', '/users', { ...made, username: `other.${tag}` }, adminCookies);
    expect(email.status).toBe(409);
    expect(email.body).toEqual({ code: 'taken', field: 'email' });
    const username = await send('post', '/users', { ...made, email: `other-${tag}@example.com` }, adminCookies);
    expect(username.body).toEqual({ code: 'taken', field: 'username' });
  });

  it('refuses malformed accounts', async () => {
    for (const bad of [{ password: 'short' }, { username: 'No Spaces' }, { email: 'not-an-email' }, { name: ' ' }, { role: 'OWNER' }, { mainAccount: true }]) {
      const res = await send('post', '/users', { ...made, email: `new-${tag}@example.com`, username: `new.${tag}`, ...bad }, adminCookies);
      expect(res.status).toBe(400);
    }
  });
});

describe('editing', () => {
  it('changes one field at a time, and refuses another account’s email', async () => {
    const target = await prisma.user.findUniqueOrThrow({ where: { email: citizen.email } });
    const res = await send('patch', `/users/${target.id}`, { name: 'Renamed Citizen' }, adminCookies);
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Renamed Citizen');
    const clash = await send('patch', `/users/${target.id}`, { email: admin.email }, adminCookies);
    expect(clash.body).toEqual({ code: 'taken', field: 'email' });
  });

  it('a new password signs the account out everywhere and can be shown', async () => {
    const target = await prisma.user.findUniqueOrThrow({ where: { email: citizen.email } });
    const theirs = await signIn(citizen.username, citizen.password);
    const fresh = password();
    expect((await send('patch', `/users/${target.id}`, { password: fresh }, adminCookies)).status).toBe(200);
    expect((await request(server()).get('/auth/me').set('Cookie', theirs)).body).toEqual({ user: null });
    // the admin's own session carries on
    expect((await request(server()).get('/auth/me').set('Cookie', adminCookies)).body.user.username).toBe(admin.username);
    await signIn(citizen.username, fresh);
    expect((await send('post', `/users/${target.id}/password`, {}, adminCookies)).body).toEqual({ password: fresh });
    citizen.password = fresh;
  });

  it('won’t let an admin change their own role or delete themselves', async () => {
    const me = await prisma.user.findUniqueOrThrow({ where: { email: admin.email } });
    expect((await send('patch', `/users/${me.id}`, { role: 'CITIZEN' }, adminCookies)).body.code).toBe('self');
    expect((await send('delete', `/users/${me.id}`, { username: admin.username }, adminCookies)).body.code).toBe('self');
    // their own name is fine
    expect((await send('patch', `/users/${me.id}`, { name: 'Test Admin' }, adminCookies)).status).toBe(200);
  });

  it('keeps admins away from the main account', async () => {
    const main = await prisma.user.findUniqueOrThrow({ where: { id: mainId } });
    for (const res of [
      await send('patch', `/users/${mainId}`, { name: 'Taken Over' }, adminCookies),
      await send('post', `/users/${mainId}/password`, {}, adminCookies),
      await send('delete', `/users/${mainId}`, { username: main.username }, adminCookies),
    ]) {
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('main_account');
    }
    expect((await prisma.user.findUniqueOrThrow({ where: { id: mainId } })).name).toBe(main.name);
  });

  it('won’t open a sealed password moved onto another account', async () => {
    const target = await prisma.user.findUniqueOrThrow({ where: { email: citizen.email } });
    const other = await prisma.user.findUniqueOrThrow({ where: { email: admin.email } });
    await prisma.user.update({ where: { id: target.id }, data: { passwordSealed: seal('x'.repeat(12), other.id) } });
    expect((await send('post', `/users/${target.id}/password`, {}, adminCookies)).body.code).toBe('unreadable');
  });
});

describe('deleting', () => {
  it('needs the username typed out, and never reuses the number', async () => {
    const target = await prisma.user.findUniqueOrThrow({ where: { email: citizen.email } });
    expect((await send('delete', `/users/${target.id}`, { username: 'wrong' }, adminCookies)).status).toBe(400);
    expect((await send('delete', `/users/${target.id}`, { username: citizen.username.toUpperCase() }, adminCookies)).status).toBe(204);
    expect(await prisma.user.findUnique({ where: { id: target.id } })).toBeNull();

    const next = await send('post', '/users', { name: 'Next', email: `next-${tag}@example.com`, username: `next.${tag}`, password: password(), role: 'CITIZEN' }, adminCookies);
    expect(next.body.user.number).toBeGreaterThan(target.number);
  });

  it('answers 404 for accounts that don’t exist', async () => {
    expect((await send('patch', '/users/not-a-uuid', { name: 'x' }, adminCookies)).status).toBe(404);
    expect((await send('patch', '/users/00000000-0000-4000-8000-000000000000', { name: 'x' }, adminCookies)).status).toBe(404);
  });
});
