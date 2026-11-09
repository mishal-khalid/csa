// Finds tables. Word clips every table cell to its box, so the clipping rectangles (and any printed
// rules) give each table's grid even when it has no borders. Word also uses borderless tables just
// to lay text out (an Article's margin title, number and points; a list's labels), so a grid only
// counts as a table when it holds real columns of text, not a column of labels beside one of text.

import type { Block } from '../blocks.js';
import { firstWordWidth, groupLines, type Line } from './lines.js';
import type { Item, Page, Rect } from './pdf.js';

export const LABEL = /^(\(\s*(?:[a-z]{1,3}|\d{1,3})\s*\)|\d{1,3}\.|[a-z]\.)$/i;

export interface FoundTable {
  page: number;
  top: number;
  bottom: number;
  // the runs it takes out of the running text
  items: Set<Item>;
  block: Extract<Block, { type: 'table' }>;
  columnEdges: number[];
  // the first row has nothing in its first cell: the rest of a row from the page before
  continues: boolean;
}

const touches = (a: Rect, b: Rect, tol = 1.5) =>
  a.x0 <= b.x1 + tol && b.x0 <= a.x1 + tol && a.y0 <= b.y1 + tol && b.y0 <= a.y1 + tol;

// values within `tol` of each other, merged to their mean, sorted
function cluster(values: number[], tol: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const groups: number[][] = [];
  for (const v of sorted) {
    const last = groups.at(-1);
    if (last && v - last.at(-1)! <= tol) last.push(v);
    else groups.push([v]);
  }
  return groups.map((g) => Math.round((g.reduce((s, v) => s + v, 0) / g.length) * 100) / 100);
}

const intervalOf = (edges: number[], v: number) => {
  for (let i = 0; i < edges.length - 1; i++) if (v >= edges[i] - 0.5 && v <= edges[i + 1] + 0.5) return i;
  return -1;
};

// A cell's lines as text: a line that the next line's first word would have fitted after was ended
// on purpose (a new line), otherwise it wrapped (a space).
function cellText(lines: Line[], right: number): string {
  let out = '';
  lines.forEach((line, i) => {
    if (i > 0) {
      const prev = lines[i - 1];
      const room = right - prev.x1;
      // a line ending in a closing bracket before a capital starts the next item of a list in a cell
      const ended = room > firstWordWidth(line) + 0.35 * line.size || (prev.text.endsWith(')') && /^[A-Z]/.test(line.text));
      out += ended ? '\n' : /\p{L}-$/u.test(prev.text) ? '' : ' ';
    }
    out += line.text;
  });
  return out.trim();
}

