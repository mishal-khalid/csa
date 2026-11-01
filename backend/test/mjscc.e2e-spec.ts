// End-to-end checks of the MJSCC evaluation's API against the local test database. Whether the
// results are out depends on every instructor in the database, so this empties the evaluation's
// tables before and after (local test data only). It expects the local .env's instructor list to
// hold Mish'al and Ibrysam.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createApp } from '../src/main.js';
import { config } from '../src/config.js';
import { mjsccConfig } from '../src/mjscc/config.js';
import { MjsccPrisma } from '../src/mjscc/prisma.service.js';

const site = mjsccConfig!.origin;
const code = mjsccConfig!.accessCode;

let app: NestExpressApplication;
let db: MjsccPrisma;

const server = () => app.getHttpServer();
const post = (path: string, body: object, cookies: string[] = [], origin = site) =>
  request(server()).post(path).set('Origin', origin).set('Cookie', cookies).send(body);
const get = (path: string, cookies: string[] = []) => request(server()).get(path).set('Cookie', cookies);

async function signIn(name: string) {
  const res = await post('/mjscc/session', { name, code });
  expect(res.status).toBe(200);
  const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith('__Host-mjscc_session='));
  expect(cookie).toBeDefined();
  return [cookie!.split(';')[0]];
}

// every item of every student scored, straight into the database
async function scoreEverything(name: string, value: (part: string) => number) {
  const instructor = await db.instructor.findFirstOrThrow({ where: { name } });
  const sizes = { THEORY: 40, DRILL: 27, COMMANDING: 3, INSPECTION: 1 } as const;
  const data = [1, 2, 3, 4, 5, 6].flatMap((student) =>
    (Object.keys(sizes) as (keyof typeof sizes)[]).flatMap((part) =>
      Array.from({ length: sizes[part] }, (_, i) => ({ instructorId: instructor.id, student, part, item: i + 1, value: value(part) })),
    ),
  );
  await db.score.createMany({ data, skipDuplicates: true });
}

const wipe = async () => {
  await db.instructor.deleteMany({});
  await db.commandDraw.deleteMany({});
  await db.rateLimit.deleteMany({});
};

beforeAll(async () => {
  app = await createApp();
  await app.init();
  db = app.get(MjsccPrisma);
  await wipe();
});

afterAll(async () => {
  await wipe();
  await app.close();
});

