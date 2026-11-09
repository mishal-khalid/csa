// Reads a document submitted to the Gazette: its type, number, title and issuing body where the
// file shows them, and its full text as the website's blocks. Everything is decided by fixed rules
// over the PDF's own text and layout (no AI), so the same file always reads the same way. What the
// rules can't settle is listed in `notes` for the person checking it.

import type { Block } from '../blocks.js';
import { parseSeriesNumber } from '../types.js';
import { groupLines, THAANA, type Line } from './lines.js';
import { loadPages, type Item, type Page } from './pdf.js';
import { articleNumber, ORDER, parse, trailingSignatures, type ArticleColumns, type Element, type Layout } from './structure.js';
import { findTables, LABEL } from './tables.js';

export interface ReadNote {
  page?: number;
  message: string;
}

export interface ReadResult {
  pages: number;
  fields: {
    type?: 'act' | 'order' | 'regulation' | 'guideline' | 'notice';
    docNumber?: string;
    title?: string;
    issuingBody?: string;
    language: 'en' | 'dv';
    hasCover: boolean;
  };
  blocks: Block[];
  notes: ReadNote[];
}

export interface AppendixResult {
  number?: number;
  title?: string;
  firstPageText: string;
  blocks: Block[];
  notes: ReadNote[];
}

type DocType = NonNullable<ReadResult['fields']['type']>;

