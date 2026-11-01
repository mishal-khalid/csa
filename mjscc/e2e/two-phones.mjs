// The whole evaluation, run through the app on two phones at once (plus a third, late), the way the
// instructors will use it: signing in, every theory answer, the drill in pairs, the commands, the
// inspection with notes and a dropped connection, Finish too early, Finish, reopen, the results on
// both phones (checked against the marking worked out here from the raw scores), and signing out.
//
// Locally it needs the API (npm --prefix backend run start:dev, :3300) and the app (npm --prefix
// mjscc run dev, :3400) running; either way Google Chrome installed, and the instructor list to
// include Mish'al, Ibrysam and Malsa. It empties the evaluation before and after.
//
// Run: npm --prefix mjscc run test:phones        (local; screenshots land in mjscc/e2e/shots)
//      npm --prefix mjscc run test:phones:live   (mjscc.agee.pro: this empties the REAL evaluation,
//                                                 so only before the day, never during it)
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright-core';
import { words } from '../lib/words.js';

const LIVE = process.argv.includes('--live');
const APP = LIVE ? 'https://mjscc.agee.pro' : 'http://localhost:3400';
const API = LIVE ? 'https://api.agee.pro' : 'http://localhost:3300';
const CODE = process.env.MJSCC_ACCESS_CODE;
const SHOTS = fileURLToPath(new URL(LIVE ? './shots/live' : './shots', import.meta.url));
const BACKEND = fileURLToPath(new URL('../../backend', import.meta.url));
const NAMES = ['CPL. Maahin', 'CPL. Rauha', 'CPL. Zeek', 'CPL. Shain', 'LCPL. Auna', 'CPL. Alsan'];

let failures = 0;
let passes = 0;
function check(name, ok, detail = '') {
  ok ? passes++ : failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}
const step = (what) => console.log(`\n${new Date().toISOString().slice(11, 19)}  ${what}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reset = () => execFileSync('npm', ['--prefix', BACKEND, 'run', '-s', LIVE ? 'supabase:mjscc-reset' : 'mjscc:reset-local'], { stdio: 'inherit' });
// waits until a check comes true (the API can take a moment, more so over a real connection)
async function eventually(test, ms = 20000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await test().catch(() => false)) return true;
    await sleep(300);
  }
  return false;
}

// --- before anything: both servers up, an empty evaluation ---

if (!CODE) throw new Error('MJSCC_ACCESS_CODE is missing (it comes from backend/.env)');
for (const [what, url] of [
  ['the API', `${API}/health`],
  ['the app', `${APP}/sign-in`],
]) {
  const up = await fetch(url).then((r) => r.ok).catch(() => false);
  if (!up) throw new Error(`${what} isn't running at ${url}`);
}
reset();
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const { defaultBrowserType: _, ...phone } = devices['iPhone 13'];
const errors = [];

