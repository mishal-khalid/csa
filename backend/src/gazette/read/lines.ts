// Turns a page's text runs into lines, and a line's runs into text.

import type { Item } from './pdf.js';

export interface Line {
  page: number;
  // the baseline
  y: number;
  // left to right
  items: Item[];
  x0: number;
  x1: number;
  // the size and style most of its letters are set in
  size: number;
  bold: boolean;
  italic: boolean;
  text: string;
}

export const THAANA = /[ހ-޿]/;
const isSpace = (s: string) => s.trim() === '';

// Joins runs that sit on one line, left to right. A space goes in where the file has one, or where
// the gap between two runs is wider than a letter's spacing (justified text often has no space
// characters at all). Dhivehi runs are stored in visual order, right to left with each run's
// letters reversed, so a stretch of them is turned back into reading order.
export function joinItems(items: Item[]): string {
  const sorted = [...items].sort((a, b) => a.x - b.x || a.order - b.order);
  // stretches of Dhivehi (with the spaces between them), and everything else run by run
  const pieces: { thaana: boolean; items: Item[] }[] = [];
  for (const item of sorted) {
    const thaana = THAANA.test(item.str);
    const last = pieces.at(-1);
    if (thaana && last?.thaana) last.items.push(item);
    else if (isSpace(item.str) && last?.thaana) last.items.push(item);
    else pieces.push({ thaana, items: [item] });
  }
  // spaces caught at the end of a Dhivehi stretch belong to the text after it
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    if (!piece.thaana) continue;
    while (piece.items.length > 1 && isSpace(piece.items.at(-1)!.str)) {
      pieces.splice(i + 1, 0, { thaana: false, items: [piece.items.pop()!] });
    }
  }

  let out = '';
  let prevEnd: number | null = null;
  let pendingSpace = false;
  const add = (str: string, start: number, end: number, size: number) => {
    if (prevEnd !== null && !out.endsWith(' ') && (pendingSpace || start - prevEnd > 0.18 * size)) out += ' ';
    out += str;
    prevEnd = end;
    pendingSpace = false;
  };
  for (const piece of pieces) {
    if (!piece.thaana) {
      for (const item of piece.items) {
        if (isSpace(item.str)) {
          pendingSpace = true;
          prevEnd = Math.max(prevEnd ?? item.x, item.x + item.w);
          continue;
        }
        const str = item.str.replace(/\s+/g, ' ');
        if (str.startsWith(' ')) pendingSpace = true;
        add(str.trimStart(), item.x, item.x + item.w, item.size);
        if (str.endsWith(' ')) {
          out = out.trimEnd();
          pendingSpace = true;
        }
      }
      continue;
    }
    // a Dhivehi stretch: read right to left, each run's letters reversed; a space only where the gap
    // between two runs is a real word space (the files carry hairline spaces inside words)
    const runs = piece.items.filter((item) => !isSpace(item.str) || item.w > 0.2 * item.size);
    const start = Math.min(...piece.items.map((i) => i.x));
    const end = Math.max(...piece.items.map((i) => i.x + i.w));
    let word = '';
    for (let i = runs.length - 1; i >= 0; i--) {
      const run = runs[i];
      if (isSpace(run.str)) {
        if (!word.endsWith(' ')) word += ' ';
        continue;
      }
      const next = runs[i + 1];
      if (next && !isSpace(next.str) && next.x - (run.x + run.w) > 0.2 * run.size && !word.endsWith(' ')) word += ' ';
      word += Array.from(run.str).reverse().join('');
    }
    add(word.trim(), start, end, piece.items[0].size);
  }
  return out.replace(/ {2,}/g, ' ').trim();
}

// the size and style that most of the line's letters have
function dominant(items: Item[]) {
  const sizes = new Map<number, number>();
  let bold = 0;
  let italic = 0;
  let total = 0;
  for (const item of items) {
    const n = item.str.replace(/\s/g, '').length;
    if (!n) continue;
    total += n;
    const size = Math.round(item.size * 2) / 2;
    sizes.set(size, (sizes.get(size) ?? 0) + n);
    if (item.bold) bold += n;
    if (item.italic) italic += n;
  }
  let size = items[0]?.size ?? 0;
  let best = -1;
  for (const [s, n] of [...sizes].sort((a, b) => a[0] - b[0])) {
    if (n > best) {
      best = n;
      size = s;
    }
  }
  return { size, bold: total > 0 && bold * 2 > total, italic: total > 0 && italic * 2 > total };
}

export function makeLine(page: number, items: Item[]): Line {
  const sorted = [...items].sort((a, b) => a.x - b.x || a.order - b.order);
  const visible = sorted.filter((i) => !isSpace(i.str));
  const main = [...visible].sort((a, b) => b.str.length - a.str.length || a.order - b.order)[0] ?? sorted[0];
  return {
    page,
    y: main.y,
    items: sorted,
    x0: Math.min(...visible.map((i) => i.x)),
    x1: Math.max(...visible.map((i) => i.x + i.w)),
    ...dominant(visible),
    text: joinItems(sorted),
  };
}

// Groups a page's runs into lines: runs whose baselines are within a third of the type size of each
// other are on one line (a clause label sits a little higher than its text). Top to bottom.
export function groupLines(page: number, items: Item[]): Line[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x || a.order - b.order);
  const groups: { y: number; size: number; items: Item[] }[] = [];
  for (const item of sorted) {
    const last = groups.at(-1);
    if (last && last.y - item.y <= 0.3 * Math.max(last.size, item.size)) {
      last.items.push(item);
      if (!isSpace(item.str)) last.size = Math.max(last.size, item.size);
    } else groups.push({ y: item.y, size: item.size, items: [item] });
  }
  return groups.filter((g) => g.items.some((i) => !isSpace(i.str))).map((g) => makeLine(page, g.items));
}

// The width of a line's first word, from its first run (for telling a wrapped line from a broken one)
export function firstWordWidth(line: Line): number {
  const first = line.items.find((i) => !isSpace(i.str));
  if (!first) return 0;
  const str = first.str.trimStart();
  const word = str.split(/\s/)[0] ?? str;
  return str.length ? (first.w * word.length) / str.length : 0;
}
