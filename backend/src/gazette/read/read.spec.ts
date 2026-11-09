// Reads the user's real Gazette files and compares the result with the hand transcriptions on the
// website. The files live outside the repository, so each test is skipped where they aren't there.

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Block } from '../blocks.js';
import { readAppendix, readDocument } from './index.js';

const CSA = join(homedir(), 'Downloads/Projects/The CSA File');
const G214 = join(CSA, 'Documents/G2-14 ');
// the hand transcriptions, as loaded into the Gazette Register
const SEED = join(__dirname, '../../../scripts/gazette-seed.json');

const bytes = (path: string) => new Uint8Array(readFileSync(path));
const expected = (index: string): Block[] =>
  (JSON.parse(readFileSync(SEED, 'utf8')) as { legacyIndex: string; blocks: Block[] }[]).find((doc) => doc.legacyIndex === index)!.blocks;

// null and missing keys are the same thing in the hand transcriptions
const normal = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(normal)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .filter(([, v]) => v !== null && v !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, normal(v)]),
        )
      : value;
const same = (a: unknown, b: unknown) => JSON.stringify(normal(a)) === JSON.stringify(normal(b));

// How many of the expected blocks were read exactly, and the first few that weren't
export function compare(got: Block[], want: Block[]) {
  let exact = 0;
  const misses: string[] = [];
  const used = new Set<number>();
  want.forEach((w, i) => {
    const at = got.findIndex((g, j) => !used.has(j) && same(g, w));
    if (at >= 0) {
      used.add(at);
      exact++;
    } else if (misses.length < 6) {
      misses.push(`#${i} ${JSON.stringify(normal(w)).slice(0, 220)}\n   got ${JSON.stringify(normal(got[i]) ?? null).slice(0, 220)}`);
    }
  });
  return { exact, of: want.length, got: got.length, misses };
}

const has = (path: string) => (existsSync(path) ? it : it.skip);

describe('reading Gazette PDFs', () => {
  const order = join(CSA, 'Gazette/2026/DO/DO_01_2026.pdf');
  has(order)("reads Director's Order Number 01/2026 exactly", async () => {
    const result = await readDocument(bytes(order));
    expect(result.fields).toMatchObject({ type: 'order', docNumber: '01/2026', title: 'Establishment of the Continental Security Agency Gazette', hasCover: false, language: 'en' });
    const report = compare(result.blocks, expected('2026110702'));
    console.log('DO 01/2026', report.exact, '/', report.of, 'got', report.got, report.misses.join('\n'));
    expect(report.exact).toBe(report.of);
    expect(result.blocks.length).toBe(report.of);
  });

  const act = join(G214, 'g2-14_26 main.pdf');
  has(act)('reads the Public Bonds Companies Act', async () => {
    const started = performance.now();
    const result = await readDocument(bytes(act));
    const ms = performance.now() - started;
    expect(result.fields).toMatchObject({ type: 'act', title: 'Public Bonds Companies Act', issuingBody: 'Department of Economy and Trade', hasCover: true, docNumber: '2/2026' });
    // the hand transcription runs on into the appendices, which are separate files here
    const want = expected('2026110701');
    const main = want.slice(0, want.findIndex((b) => b.type === 'heading' && b.text === 'Appendix 1'));
    const report = compare(result.blocks, main);
    console.log('Act', report.exact, '/', report.of, 'got', report.got, `${Math.round(ms)} ms`, report.misses.join('\n'));
    expect(result.blocks.filter((b) => b.type === 'article')).toHaveLength(73);
    expect(result.blocks.filter((b) => b.type === 'chapter')).toHaveLength(14);
    expect(report.exact).toBe(report.of);
    expect(ms).toBeLessThan(3000);
  });

  const appendices = ['g2-14 apdx1.pdf', 'g2-14 apdx 2.pdf', 'g2-14 apdx 3.pdf', 'g2-14 apdx 4.pdf'].map((f) => join(G214, f));
  has(appendices[0])("reads the Act's appendices", async () => {
    const want = expected('2026110701');
    const starts = want.map((b, i) => (b.type === 'heading' && /^Appendix \d$/.test(b.text) ? i : -1)).filter((i) => i >= 0);
    for (const [n, file] of appendices.entries()) {
      const result = await readAppendix(bytes(file));
      const slice = want.slice(starts[n], starts[n + 1] ?? want.length);
      const report = compare(result.blocks, slice);
      console.log(`Appendix ${n + 1}`, result.number, JSON.stringify(result.title), report.exact, '/', report.of, 'got', report.got, report.misses.join('\n'));
      expect(result.number).toBe(n + 1);
    }
  });

  const framework = join(CSA, "Gazette/2026/V1-N1 GZT_G1-2026 TDO Structural Framework of The Director's Office.pdf");
  has(framework)('reads the Structural Framework', async () => {
    const result = await readDocument(bytes(framework));
    const report = compare(result.blocks, expected('2026010101'));
    console.log('Framework', JSON.stringify(result.fields), report.exact, '/', report.of, 'got', report.got, report.misses.join('\n'));
    expect(result.fields.hasCover).toBe(true);
  });

  has(order)('reads the same file the same way every time', async () => {
    const a = await readDocument(bytes(order));
    const b = await readDocument(bytes(order));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('a document that keeps its running header but has no cover', () => {
  const main = join(homedir(), 'Downloads/Projects/The CSA File/Documents/G2-14 /g2-14_26 main.pdf');
  it.skipIf(!existsSync(main))('isn’t taken for one with a cover', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(bytes(main));
    doc.removePage(0);
    const result = await readDocument(await doc.save());
    expect(result.fields.hasCover).toBe(false);
    expect(result.fields).toMatchObject({ type: 'act', title: 'Public Bonds Companies Act', issuingBody: 'Department of Economy and Trade' });
  });
});