async function device(label) {
  const context = await browser.newContext(phone);
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`${label} page error: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(`${label}: ${m.text()}`));
  return { label, context, page };
}
const shot = (d, name) => d.page.screenshot({ path: `${SHOTS}/${d.label}-${name}.png` });

// until the phone has sent every score it's holding (they save in the background)
const drained = (d) =>
  d.page.waitForFunction(
    () => Object.keys(localStorage).filter((k) => k.startsWith('mjscc-unsaved:')).every((k) => JSON.parse(localStorage.getItem(k)).length === 0),
    null,
    { timeout: 120000, polling: 300 },
  );

// the API, as this phone's sign-in sees it
const api = (d, path, body) =>
  d.page.evaluate(
    async ([base, path, body]) => {
      const res = await fetch(`${base}/mjscc${path}`, {
        method: body ? 'POST' : 'GET',
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: res.status, data: res.status === 204 ? null : await res.json().catch(() => null) };
    },
    [API, path, body],
  );

async function signIn(d, name, code) {
  await d.page.goto(`${APP}/sign-in`);
  const inputs = d.page.locator('input');
  await inputs.nth(0).fill(name);
  await inputs.nth(1).fill(code);
  await d.page.getByRole('button', { name: words.signIn }).tap();
}
// the sign-in form's own message (Next.js keeps an empty role="alert" of its own on every page)
const formMessage = (d) => d.page.locator('main [role=alert]').textContent();
const signedInAs = (d) => d.page.locator('main bdi').last().textContent({ timeout: 10000 });

// the number on the card on screen ("12."), and waiting for a given card
const cardNumber = (d) => d.page.locator('.overflow-x-clip span[dir=ltr]').first().textContent({ timeout: 10000 });
const waitCard = (d, n) =>
  d.page.waitForFunction((n) => document.querySelector('.overflow-x-clip span[dir=ltr]')?.textContent === `${n}.`, n, { timeout: 10000 });
// a score square in the nth card on screen
const square = (d, card, value) => d.page.locator('.overflow-x-clip section').nth(card).getByRole('radio', { name: String(value), exact: true });
const isBlue = (loc) => loc.evaluate((el) => el.className.includes('bg-seal'));

// a sideways swipe on the card (dx > 0: the finger moves right)
const swipe = (d, dx) =>
  d.page.evaluate((dx) => {
    const deck = document.querySelector('.overflow-x-clip');
    const touch = (x) => new Touch({ identifier: 1, target: deck, clientX: x, clientY: 400 });
    deck.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(200)], changedTouches: [touch(200)] }));
    deck.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: [touch(200 + dx)] }));
  }, dx);

// what each phone scores (varied, zeros included), so the marks can be checked independently
const plan = {
  A: { THEORY: (s, i) => (s + i) % 4, DRILL: (s, i) => (s + i) % 6, COMMANDING: (s, i) => (s * i + 1) % 6, INSPECTION: (s) => s % 6 },
  B: { THEORY: (s, i) => 3 - ((s * i) % 3), DRILL: (s, i) => 5 - ((s + 2 * i) % 3), COMMANDING: (s, i) => 5 - ((s + i) % 2), INSPECTION: (s) => 5 - (s % 3) },
};

// the user's marking, worked out here on its own: 30/50/20, ×(1 + 5% per inspection point), ≤ 100
function expectedFinal(scores) {
  const sum = (part) => scores.filter((s) => s.part === part).reduce((a, s) => a + s.value, 0);
  const base = 0.3 * (sum('THEORY') / 120) * 100 + 0.5 * (sum('DRILL') / 135) * 100 + 0.2 * (sum('COMMANDING') / 15) * 100;
  return Math.min(100, base * (1 + 0.05 * sum('INSPECTION')));
}
// the page shows one decimal place
const close = (a, b) => Math.abs(a - b) < 0.051;

// --- the parts, through the screens ---

async function theory(d, who, student) {
  await d.page.goto(`${APP}/theory/${student}`);
  await d.page.getByRole('button', { name: words.start }).tap();
  for (let q = 1; q <= 40; q++) {
    await waitCard(d, q);
    if (q === 18 && student === 1) {
      await d.page.waitForFunction(() => document.querySelector('.overflow-x-clip img')?.complete);
      const width = await d.page.locator('.overflow-x-clip img').first().evaluate((el) => el.naturalWidth);
      check(`${d.label}: Q18's answer picture loads from the API`, width > 0, `${width}px wide`);
      if (d.label === 'A') await shot(d, 'theory-picture-answer');
    }
    await square(d, 0, plan[who].THEORY(student, q)).tap();
  }
  await d.page.waitForURL(`${APP}/theory`, { timeout: 10000 });
}

async function drillPair(d, who, [a, b], heading) {
  await d.page.goto(`${APP}/drill`);
  const shown = await d.page.locator('main h2').textContent();
  check(`${d.label}: the drill page's heading counts the groups`, shown === heading, shown);
  await d.page.getByRole('button', { name: NAMES[a - 1] }).tap();
  await d.page.getByRole('button', { name: NAMES[b - 1] }).tap();
  await d.page.waitForURL(`${APP}/drill/${a}-${b}`);
  for (let m = 1; m <= 27; m++) {
    await waitCard(d, m);
    await square(d, 0, plan[who].DRILL(a, m)).tap();
    if (m === 1) {
      await sleep(500);
      check(`${d.label}: a drill movement waits until both students are scored`, (await cardNumber(d)) === '1.');
      if (d.label === 'B') await shot(d, 'drill-pair');
    }
    await square(d, 1, plan[who].DRILL(b, m)).tap();
  }
  await d.page.getByRole('button', { name: words.done }).tap();
  await d.page.waitForURL(`${APP}/drill`);
}