// the running header and footer: Word puts them in the top and bottom margins
const HEADER_ZONE = 62;
const FOOTER_ZONE = 50;
// a letterhead line naming the CSA or its seat: "Continental Security Agency", "Washington, D.C."
const LETTERHEAD = /^(the )?(continental security agency|washington,? d\.?\s?c\.?|united states( of america)?|usa|new york( city)?(, new york)?|(the )?(president|director)[’']s office)[,.]?$/i;
const COVER_NUMBER = /^(Issue Number|Act Number|President[’']s Order(?: Number)?|Director[’']s Order(?: Number)?|Regulation Number|Guideline Number)\s*:\s*(.+)$/;

const centred = (line: Line, page: Page) => Math.abs((line.x0 + line.x1) / 2 - page.width / 2) <= 30;

interface Prepared {
  pages: Page[];
  hasCover: boolean;
  cover: { type?: DocType; docNumber?: string; title?: string };
  // per page, the lines left once headers, footers, page numbers and contents lists are out
  lines: Line[][];
  // the first page's header lines (an Appendix's number is there)
  firstHeader: Line[];
  // the letterhead lines found at the top of pages, the first one first
  letterheads: Line[][];
  notes: ReadNote[];
}

async function prepare(bytes: Uint8Array): Promise<Prepared> {
  const pages = await loadPages(bytes);
  const notes: ReadNote[] = [];
  const out: Prepared = { pages, hasCover: false, cover: {}, lines: [], firstHeader: [], letterheads: [], notes };

  pages.forEach((page, index) => {
    // hidden text (1-point contents anchors) never shows
    const items = page.items.filter((i) => i.size >= 3);
    let lines = groupLines(page.number, items);

    // a Gazette cover already on the first page: the large "CSA Gazette" masthead (72 pt on the
    // template) with the Volume and Number strip. A page's small running header ("Volume: 2
    // Number: 14 ... CSA Gazette") isn't one.
    if (index === 0) {
      const text = lines.map((l) => l.text).join('\n');
      const masthead = lines.some((l) => /CSA Gazette/.test(l.text) && l.size >= 30);
      if (masthead && /Volume\s*:/.test(text) && /Number\s*:/.test(text)) {
        out.hasCover = true;
        const numberAt = lines.findIndex((l) => COVER_NUMBER.test(l.text));
        if (numberAt >= 0) {
          const [, label, value] = COVER_NUMBER.exec(lines[numberAt].text)!;
          const type: DocType | undefined = label.startsWith('Act')
            ? 'act'
            : /Order/.test(label)
              ? 'order'
              : label.startsWith('Regulation')
                ? 'regulation'
                : label.startsWith('Guideline')
                  ? 'guideline'
                  : undefined;
          if (type) out.cover.type = type;
          if (/^([RG]-)?\d{1,4}\/\d{4}$/.test(value.trim())) out.cover.docNumber = value.trim();
          // the title is the largest line under the number
          const below = lines.slice(numberAt + 1).filter((l) => !/:/.test(l.text) && centred(l, page));
          const largest = [...below].sort((a, b) => b.size - a.size || b.y - a.y)[0];
          if (largest) out.cover.title = largest.text;
        }
        out.lines.push([]);
        return;
      }
    }

    const header = lines.filter((l) => l.y > page.height - HEADER_ZONE);
    if (index === 0) out.firstHeader = header;
    lines = lines.filter((l) => l.y <= page.height - HEADER_ZONE && l.y >= FOOTER_ZONE);
    // a Gazette running header anywhere
    lines = lines.filter((l) => !(/Volume\s*:/.test(l.text) && /Number\s*:/.test(l.text)));
    // page numbers: a lone number centred at the top or bottom
    const pageNumber = (l: Line | undefined) => l && /^(-\s*)?\d{1,3}(\s*-)?$|^Page \d{1,3}( of \d{1,3})?$/i.test(l.text) && centred(l, page);
    if (pageNumber(lines[0])) lines.shift();
    if (pageNumber(lines.at(-1))) lines.pop();
    // contents lists
    lines = lines.filter((l) => !/\.{6,}|…{3,}/.test(l.text) && !/^(table of )?contents$/i.test(l.text.trim()));

    // a letterhead at the top of the page: up to four short lines naming the CSA and its seat
    let take = 0;
    for (let i = 0; i < Math.min(4, lines.length); i++) {
      const line = lines[i];
      const prev = lines[i - 1];
      if (prev && prev.y - line.y > 2.4 * Math.max(prev.size, line.size)) break;
      if (line.x1 - line.x0 > 0.6 * page.width || line.size > 14 || LABEL.test(line.text)) break;
      const upper = line.text === line.text.toUpperCase();
      if (!(line.bold || upper)) break;
      // a letterhead stands at the left margin (or is set in capitals); centred bold lines are titles
      if (!upper && Math.abs((line.x0 + line.x1) / 2 - page.width / 2) < 12) break;
      take = i + 1;
    }
    if (take >= 2 && lines.slice(0, take).some((l) => LETTERHEAD.test(l.text))) {
      // the letterhead ends at its last line naming the CSA or its seat
      let end = take;
      while (end > 0 && !LETTERHEAD.test(lines[end - 1].text)) end--;
      out.letterheads.push(lines.slice(0, end));
      lines = lines.slice(end);
    }
    out.lines.push(lines);
  });

  const all = out.lines.flat();
  const thaana = all.reduce((n, l) => n + (l.text.match(new RegExp(THAANA.source, 'g'))?.length ?? 0), 0);
  const latin = all.reduce((n, l) => n + (l.text.match(/[A-Za-z]/g)?.length ?? 0), 0);
  const legacy = pages.some((p) => p.items.some((i) => i.font.startsWith('A_')));
  if (legacy) notes.push({ message: 'The Dhivehi text is set in a legacy font (A_Faruma or similar) whose letters can’t be read from the file. Check the whole text against the PDF.' });
  else if (thaana > latin) notes.push({ message: 'This is a Dhivehi document. Its text was read right to left; check it against the PDF.' });
  return out;
}

// The text's measurements: the usual type size, line spacing and right edge
function measure(lines: Line[], pageWidth: number): Layout {
  const sizes = new Map<number, number>();
  for (const l of lines) sizes.set(l.size, (sizes.get(l.size) ?? 0) + l.text.length);
  const bodySize = [...sizes].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 11;
  const gaps = new Map<number, Map<number, number>>();
  for (let i = 1; i < lines.length; i++) {
    const a = lines[i - 1];
    const b = lines[i];
    if (a.page !== b.page || Math.abs(a.size - b.size) > 0.3) continue;
    const gap = a.y - b.y;
    if (gap < 0.9 * b.size || gap > 2 * b.size) continue;
    const bySize = gaps.get(b.size) ?? new Map<number, number>();
    const key = Math.round(gap * 2) / 2;
    bySize.set(key, (bySize.get(key) ?? 0) + 1);
    gaps.set(b.size, bySize);
  }
  const pitches = new Map<number, number>();
  for (const [size, counts] of gaps) pitches.set(size, [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]);
  const long = lines.filter((l) => l.text.length >= 30).map((l) => l.x1);
  const right = long.length ? Math.max(...long) : pageWidth - 72;
  return {
    pageWidth,
    right,
    bodySize,
    pitch: (size) => pitches.get(size) ?? 1.3 * size,
  };
}

// The columns of an Act, Regulation or Guideline, if the text is laid out in Articles: a number in
// its own column with the first point ("(a)") or the margin title beside it, on at least two lines
function articleColumns(lines: Line[]): ArticleColumns | null {
  const found = lines.map((l) => ({ l, a: articleNumber(l) })).filter((x) => x.a);
  if (found.length < 2) return null;
  const numbers = found.map((x) => x.a!.number.x);
  const firsts = found.map((x) => x.l.items.filter((i) => i.str.trim())[x.a!.index + 1].x);
  return { marginLimit: Math.min(...numbers) - 2, contentStart: Math.min(...firsts) - 2 };
}

// Puts each page's tables in among its lines, top to bottom
function elementsOf(prepared: Prepared, articles: ArticleColumns | null): Element[] {
  const elements: Element[] = [];
  prepared.pages.forEach((page, index) => {
    const lines = prepared.lines[index];
    if (!lines.length) return;
    const allowed = new Set<Item>(lines.flatMap((l) => l.items));
    const tables = findTables(page, { skipBorderless: articles !== null, allowed, top: page.height - HEADER_ZONE, bottom: FOOTER_ZONE });
    const taken = new Set<Item>();
    for (const t of tables) for (const item of t.items) taken.add(item);
    const free: Element[] = [];
    for (const line of lines) {
      const rest = line.items.filter((i) => !taken.has(i));
      if (rest.length === line.items.length) free.push({ kind: 'line', line });
      else if (rest.some((i) => i.str.trim())) {
        // part of the line is in a table: keep the part outside it
        const [kept] = groupLines(page.number, rest);
        if (kept) free.push({ kind: 'line', line: kept });
      }
    }
    // a short line just above a table, in capitals or bold, is its caption
    for (const t of tables) {
      const at = free.findIndex((el) => el.kind === 'line' && el.line.y > t.top && el.line.y - t.top < 3 * el.line.size);
      const el = free[at];
      if (el?.kind === 'line' && el.line.text.length <= 60 && (el.line.bold || (/[A-Z]/.test(el.line.text) && el.line.text === el.line.text.toUpperCase())) && !LABEL.test(el.line.text)) {
        // only if nothing else sits between the caption and the table
        const between = free.filter((e) => e.kind === 'line' && e.line.y < el.line.y && e.line.y > t.top);
        if (!between.length) {
          t.block.caption = el.line.text;
          free.splice(at, 1);
        }
      }
    }
    const placed: Element[] = [...free, ...tables.map((table) => ({ kind: 'table' as const, table }))];
    const yOf = (el: Element) => (el.kind === 'line' ? el.line.y : el.table.top);
    placed.sort((a, b) => yOf(b) - yOf(a) || (a.kind === 'table' ? -1 : 1));
    elements.push(...placed);
  });
  return elements;
}

// the document's type from what it calls itself in its own text ("this Act", "this Regulation")
function typeFromText(text: string): DocType | undefined {
  const counts: Record<string, number> = {};
  for (const m of text.matchAll(/\bthis (Act|Regulation|Guideline|Policy|Order|Notice)\b/g)) counts[m[1]] = (counts[m[1]] ?? 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  return top === 'Act'
    ? 'act'
    : top === 'Regulation'
      ? 'regulation'
      : top === 'Guideline' || top === 'Policy'
        ? 'guideline'
        : top === 'Order'
          ? 'order'
          : top === 'Notice'
            ? 'notice'
            : undefined;
}

function noteTables(blocks: Block[], notes: ReadNote[]) {
  const tables = blocks.filter((b) => b.type === 'table');
  if (tables.length) notes.push({ message: `${tables.length === 1 ? 'A table was' : `${tables.length} tables were`} read from the layout. Check each table’s cells against the PDF.` });
}

function textOf(blocks: Block[]): string {
  return JSON.stringify(blocks);
}

export async function readDocument(pdf: Uint8Array): Promise<ReadResult> {
  const prepared = await prepare(pdf);
  const { pages, notes } = prepared;
  const lines = prepared.lines.flat();
  const pageWidth = pages[0]?.width ?? 595;
  const layout = measure(lines, pageWidth);
  const fields: ReadResult['fields'] = { language: 'en', hasCover: prepared.hasCover };
  const legacyOrThaana = notes.some((n) => /Dhivehi/.test(n.message));
  if (legacyOrThaana) fields.language = 'dv';

  const first = lines[0];
  const order = first ? ORDER.exec(first.text) : null;
  const articles = order ? null : articleColumns(lines);
  let elements = elementsOf(prepared, articles);
  const signatures = trailingSignatures(elements, layout);
  if (signatures) elements = elements.slice(0, signatures.start);
  const parsed = parse(elements, layout, articles, { skipTitle: articles !== null });
  const blocks = parsed.blocks;
  if (signatures) blocks.push(signatures.block);

  const letterhead = prepared.letterheads[0];
  if (letterhead?.length) fields.issuingBody = letterhead[0].text;

  if (order) {
    fields.type = 'order';
    fields.docNumber = order[2];
    fields.title = parsed.headings[1];
    // the office it was issued at: "This Order was issued on … at The Director's Office, Washington, D.C."
    const issued = blocks.find((b) => b.type === 'paragraph' && b.text.startsWith('This Order was issued on '));
    const at = issued?.type === 'paragraph' ? / at (.+?)(?:,|\.$)/.exec(issued.text) : null;
    if (at) fields.issuingBody = at[1].trim();
  } else {
    const text = textOf(blocks);
    fields.type = prepared.cover.type ?? typeFromText(text);
    fields.title = prepared.cover.title ?? parsed.title ?? parsed.headings[0];
    fields.docNumber = prepared.cover.docNumber;
    // a number printed near the top: "Act Number 3/2026", "Regulation Number R-1/2026"
    const top = lines.slice(0, 12).map((l) => l.text);
    for (const line of top) {
      const m = /\b(Act|Regulation|Guideline) Number:?\s+(([RG]-)?\d{1,4}\/\d{4})\b/.exec(line);
      if (m && !fields.docNumber) {
        fields.docNumber = m[2];
        fields.type ??= m[1].toLowerCase() as DocType;
      }
    }
    if (!fields.docNumber && fields.type && fields.type !== 'notice') {
      const series = text.match(/\b[RG]-\d{1,4}\/\d{4}\b/);
      if (series && parseSeriesNumber(fields.type, series[0])) fields.docNumber = series[0];
    }
    // a Notice's own reference number, printed under the letterhead
    if (!articles && !fields.docNumber) {
      for (const line of top.slice(0, 4)) {
        const ref = /^(?:Ref(?:erence)?\.?(?:\s*No\.?)?|No\.|Number)\s*:?\s*(\S.*)$/i.exec(line) ?? /^([A-Z]{2,}[\w()-]*(?:\/[\w()-]+){2,})$/.exec(line);
        if (ref) {
          fields.docNumber = ref[1].trim();
          fields.type ??= 'notice';
          break;
        }
      }
    }
  }
  if (fields.type && fields.docNumber && fields.type !== 'notice' && !parseSeriesNumber(fields.type, fields.docNumber)) {
    notes.push({ message: `The number “${fields.docNumber}” isn’t in the form its type uses; check it.` });
  }
  if (!fields.title) notes.push({ message: 'No title could be found in the document.' });
  if (!fields.type) notes.push({ message: 'The type of document could not be told from its text.' });
  if (fields.type && fields.type !== 'order' && fields.type !== 'notice' && !fields.docNumber) {
    notes.push({ message: 'The document doesn’t print its number; the Gazette Office assigns it.' });
  }
  if (!blocks.length) notes.push({ message: 'No text could be read from the file. It may be a scan; the text has to be entered by hand.' });
  noteTables(blocks, notes);
  return { pages: pages.length, fields, blocks, notes };
}

export async function readAppendix(pdf: Uint8Array): Promise<AppendixResult> {
  const prepared = await prepare(pdf);
  const { pages, notes } = prepared;
  const lines = prepared.lines.flat();
  const layout = measure(lines, pages[0]?.width ?? 595);
  const headerText = prepared.firstHeader.map((l) => l.text).join('\n');
  const firstPageText = [...prepared.firstHeader, ...(prepared.letterheads[0] ?? []), ...prepared.lines[0]].map((l) => l.text).join('\n');
  const numberMatch = /\bAppendix\s+(\d{1,3})\b/i.exec(headerText) ?? /^Appendix\s+(\d{1,3})\b/im.exec(firstPageText);

  let elements = elementsOf(prepared, null);
  const signatures = trailingSignatures(elements, layout);
  if (signatures) elements = elements.slice(0, signatures.start);
  const parsed = parse(elements, layout, null, { skipTitle: false });
  const blocks: Block[] = [];
  const number = numberMatch ? Number(numberMatch[1]) : undefined;
  const printed = parsed.blocks[0]?.type === 'heading' && /^Appendix\s+\d+$/i.test(parsed.blocks[0].text);
  if (number !== undefined && !printed) blocks.push({ type: 'heading', text: `Appendix ${number}` });
  blocks.push(...parsed.blocks);
  if (signatures) blocks.push(signatures.block);
  if (number === undefined) notes.push({ message: 'The Appendix number could not be found in its first page’s header.' });
  noteTables(blocks, notes);
  return { number, title: parsed.headings.find((h) => !/^Appendix\s+\d+$/i.test(h)), firstPageText, blocks, notes };
}
