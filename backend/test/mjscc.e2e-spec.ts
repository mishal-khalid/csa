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
    // 66.7% theory, 80% drill, 80% commanding → 20 + 40 + 16 = 76 (the inspection of 4 doesn't count)
    expect(waiting.body.students[0].mine.final).toBeCloseTo(76);

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
    // (76 + 100) / 2
    expect(maahin.average.final).toBeCloseTo(88);

    expect((await post('/mjscc/reopen', {}, mishal)).body.code).toBe('results_open');

    // someone on the list who comes late can't score now (or everyone's results would hide again)
    const malsa = await signIn('Malsa');
    expect((await post('/mjscc/scores', { student: 1, part: 'THEORY', item: 1, value: 3 }, malsa)).body.code).toBe('results_open');
    expect((await post('/mjscc/notes', { student: 1, text: 'late' }, malsa)).body.code).toBe('results_open');
    expect((await get('/mjscc/results', ibrysam)).body.open).toBe(true);
  });
});

describe('transcripts', () => {
  // made-up details and files in place of whatever this machine has loaded, which is put back after
  const details = {
    students: ['CPL. Maahin', 'CPL. Rauha', 'CPL. Zeek', 'CPL. Shain', 'LCPL. Auna', 'CPL. Alsan'].map((student, i) => ({
      student,
      rank: i === 4 ? 'ލ.ކޕލ.' : 'ކޕލ.',
      name: `Student ${i + 1}`,
    })),
    // not the list's order, to show the transcript follows this one
    instructors: [
      { name: 'Haneen', line: 'Line for Haneen' },
      { name: 'Ibrysam', line: 'Line for Ibrysam' },
      { name: "Mish'al", line: 'Line for Mishal (In-Charge)', inCharge: true },
    ],
  };
  const fake = (name: string, type: string, data: Buffer) => ({ name, type, data: new Uint8Array(data) });
  const files = [
    fake('details.json', 'application/json', Buffer.from(JSON.stringify(details))),
    ...['crest.png', 'stamp.png', 'signature.png', 'bismillah.png'].map((name) => fake(name, 'image/png', Buffer.from(`png ${name}`))),
    ...['title.ttf', 'title-bold.ttf'].map((name) => fake(name, 'font/ttf', Buffer.from(`font ${name}`))),
  ];
  let saved: Awaited<ReturnType<MjsccPrisma['transcriptFile']['findMany']>>;
  let mishal: string[];
  let ibrysam: string[];

  beforeAll(async () => {
    saved = await db.transcriptFile.findMany();
    await db.transcriptFile.deleteMany({});
    // (the tests above have used up most of this machine's sign-in tries)
    await db.rateLimit.deleteMany({});
    mishal = await signIn("Mish'al");
    ibrysam = await signIn('Ibrysam');
  });

  afterAll(async () => {
    await db.transcriptFile.deleteMany({});
    await db.transcriptFile.createMany({ data: saved.map(({ name, type, data }) => ({ name, type, data })) });
  });

  it('can’t be exported until their details are loaded', async () => {
    expect((await get('/mjscc/results', mishal)).body.transcripts).toBe(false);
    expect((await get('/mjscc/transcripts/1', mishal)).body.code).toBe('not_set_up');
  });

  it('are for the Platoon In-Charge alone, once the results are out', async () => {
    await db.transcriptFile.createMany({ data: files });
    expect((await get('/mjscc/results', mishal)).body.transcripts).toBe(true);
    expect((await get('/mjscc/results', ibrysam)).body.transcripts).toBe(false);
    expect((await get('/mjscc/transcripts/1', ibrysam)).status).toBe(403);
    expect((await get('/mjscc/transcript-files/stamp.png', ibrysam)).status).toBe(403);
    expect((await get('/mjscc/transcripts/1')).status).toBe(401);
    expect((await get('/mjscc/transcript-files/signature.png')).status).toBe(401);

    // not while the results are out of sight again
    const finished = await db.instructor.findFirstOrThrow({ where: { name: 'Ibrysam' } });
    await db.instructor.update({ where: { id: finished.id }, data: { finishedAt: null } });
    expect((await get('/mjscc/transcripts/1', mishal)).body.code).toBe('results_not_out');
    expect((await get('/mjscc/results', mishal)).body.transcripts).toBe(false);
    await db.instructor.update({ where: { id: finished.id }, data: { finishedAt: finished.finishedAt } });
  });

  it('carry the average marks, the inspection notes and the instructors who scored', async () => {
    const res = await get('/mjscc/transcripts/1', mishal);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const t = res.body;
    expect(t.student).toEqual({ number: 1, short: 'CPL. Maahin', rank: 'ކޕލ.', name: 'Student 1' });
    // Mish'al 80/120, Ibrysam 120/120 → 100 on average; the overall as on the results page
    expect(t.marks.theory).toEqual({ points: 100, max: 120, percent: expect.closeTo(83.33, 1) });
    expect(t.marks.inspection.points).toBe(4.5);
    expect(t.marks.final).toBeCloseTo(88);
    expect(t.issues).toEqual(['Boots not polished']);
    // in details.json's order; Haneen didn't come, Malsa isn't in it
    expect(t.instructors).toEqual(['Line for Ibrysam', 'Line for Mishal (In-Charge)']);
    expect((await get('/mjscc/transcripts/5', mishal)).body.student.rank).toBe('ލ.ކޕލ.');
    for (const bad of ['0', '7', '12', 'x']) expect((await get(`/mjscc/transcripts/${bad}`, mishal)).status).toBe(404);
  });

  it('hand over their pictures and fonts, but not the details file', async () => {
    const stamp = await get('/mjscc/transcript-files/stamp.png', mishal).buffer(true);
    expect(stamp.status).toBe(200);
    expect(stamp.headers['content-type']).toBe('image/png');
    expect(stamp.headers['cache-control']).toBe('no-store');
    expect(stamp.headers['cross-origin-resource-policy']).toBe('same-site');
    expect(Buffer.from(stamp.body as Buffer).toString()).toBe('png stamp.png');
    expect((await get('/mjscc/transcript-files/title-bold.ttf', mishal)).headers['content-type']).toBe('font/ttf');
    for (const bad of ['details.json', 'other.png', '..%2F.env']) expect((await get(`/mjscc/transcript-files/${bad}`, mishal)).status).toBe(404);
  });
});