async function commanding(d, who, student, content) {
  await d.page.goto(`${APP}/commanding/${student}`);
  for (let c = 1; c <= 3; c++) {
    await waitCard(d, c);
    const text = (await d.page.locator('.overflow-x-clip section p').nth(1).textContent()).replace(/\s+/g, ' ');
    const drawn = content.students[student - 1].commands[c - 1].replace(/\s+/g, ' ');
    if (!text.includes(drawn)) check(`${d.label}: student ${student}'s command ${c} is the drawn one`, false, text);
    await square(d, 0, plan[who].COMMANDING(student, c)).tap();
  }
  await d.page.waitForURL(`${APP}/commanding`);
}

async function inspection(d, who, student, note) {
  await d.page.goto(`${APP}/inspection/${student}`);
  await d.page.locator('section').first().getByRole('radio', { name: String(plan[who].INSPECTION(student)), exact: true }).tap();
  if (note) await d.page.locator('textarea').fill(note);
  await d.page.getByRole('button', { name: words.done }).tap();
  await d.page.waitForURL(`${APP}/inspection`);
}

// ==================================================================================================

try {
  const A = await device('A'); // Mish'al
  const B = await device('B'); // Ibrysam

  step('signing in');
  await A.page.goto(APP);
  await A.page.waitForURL(`${APP}/sign-in`);
  check('A: opening the app signed out goes to sign-in', true);
  await signIn(A, "Mish'al", 'not-the-code');
  check('A: a wrong code is refused on the form', (await formMessage(A)) === words.wrongCode);
  await signIn(A, 'Someone Else', CODE);
  check('A: a name not on the list is refused on the form', (await formMessage(A)) === words.unknownName);
  await signIn(A, 'mishal', CODE);
  await A.page.waitForURL(`${APP}/`);
  check('A: "mishal" signs in as Mish\'al', (await signedInAs(A)) === "Mish'al");
  await signIn(B, '  IBRYSAM ', CODE.toUpperCase());
  await B.page.waitForURL(`${APP}/`);
  check('B: "IBRYSAM", with the code in capitals, signs in as Ibrysam', (await signedInAs(B)) === 'Ibrysam');
  await A.page.reload();
  check('A: still signed in after a reload', (await signedInAs(A)) === "Mish'al");
  await shot(A, 'home');

  step('the same evaluation on both phones');
  const content = (await api(A, '/content')).data;
  const contentB = (await api(B, '/content')).data;
  check('40 questions, 27 movements, 6 students', content.theory.length === 40 && content.drill.length === 27 && content.students.length === 6);
  check('both phones get the same three commands for every student', JSON.stringify(content.students) === JSON.stringify(contentB.students));
  check('each student has three different commands', content.students.every((s) => new Set(s.commands).size === 3));

  step('theory: all 240 answers on each phone, both at once');
  await Promise.all(
    [
      [A, 'A'],
      [B, 'B'],
    ].map(async ([d, who]) => {
      for (let s = 1; s <= 6; s++) await theory(d, who, s);
      const cards = d.page.locator('main ul li a');
      const blue = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => isBlue(cards.nth(i))));
      check(`${d.label}: every student shows as done on the theory page`, blue.every(Boolean));
    }),
  );

  step('swiping, and changing a score');
  await A.page.goto(`${APP}/theory/1`);
  await A.page.getByRole('button', { name: words.start }).tap();
  await waitCard(A, 1);
  await swipe(A, 150);
  await waitCard(A, 2);
  check('A: a swipe right goes on to the next question', true);
  await swipe(A, -150);
  await waitCard(A, 1);
  check('A: a swipe left goes back', true);
  const before = plan.A.THEORY(1, 1);
  const after = (before + 1) % 4;
  await square(A, 0, after).tap();
  await waitCard(A, 2);
  plan.A.THEORY = ((f) => (s, i) => (s === 1 && i === 1 ? after : f(s, i)))(plan.A.THEORY);
  let q1;
  const changed = await eventually(async () => {
    q1 = (await api(A, '/scores')).data.scores.find((s) => s.student === 1 && s.part === 'THEORY' && s.item === 1);
    return q1?.value === after;
  });
  check('A: the changed score is saved', changed, `${before} → ${q1?.value}`);

  step('Finish too early');
  await drained(B);
  await B.page.goto(APP);
  await B.page.getByRole('button', { name: words.finish }).tap();
  await B.page.getByText(words.notYet).waitFor({ timeout: 15000 });
  const missing = await B.page.locator('main section ul li').count();
  check('B: Finish lists what’s still to score', missing === 18, `${missing} lines: drill, commanding, inspection × 6`);

  step('drill: three pairs on each phone, different pairs');
  await Promise.all([
    (async () => {
      for (const [i, pair] of [[1, 2], [3, 4], [5, 6]].entries()) await drillPair(A, 'A', pair, words.group[i]);
      const shown = await A.page.locator('main h2').textContent();
      check('A: after three pairs, every group is done', shown === words.allGroupsDone, shown);
    })(),
    (async () => {
      for (const [i, pair] of [[2, 5], [1, 6], [3, 4]].entries()) await drillPair(B, 'B', pair, words.group[i]);
    })(),
  ]);

  step('commanding');
  await Promise.all(
    [
      [A, 'A'],
      [B, 'B'],
    ].map(async ([d, who]) => {
      for (let s = 1; s <= 6; s++) await commanding(d, who, s, content);
    }),
  );
  check('both phones show each student the commands drawn for them', true);

  step('inspection, with B losing its connection for a while');
  const noteA = 'ބޫޓު ފޮޅާފައެއް ނުވޭ';
  const noteB = 'Cap badge crooked';
  await Promise.all([
    (async () => {
      for (let s = 1; s <= 6; s++) await inspection(A, 'A', s, s === 1 ? noteA : null);
    })(),
    (async () => {
      await B.page.goto(`${APP}/inspection/1`);
      await B.page.locator('textarea').waitFor();
      await B.context.setOffline(true);
      const mark = B.page.locator('section').first().getByRole('radio', { name: String(plan.B.INSPECTION(1)), exact: true });
      await mark.tap();
      await B.page.locator('textarea').fill(noteB);
      await sleep(2000);
      const banner = await B.page.getByRole('status').textContent({ timeout: 8000 }).catch(() => null);
      check('B: offline, the screen says marks are waiting to save', banner === words.unsaved(2), banner ?? 'no banner');
      check('B: offline, the tapped score still shows', (await mark.getAttribute('aria-checked')) === 'true');
      await shot(B, 'offline');
      const kept = await B.page.evaluate(() => JSON.parse(localStorage.getItem('mjscc-unsaved:Ibrysam') ?? '[]').length);
      check('B: the unsaved mark and note are kept on the phone', kept === 2, `${kept} waiting`);
      // back online, and the page reloaded straight away: what was kept still goes
      await B.context.setOffline(false);
      await B.page.reload();
      const arrived = await eventually(async () => {
        const saved = (await api(B, '/scores')).data;
        return (
          saved.scores.some((s) => s.student === 1 && s.part === 'INSPECTION' && s.value === plan.B.INSPECTION(1)) &&
          saved.notes.some((n) => n.student === 1 && n.text === noteB)
        );
      });
      check('B: after reconnecting and a reload, the mark and note reach the API', arrived);
      check('B: the banner goes once they’re saved', await eventually(async () => (await B.page.getByRole('status').count()) === 0));
      for (let s = 2; s <= 6; s++) await inspection(B, 'B', s, null);
    })(),
  ]);

  step('A finishes first');
  await drained(A);
  await A.page.goto(APP);
  await A.page.getByRole('button', { name: words.finish }).tap();
  await A.page.getByText(words.finished).waitFor({ timeout: 15000 });
  check('A: Finish works once everything is scored', true);
  check('A: home says it’s waiting for Ibrysam', (await A.page.getByText('Ibrysam').count()) > 0);
  await shot(A, 'finished-waiting');
  await A.page.goto(`${APP}/theory/1`);
  await A.page.getByRole('button', { name: words.start }).tap();
  await waitCard(A, 1);
  check('A: after Finish the score squares are locked', await square(A, 0, 0).isDisabled());
  check('A: and the screen says why', (await A.page.getByText(words.locked).count()) === 1);

  const scoresA = (await api(A, '/scores')).data.scores;
  await A.page.goto(`${APP}/students/1`);
  const ownFinal = await A.page.locator('dl dd').last().textContent({ timeout: 10000 });
  const ownExpected = expectedFinal(scoresA.filter((x) => x.student === 1));
  check('A: Maahin’s page shows Mish\'al’s own final, worked out right', close(parseFloat(ownFinal), ownExpected), `${ownFinal} vs ${ownExpected.toFixed(2)}`);
  await shot(A, 'own-marks');
  const early = (await api(B, '/results')).data;
  check('B: before the results are out, B gets nobody else’s marks', !early.open && early.students.every((s) => !s.instructors && !s.average));

  await A.page.goto(APP);
  await A.page.getByRole('button', { name: words.reopen }).tap();
  await A.page.getByRole('button', { name: words.finish }).waitFor({ timeout: 10000 });
  check('A: reopen works while Ibrysam is still going', true);
  await A.page.getByRole('button', { name: words.finish }).tap();
  await A.page.getByText(words.finished).waitFor({ timeout: 15000 });

  step('B finishes: the results are out');
  await drained(B);
  await B.page.goto(APP);
  await B.page.getByRole('button', { name: words.finish }).tap();
  await B.page.getByText(words.finished).waitFor({ timeout: 15000 });
  check('the results are out once both have finished (Malsa and Haneen never came)', (await api(A, '/results')).data.open === true);
  check('no reopen button once they’re out', (await B.page.getByRole('button', { name: words.reopen }).count()) === 0);
  check('the API refuses to reopen', (await api(A, '/reopen', {})).data?.code === 'results_open');

  const scoresB = (await api(B, '/scores')).data.scores;
  for (const d of [A, B]) {
    for (let s = 1; s <= 6; s++) {
      await d.page.goto(`${APP}/students/${s}`);
      const overall = await d.page.locator('p[dir=ltr]').first().textContent({ timeout: 10000 });
      const fa = expectedFinal(scoresA.filter((x) => x.student === s));
      const fb = expectedFinal(scoresB.filter((x) => x.student === s));
      check(`${d.label}: ${NAMES[s - 1]}'s overall is the average of both finals`, close(parseFloat(overall), (fa + fb) / 2), `${overall}: (${fa.toFixed(1)} + ${fb.toFixed(1)}) / 2`);
      if (s !== 1) continue;
      const heads = await d.page.locator('thead th').allTextContents();
      check(`${d.label}: the table has both instructors and the average`, heads.slice(1).join('|') === `Mish'al|Ibrysam|${words.average}`, heads.join('|'));
      await d.page.locator('details').first().evaluate((el) => (el.open = true));
      const rows = await d.page.locator('details').first().locator('tbody tr').count();
      const q1Scores = (await d.page.locator('details').first().locator('tbody tr').first().locator('td').allTextContents()).join(',');
      check(`${d.label}: the theory breakdown lists all 40 with both scores`, rows === 40 && q1Scores === `${plan.A.THEORY(1, 1)},${plan.B.THEORY(1, 1)}`, `${rows} rows, Q1: ${q1Scores}`);
      const page = await d.page.locator('main').textContent();
      check(`${d.label}: both inspection notes show`, page.includes(noteA) && page.includes(noteB));
      if (d.label === 'A') await shot(d, 'results');
    }
  }

  step('someone on the list arrives after the results are out');
  const C = await device('C'); // Malsa
  await signIn(C, 'Malsa', CODE);
  await C.page.waitForURL(`${APP}/`);
  await C.page.goto(`${APP}/theory/2`);
  await C.page.getByRole('button', { name: words.start }).tap();
  await waitCard(C, 1);
  await square(C, 0, 3).tap();
  await C.page.getByText(words.resultsOut).waitFor({ timeout: 10000 }).catch(() => {});
  check('C: a late score is refused, and the screen says the results are out', (await C.page.getByText(words.resultsOut).count()) === 1);
  check('C: the refused score doesn’t stay on screen', (await square(C, 0, 3).getAttribute('aria-checked')) === 'false');
  check('the results stay out for everyone', (await api(A, '/results')).data.open === true);

  step('signing out');
  await A.page.goto(APP);
  await A.page.getByRole('button', { name: words.signOut }).tap();
  await A.page.waitForURL(`${APP}/sign-in`);
  await A.page.goto(`${APP}/students/1`);
  await A.page.waitForURL(`${APP}/sign-in`);
  check('A: signed out, every page goes back to sign-in', true);
  check('A: and the API no longer knows this phone', (await api(A, '/session')).data.instructor === null);

  check('no errors on any phone', errors.length === 0, errors.slice(0, 5).join(' | '));
} catch (error) {
  check('the run got to the end', false, error.message.split('\n')[0]);
} finally {
  await browser.close();
  reset();
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
