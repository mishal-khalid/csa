// End-to-end checks of Fingerprint Management and fingerprint sign-in against the local test
// database. Real fingerprint readers can't run in a test, so a software one stands in: it makes a
// passkey and signs readings exactly as a device would (WebAuthn, ES256, no attestation).
import { createHash, generateKeyPairSync, randomBytes, randomUUID, sign } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { isoCBOR } from '@simplewebauthn/server/helpers';
import request from 'supertest';
import { hashPassword } from '../src/auth/passwords.js';
import { relyingParty } from '../src/fingerprints/webauthn.js';
import { createApp } from '../src/main.js';
import { PrismaService } from '../src/prisma.service.js';
import { config } from '../src/config.js';

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');

// a fingerprint reader in software: one passkey, kept on the "device"
class SoftReader {
  private readonly key = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  readonly credentialId = randomBytes(16);
  private userHandle = '';
  private counter = 0;

  constructor(private readonly origin = relyingParty.origin) {}

  private publicKey() {
    const { x, y } = this.key.publicKey.export({ format: 'jwk' });
    // COSE: EC2 key, ES256, P-256
    return isoCBOR.encode(new Map<number, number | Uint8Array>([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(x!, 'base64url')], [-3, Buffer.from(y!, 'base64url')]]));
  }

  // rpIdHash, flags (present, verified by fingerprint, and the new passkey when adding one), counter
  private authenticatorData(adding: boolean) {
    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(++this.counter);
    const parts = [createHash('sha256').update(relyingParty.id).digest(), Buffer.from([0x01 | 0x04 | (adding ? 0x40 : 0)]), counter];
    if (adding) {
      const length = Buffer.alloc(2);
      length.writeUInt16BE(this.credentialId.length);
      parts.push(Buffer.alloc(16), length, this.credentialId, Buffer.from(this.publicKey()));
    }
    return Buffer.concat(parts);
  }

  private clientData(type: string, challenge: string) {
    return Buffer.from(JSON.stringify({ type, challenge, origin: this.origin, crossOrigin: false }));
  }

  add(options: { challenge: string; user: { id: string } }) {
    this.userHandle = options.user.id;
    const attestationObject = isoCBOR.encode(new Map<string, unknown>([['fmt', 'none'], ['attStmt', new Map()], ['authData', this.authenticatorData(true)]]) as never);
    return {
      id: b64(this.credentialId),
      rawId: b64(this.credentialId),
      type: 'public-key',
      response: { clientDataJSON: b64(this.clientData('webauthn.create', options.challenge)), attestationObject: b64(attestationObject), transports: ['internal'] },
      clientExtensionResults: {},
      authenticatorAttachment: 'platform',
    };
  }

  read(options: { challenge: string }) {
    const clientDataJSON = this.clientData('webauthn.get', options.challenge);
    const authenticatorData = this.authenticatorData(false);
    const signature = sign('sha256', Buffer.concat([authenticatorData, createHash('sha256').update(clientDataJSON).digest()]), this.key.privateKey);
    return {
      id: b64(this.credentialId),
      rawId: b64(this.credentialId),
      type: 'public-key',
      response: { clientDataJSON: b64(clientDataJSON), authenticatorData: b64(authenticatorData), signature: b64(signature), userHandle: this.userHandle },
      clientExtensionResults: {},
      authenticatorAttachment: 'platform',
    };
  }
}

const origin = config.portalOrigin;
const tag = randomBytes(4).toString('hex');

let app: NestExpressApplication;
let prisma: PrismaService;
let mainCookies: string[];
let human: string[];
const people: Record<'first' | 'second' | 'admin', { id: string; username: string; password: string }> = {} as never;

const server = () => app.getHttpServer();
const cookiesOf = (res: request.Response) => ([] as string[]).concat(res.headers['set-cookie'] ?? []).map((c) => c.split(';')[0]);
const send = (method: 'post' | 'patch' | 'delete', path: string, body: object, cookies: string[]) =>
  request(server())[method](path).set('Origin', origin).set('Cookie', cookies).send(body);