describe('keeping the two sites apart', () => {
  it('lets each site call only its own routes', async () => {
    const asPortal = await post('/mjscc/session', { name: 'Someone', code }, [], config.portalOrigin);
    expect(asPortal.status).toBe(403);
    const asEvaluation = await post('/auth/lookup', { identifier: 'someone' }, [], site);
    expect(asEvaluation.status).toBe(403);
  });

  it('answers CORS for each site on its own routes only', async () => {
    const preflight = (path: string, origin: string) =>
      request(server()).options(path).set('Origin', origin).set('Access-Control-Request-Method', 'POST');
    expect((await preflight('/mjscc/scores', site)).headers['access-control-allow-origin']).toBe(site);
    expect((await preflight('/mjscc/scores', config.portalOrigin)).headers['access-control-allow-origin']).toBeUndefined();
    expect((await preflight('/auth/login', config.portalOrigin)).headers['access-control-allow-origin']).toBe(config.portalOrigin);
    expect((await preflight('/auth/login', site)).headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('signing in', () => {
  it('needs the day’s code and a name on the list', async () => {
    expect(mjsccConfig!.instructors).toEqual(expect.arrayContaining(["Mish'al", 'Ibrysam']));
    expect((await post('/mjscc/session', { name: 'Mish’al', code: 'wrong-code' })).body.code).toBe('wrong_code');
    expect((await post('/mjscc/session', { name: 'Someone Else', code })).body.code).toBe('unknown_name');
    // Thaana names get as far as the list (they're valid names), and aren't on it
    expect((await post('/mjscc/session', { name: 'މިޝްޢަލް', code })).body.code).toBe('unknown_name');
    expect((await post('/mjscc/session', { name: 'x', code })).status).toBe(400);
    expect((await post('/mjscc/session', { name: '<script>', code })).status).toBe(400);
    expect((await get('/mjscc/content')).status).toBe(401);
  });

  it('matches names however they’re typed, and shows them as the list writes them', async () => {
    const a = await signIn('Mish’al');
    const b = await signIn('  MISHAL ');
    expect((await get('/mjscc/session', a)).body.instructor).toEqual({ name: "Mish'al", finished: false });
    expect((await get('/mjscc/session', b)).body.instructor.name).toBe("Mish'al");
    expect(await db.instructor.count()).toBe(1);
  });

  it('accepts the code in any case', async () => {
    expect((await post('/mjscc/session', { name: 'Ibrysam', code: ` ${code.toUpperCase()} ` })).status).toBe(200);
  });

  it('signs out', async () => {
    const cookies = await signIn('Ibrysam');
    expect((await request(server()).delete('/mjscc/session').set('Origin', site).set('Cookie', cookies).send({})).status).toBe(204);
    expect((await get('/mjscc/session', cookies)).body.instructor).toBeNull();
  });
});

describe('the evaluation', () => {
  it('gives every instructor the same content and the same three commands per student', async () => {
    const [a, b] = await Promise.all([signIn('Mish’al'), signIn('Ibrysam')]);
    const [one, two] = await Promise.all([get('/mjscc/content', a), get('/mjscc/content', b)]);
    expect(one.status).toBe(200);
    expect(one.body.theory).toHaveLength(40);
    expect(one.body.drill).toHaveLength(27);
    expect(one.body.students).toHaveLength(6);
    expect(one.body.theory.filter((q: { image: boolean }) => q.image).map((q: { number: number }) => q.number)).toEqual([18, 19, 27, 28, 29, 30, 31, 32, 38]);
    for (const student of one.body.students) expect(new Set(student.commands).size).toBe(3);
    expect(two.body.students).toEqual(one.body.students);
  });

  it('serves the answer pictures to signed-in instructors only', async () => {
    const cookies = await signIn('Mish’al');
    const png = await get('/mjscc/answers/18', cookies);
    expect(png.status).toBe(200);
    expect(png.headers['content-type']).toBe('image/png');
    expect(png.headers['cross-origin-resource-policy']).toBe('same-site');
    expect((await get('/mjscc/answers/1', cookies)).status).toBe(404);
    expect((await get('/mjscc/answers/18')).status).toBe(401);
  });

  it('keeps scores in range', async () => {
    const cookies = await signIn('Mish’al');
    const score = (body: object) => post('/mjscc/scores', body, cookies);
    expect((await score({ student: 1, part: 'THEORY', item: 1, value: 4 })).status).toBe(400);
    expect((await score({ student: 1, part: 'THEORY', item: 41, value: 1 })).status).toBe(400);
    expect((await score({ student: 7, part: 'DRILL', item: 1, value: 1 })).status).toBe(400);
    expect((await score({ student: 1, part: 'DRILL', item: 1, value: 6 })).status).toBe(400);
    expect((await score({ student: 1, part: 'THEORY', item: 1, value: 3 })).status).toBe(204);
    expect((await score({ student: 1, part: 'THEORY', item: 1, value: 2 })).status).toBe(204);
    expect((await score({ student: 1, part: 'INSPECTION', item: 1, value: 0 })).status).toBe(204);
    expect((await post('/mjscc/notes', { student: 1, text: 'Boots not polished' }, cookies)).status).toBe(204);
    const mine = await get('/mjscc/scores', cookies);
    expect(mine.body.scores).toEqual(
      expect.arrayContaining([
        { student: 1, part: 'THEORY', item: 1, value: 2 },
        { student: 1, part: 'INSPECTION', item: 1, value: 0 },
      ]),
    );
    expect(mine.body.notes).toEqual([{ student: 1, text: 'Boots not polished' }]);
  });

  it('only finishes with everything scored, then shows everyone’s marks once all who started have finished', async () => {
    const mishal = await signIn('Mish’al');
    const ibrysam = await signIn('Ibrysam');

    const early = await post('/mjscc/finish', {}, mishal);
    expect(early.status).toBe(409);
    expect(early.body.code).toBe('incomplete');
    expect(early.body.missing[0]).toMatchObject({ student: 1, part: 'THEORY' });

    // Mish'al: 2/3 on theory, 4/5 on the rest (overwriting what the test above scored)
    await scoreEverything("Mish'al", (part) => (part === 'THEORY' ? 2 : 4));
    await db.score.updateMany({ where: { instructor: { name: "Mish'al" }, part: 'THEORY' }, data: { value: 2 } });
    await db.score.updateMany({ where: { instructor: { name: "Mish'al" }, part: 'INSPECTION' }, data: { value: 4 } });

    expect((await post('/mjscc/finish', {}, mishal)).body.instructor.finished).toBe(true);
    expect((await post('/mjscc/scores', { student: 1, part: 'THEORY', item: 1, value: 3 }, mishal)).body.code).toBe('finished');

    // the only one who has scored has finished, but the results wait for two
    const alone = await get('/mjscc/results', mishal);
    expect(alone.body.open).toBe(false);
    expect(alone.body.needed).toBe(2);
    expect(alone.body.instructors).toEqual([{ name: "Mish'al", finished: true, me: true }]);

    // Ibrysam: full marks everywhere
    await scoreEverything('Ibrysam', (part) => (part === 'THEORY' ? 3 : 5));

    // Ibrysam hasn't finished, so Mish'al still sees only their own marks
    const waiting = await get('/mjscc/results', mishal);
    expect(waiting.body.open).toBe(false);
    expect(waiting.body.students[0].instructors).toBeUndefined();
    // 66.7% theory, 80% drill, 80% commanding → base 76; inspection 4 → ×1.2 = 91.2
    expect(waiting.body.students[0].mine.base).toBeCloseTo(76);
    expect(waiting.body.students[0].mine.final).toBeCloseTo(91.2);

    // reopening is allowed until everyone has finished
    expect((await post('/mjscc/reopen', {}, mishal)).body.instructor.finished).toBe(false);
    expect((await post('/mjscc/finish', {}, mishal)).status).toBe(200);
    expect((await post('/mjscc/finish', {}, ibrysam)).status).toBe(200);

    const out = await get('/mjscc/results', ibrysam);
    expect(out.body.open).toBe(true);
    const maahin = out.body.students[0];
    expect(maahin.name).toBe('CPL. Maahin');
    // the two who came, in the list's order; Malsa and Haneen never scored, so they didn't hold it up
    expect(maahin.instructors.map((i: { name: string }) => i.name)).toEqual(["Mish'al", 'Ibrysam']);
    expect(maahin.instructors[0].note).toBe('Boots not polished');
    expect(maahin.instructors[0].items.THEORY).toHaveLength(40);
    // (91.2 + 100) / 2
    expect(maahin.average.final).toBeCloseTo(95.6);

    expect((await post('/mjscc/reopen', {}, mishal)).body.code).toBe('results_open');

    // someone on the list who comes late can't score now (or everyone's results would hide again)
    const malsa = await signIn('Malsa');
    expect((await post('/mjscc/scores', { student: 1, part: 'THEORY', item: 1, value: 3 }, malsa)).body.code).toBe('results_open');
    expect((await post('/mjscc/notes', { student: 1, text: 'late' }, malsa)).body.code).toBe('results_open');
    expect((await get('/mjscc/results', ibrysam)).body.open).toBe(true);
  });
});