// `allowed` are the runs of the page's running text (headers, footers and page numbers are out), and
// `top` and `bottom` the edges of its text area.
export function findTables(page: Page, opts: { skipBorderless: boolean; allowed: Set<Item>; top: number; bottom: number }): FoundTable[] {
  const within = (r: Rect) => r.y0 >= opts.bottom - 2 && r.y1 <= opts.top + 2;
  const rects = [...page.clips.filter(within).map((r) => ({ r, rule: false })), ...page.rules.filter(within).map((r) => ({ r, rule: true }))];
  // regions: rectangles that touch, joined
  const parent = rects.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) if (touches(rects[i].r, rects[j].r)) parent[find(i)] = find(j);
  const regions = new Map<number, typeof rects>();
  rects.forEach((rect, i) => {
    const root = find(i);
    if (!regions.has(root)) regions.set(root, []);
    regions.get(root)!.push(rect);
  });

  const found: FoundTable[] = [];
  const ordered = [...regions.values()].sort((a, b) => Math.max(...b.map((x) => x.r.y1)) - Math.max(...a.map((x) => x.r.y1)));
  for (const region of ordered) {
    const ruled = region.filter((x) => x.rule).length >= 2;
    if (opts.skipBorderless && !ruled) continue;
    const box = {
      x0: Math.min(...region.map((x) => x.r.x0)),
      x1: Math.max(...region.map((x) => x.r.x1)),
      y0: Math.min(...region.map((x) => x.r.y0)),
      y1: Math.max(...region.map((x) => x.r.y1)),
    };
    if (box.x1 - box.x0 < 40 || box.y1 - box.y0 < 10) continue;
    const xs = cluster(region.flatMap((x) => [x.r.x0, x.r.x1]), 2.5);
    const ys = cluster(region.flatMap((x) => [x.r.y0, x.r.y1]), 2.5).reverse();
    if (xs.length < 2 || ys.length < 2) continue;

    // the runs inside it, by cell
    const inside = page.items.filter((item) => {
      if (!opts.allowed.has(item)) return false;
      const cx = item.x + item.w / 2;
      const cy = item.y + item.size * 0.3;
      return cx >= box.x0 - 1 && cx <= box.x1 + 1 && cy >= box.y0 - 1 && cy <= box.y1 + 1;
    });
    if (!inside.some((i) => i.str.trim())) continue;
    const cells = new Map<string, Item[]>();
    for (const item of inside) {
      const col = intervalOf(xs, item.x + Math.min(item.w, item.size) / 2);
      const row = intervalOf([...ys].reverse(), item.y + item.size * 0.3);
      if (col < 0 || row < 0) continue;
      const r = ys.length - 2 - row;
      const key = `${r},${col}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key)!.push(item);
    }
    const rowCount = ys.length - 1;
    const colCount = xs.length - 1;
    const grid: { lines: Line[] }[][] = [];
    for (let r = 0; r < rowCount; r++) {
      grid.push([]);
      for (let c = 0; c < colCount; c++) grid[r].push({ lines: groupLines(page.number, cells.get(`${r},${c}`) ?? []) });
    }
    const usedCols = [...Array(colCount).keys()].filter((c) => grid.some((row) => row[c].lines.length));
    const usedRows = [...Array(rowCount).keys()].filter((r) => grid[r].some((cell) => cell.lines.length));
    if (!usedCols.length || !usedRows.length) continue;

    // a column of nothing but labels ("(a)", "1.") lays out a list
    const labelCols = usedCols.filter((c) => {
      const filled = usedRows.map((r) => grid[r][c]).filter((cell) => cell.lines.length);
      return filled.length > 0 && filled.filter((cell) => cell.lines.length === 1 && LABEL.test(cell.lines[0].text)).length >= 0.6 * filled.length;
    });
    const textCols = usedCols.filter((c) => !labelCols.includes(c));
    // an Article: a number column and a column of labels
    const numberCol = usedCols.some((c) =>
      usedRows.every((r) => !grid[r][c].lines.length || /^\d{1,3}$/.test(grid[r][c].lines.map((l) => l.text).join(''))),
    );
    if (textCols.length < 2 && !(textCols.length === 1 && labelCols.length === 0 && ruled && usedRows.length >= 2)) continue;
    // a table's rows hold text side by side; a list's rows hold one label and one piece of text
    if (textCols.length >= 2) {
      const sideBySide = usedRows.filter((r) => usedCols.filter((c) => grid[r][c].lines.length && !LABEL.test(grid[r][c].lines.map((l) => l.text).join(' '))).length >= 2);
      if (sideBySide.length < Math.max(1, 0.5 * usedRows.length)) continue;
    }
    if (labelCols.length && numberCol && textCols.length <= 2) continue;

    const rows = usedRows.map((r) =>
      usedCols.map((c) => {
        const lines = grid[r][c].lines;
        const right = xs[c + 1] - Math.max(0, (lines[0]?.x0 ?? xs[c]) - xs[c]);
        return cellText(lines, right);
      }),
    );
    // a first row with one piece of text across a wider table is its caption; one set all in bold
    // is its header
    const firstRow = usedCols.map((c) => grid[usedRows[0]][c].lines);
    const captioned = rows.length > 1 && usedCols.length > 1 && firstRow.filter((l) => l.length).length === 1 && firstRow[0].length === 1;
    const header = !captioned && rows.length > 1 && firstRow.every((lines) => !lines.length || lines.every((l) => l.bold)) && firstRow.some((l) => l.length);
    const block: FoundTable['block'] = captioned
      ? { type: 'table', caption: rows[0][0], rows: rows.slice(1) }
      : header
        ? { type: 'table', columns: rows[0], rows: rows.slice(1) }
        : { type: 'table', rows };
    found.push({
      page: page.number,
      top: box.y1,
      bottom: box.y0,
      items: new Set(inside),
      block,
      columnEdges: usedCols.map((c) => xs[c]),
      continues: !header && rows[0][0] === '' && rows[0].some((cell) => cell !== ''),
    });
  }
  return found;
}