// a session made straight in the database, for an account whose password the test doesn't know
async function sessionFor(userId: string) {
  const token = randomBytes(32).toString('base64url');
  await prisma.session.create({
    data: { userId, tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3_600_000) },
  });
  return [`__Host-csa_session=${token}`];
}

async function add(name: string, reader: SoftReader) {
  const options = await send('post', '/fingerprints/options', { name }, mainCookies);
  expect(options.status).toBe(200);
  const reading = reader.add(options.body);
  return { reading, response: await send('post', '/fingerprints', { name, reading }, mainCookies) };
}

async function fingerprintLogin(reader: SoftReader) {
  const options = await send('post', '/auth/fingerprint/options', {}, human);
  expect(options.status).toBe(200);
  const reading = reader.read(options.body);
  return { reading, response: await send('post', '/auth/fingerprint', { reading }, human) };
}

beforeAll(async () => {
  app = await createApp();
  await app.init();
  prisma = app.get(PrismaService);
  await prisma.rateLimit.deleteMany({});
  for (const [key, role] of [
    ['first', 'CITIZEN'],
    ['second', 'STAFF'],
    ['admin', 'ADMIN'],
  ] as const) {
    const password = randomBytes(15).toString('base64url');
    const user = await prisma.user.create({
      data: { email: `${key}-${tag}@example.com`, username: `${key}.${tag}`, name: `Test ${key}`, role, passwordHash: await hashPassword(password) },
    });
    people[key] = { id: user.id, username: user.username, password };
  }
  const main =
    (await prisma.user.findFirst({ where: { mainAccount: true } })) ??
    (await prisma.user.create({
      data: { id: randomUUID(), email: `main-${tag}@example.com`, username: `main.${tag}`, name: 'Test Main', role: 'ADMIN', mainAccount: true, passwordHash: 'x' },
    }));
  mainCookies = await sessionFor(main.id);
  human = cookiesOf(await request(server()).post('/auth/human').set('Origin', origin).send({ token: 'XXXX.DUMMY.TOKEN.XXXX' }));
});

afterAll(async () => {
  await prisma.fingerprint.deleteMany({ where: { name: { contains: tag } } });
  await prisma.session.deleteMany({ where: { tokenHash: { in: mainCookies.map((c) => createHash('sha256').update(c.split('=')[1]).digest('hex')) } } });
  await prisma.user.deleteMany({ where: { email: { contains: tag } } });
  await prisma.rateLimit.deleteMany({});
  await app.close();
});

