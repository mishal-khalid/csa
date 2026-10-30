// End-to-end checks of the sign-in API against the local test database (npm run db:local, then
// npm run db:migrate). Each run makes its own throwaway account and deletes it afterwards.
import { randomBytes } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { hashPassword } from '../src/auth/passwords.js';
import { createApp } from '../src/main.js';
import { PrismaService } from '../src/prisma.service.js';
import { config } from '../src/config.js';

const origin = config.portalOrigin;
const tag = randomBytes(4).toString('hex');
const account = { email: `test-${tag}@example.com`, username: `test.${tag}`, password: randomBytes(18).toString('base64url') };

let app: NestExpressApplication;
let prisma: PrismaService;

const post = (path: string, body: object, cookies: string[] = []) =>
  request(app.getHttpServer()).post(path).set('Origin', origin).set('Cookie', cookies).send(body);

const cookiesOf = (res: request.Response) => ([] as string[]).concat(res.headers['set-cookie'] ?? []).map((c) => c.split(';')[0]);

// the bot-check cookie (Cloudflare's test secret passes any token)
async function human(): Promise<string[]> {
  const res = await post('/auth/human', { token: 'XXXX.DUMMY.TOKEN.XXXX' });
  expect(res.status).toBe(204);
  return cookiesOf(res);
}

beforeAll(async () => {
  app = await createApp();
  await app.init();
  prisma = app.get(PrismaService);
  // a clean slate for the rate limits of this machine's address
  await prisma.rateLimit.deleteMany({});
  await prisma.user.create({
    data: { email: account.email, username: account.username, name: 'Test Account', passwordHash: await hashPassword(account.password) },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: account.email } });
  await prisma.rateLimit.deleteMany({});
  await app.close();
});

describe('cross-site protection', () => {
  it('refuses requests from another site', async () => {
    const res = await request(app.getHttpServer()).post('/auth/lookup').set('Origin', 'https://evil.example').send({ identifier: account.email });
    expect(res.status).toBe(403);
  });

  it('refuses non-JSON bodies (what a cross-site form would send)', async () => {
    const res = await request(app.getHttpServer()).post('/auth/lookup').set('Origin', origin).type('form').send({ identifier: account.email });
    expect(res.status).toBe(403);
  });

  it('only lets the portal read responses (CORS)', async () => {
    const res = await request(app.getHttpServer()).options('/auth/lookup').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sends security headers', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('lookup', () => {
  it('needs the bot check first', async () => {
    const res = await post('/auth/lookup', { identifier: account.email });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('challenge');
  });

  it('finds an account by email or username, in any case', async () => {
    const cookies = await human();
    for (const identifier of [account.email, account.email.toUpperCase(), account.username]) {
      const res = await post('/auth/lookup', { identifier }, cookies);
      expect(res.body).toEqual({ exists: true });
    }
  });

  it('says no for an unknown account, after the same minimum time', async () => {
    const cookies = await human();
    const started = Date.now();
    const res = await post('/auth/lookup', { identifier: `nobody-${tag}@example.com` }, cookies);
    expect(res.body).toEqual({ exists: false });
    expect(Date.now() - started).toBeGreaterThanOrEqual(395);
  });

  it('rejects malformed input', async () => {
    const cookies = await human();
    expect((await post('/auth/lookup', { identifier: 'not an email@' }, cookies)).status).toBe(400);
    expect((await post('/auth/lookup', { identifier: account.email, extra: 1 }, cookies)).status).toBe(400);
  });
});

describe('login', () => {
  it('signs in, keeps the session on the server, and signs out', async () => {
    const cookies = await human();
    const res = await post('/auth/login', { identifier: account.username, password: account.password }, cookies);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: account.username, role: 'CITIZEN' });
    expect(JSON.stringify(res.body)).not.toContain('password');

    const setCookie = ([] as string[]).concat(res.headers['set-cookie']).find((c) => c.startsWith('__Host-csa_session='))!;
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Secure/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);

    const session = [...cookies, ...cookiesOf(res)];
    const me = await request(app.getHttpServer()).get('/auth/me').set('Cookie', session);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(account.email);

    expect((await post('/auth/logout', {}, session)).status).toBe(204);
    // the same cookie no longer works once signed out
    expect((await request(app.getHttpServer()).get('/auth/me').set('Cookie', session)).body).toEqual({ user: null });
  });

  it('stores only a hash of the session token', async () => {
    const sessions = await prisma.session.findMany({ where: { user: { email: account.email } } });
    expect(sessions.length).toBeGreaterThan(0);
    for (const s of sessions) expect(s.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('says when there is no such account', async () => {
    const cookies = await human();
    const res = await post('/auth/login', { identifier: `nobody-${tag}@example.com`, password: 'whatever-it-is' }, cookies);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('no_account');
  });

  it('locks the account after 5 wrong passwords, even for the right one', async () => {
    const cookies = await human();
    for (let i = 1; i <= 4; i++) {
      const res = await post('/auth/login', { identifier: account.email, password: `wrong-${i}` }, cookies);
      expect(res.body.code).toBe('wrong_password');
    }
    const fifth = await post('/auth/login', { identifier: account.email, password: 'wrong-5' }, cookies);
    expect(fifth.status).toBe(423);
    expect(fifth.body.retryAfter).toBeGreaterThan(800);

    const right = await post('/auth/login', { identifier: account.email, password: account.password }, cookies);
    expect(right.status).toBe(423);

    const events = await prisma.authEvent.findMany({ where: { user: { email: account.email } } });
    expect(events.map((e) => e.type)).toContain('ACCOUNT_LOCKED');
  });
});

describe('rate limits', () => {
  it('stops an IP address after 30 lookups a minute', async () => {
    await prisma.rateLimit.deleteMany({});
    const cookies = await human();
    const replies = await Promise.all(
      Array.from({ length: 32 }, () => post('/auth/lookup', { identifier: account.username }, cookies)),
    );
    const limited = replies.filter((r) => r.status === 429);
    expect(limited.length).toBe(2);
    expect(limited[0].body.retryAfter).toBeGreaterThan(0);
  });
});