describe('Fingerprint Management', () => {
  it('is for the main account only', async () => {
    expect((await request(server()).get('/fingerprints')).status).toBe(401);
    const admin = await sessionFor(people.admin.id);
    expect((await request(server()).get('/fingerprints').set('Cookie', admin)).status).toBe(403);
    expect((await send('post', '/fingerprints/options', { name: 'x' }, admin)).status).toBe(403);
    const res = await request(server()).get('/fingerprints').set('Cookie', mainCookies);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('adds a fingerprint once, and only from a fresh challenge', async () => {
    const reader = new SoftReader();
    const { reading, response } = await add(`Front desk ${tag}`, reader);
    expect(response.status).toBe(201);
    expect(response.body.fingerprint).toMatchObject({ name: `Front desk ${tag}`, accounts: [], lastUsedAt: null });
    expect(JSON.stringify(response.body)).not.toMatch(/publicKey|credentialId|counter/);

    // the same reading again: its challenge is used up
    const replay = await send('post', '/fingerprints', { name: `Copy ${tag}`, reading }, mainCookies);
    expect(replay.body.code).toBe('not_verified');
    // the same passkey with a new challenge: already added
    expect((await add(`Again ${tag}`, reader)).response.body.code).toBe('already_added');
  });

  it('refuses a reading made for another site', async () => {
    const options = await send('post', '/fingerprints/options', { name: `Elsewhere ${tag}` }, mainCookies);
    const reading = new SoftReader('https://evil.example').add(options.body);
    expect((await send('post', '/fingerprints', { name: `Elsewhere ${tag}`, reading }, mainCookies)).body.code).toBe('not_verified');
  });

  it('renames, and deletes only with the name typed out', async () => {
    const { response } = await add(`Spare ${tag}`, new SoftReader());
    const id = response.body.fingerprint.id;
    expect((await send('patch', `/fingerprints/${id}`, { name: `Spare room ${tag}` }, mainCookies)).body.fingerprint.name).toBe(`Spare room ${tag}`);
    expect((await send('delete', `/fingerprints/${id}`, { name: 'wrong' }, mainCookies)).status).toBe(400);
    expect((await send('delete', `/fingerprints/${id}`, { name: ` SPARE ROOM ${tag} ` }, mainCookies)).status).toBe(204);
    const events = (await prisma.authEvent.findMany({ where: { targetId: id } })).map((e) => e.type);
    expect(events).toEqual(expect.arrayContaining(['FINGERPRINT_ADDED', 'FINGERPRINT_UPDATED', 'FINGERPRINT_DELETED']));
  });
});

describe('signing in with a fingerprint', () => {
  const reader = new SoftReader();
  let id: string;

  beforeAll(async () => {
    id = (await add(`Login ${tag}`, reader)).response.body.fingerprint.id;
  });

  it('needs the bot check first', async () => {
    expect((await send('post', '/auth/fingerprint/options', {}, [])).body.code).toBe('challenge');
  });

  it('says when a fingerprint was never added', async () => {
    expect((await fingerprintLogin(new SoftReader())).response.body.code).toBe('unknown_fingerprint');
  });

  it('says when a fingerprint has no accounts', async () => {
    const { response } = await fingerprintLogin(reader);
    expect(response.status).toBe(401);
    expect(response.body.code).toBe('not_linked');
  });

  it('signs straight in to its one account, without a password', async () => {
    expect((await send('post', `/fingerprints/${id}/accounts`, { userId: people.first.id }, mainCookies)).body.fingerprint.accounts).toHaveLength(1);
    const { reading, response } = await fingerprintLogin(reader);
    expect(response.status).toBe(200);
    expect(response.body.user.username).toBe(people.first.username);
    const session = [...human, ...cookiesOf(response)];
    expect((await request(server()).get('/auth/me').set('Cookie', session)).body.user.username).toBe(people.first.username);

    // the same reading can't sign in again
    expect((await send('post', '/auth/fingerprint', { reading }, human)).body.code).toBe('not_verified');
    expect((await prisma.fingerprint.findUniqueOrThrow({ where: { id } })).lastUsedAt).not.toBeNull();
    const event = await prisma.authEvent.findFirst({ where: { userId: people.first.id, type: 'LOGIN_SUCCESS' } });
    expect(event?.detail).toBe('fingerprint');
  });

  it('with several accounts, signs in to the one picked', async () => {
    await send('post', `/fingerprints/${id}/accounts`, { userId: people.second.id }, mainCookies);
    const { response } = await fingerprintLogin(reader);
    expect(response.body.choose.map((a: { username: string }) => a.username)).toEqual([people.first.username, people.second.username]);
    const pick = [...human, ...cookiesOf(response)];

    // only a linked account, and only with the picker cookie
    expect((await send('post', '/auth/fingerprint/choose', { userId: people.admin.id }, pick)).status).toBe(403);
    expect((await send('post', '/auth/fingerprint/choose', { userId: people.second.id }, human)).body.code).toBe('expired');
    const chosen = await send('post', '/auth/fingerprint/choose', { userId: people.second.id }, pick);
    expect(chosen.status).toBe(200);
    expect(chosen.body.user.username).toBe(people.second.username);
  });

  it('stops signing in to an unlinked or deleted account', async () => {
    await request(server()).delete(`/fingerprints/${id}/accounts/${people.second.id}`).set('Origin', origin).set('Cookie', mainCookies).send({});
    await prisma.user.delete({ where: { id: people.first.id } });
    expect((await fingerprintLogin(reader)).response.body.code).toBe('not_linked');
  });
});
