// Reading a document's blocks for the rules check: every piece of text in document order, with the
// place it sits ("Article 5 (a)(1)", "point 6 (b)", "Appendix 2, table 1, row 3"), plus the small
// helpers the rules share (dates, labels, ordinals, quoting).

import type { Block, Clause, ListItem } from '../blocks.js';

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// "07 November 2026" or "7 November 2026"
export const DATE_PATTERN = `(\\d{1,2}) (${MONTHS.join('|')}) (\\d{4})`;

// a printed date as YYYY-MM-DD
export function isoDate(day: string, month: string, year: string): string {
  return `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export const isIsoDate = (value: string | undefined): value is string =>
  !!value &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

// curly quotes and apostrophes as straight ones, runs of spaces as one
export const plain = (text: string) =>
  text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

// for comparing titles: no case, no quotes, no closing full stop
export const sameTitle = (a: string, b: string) => {
  const key = (s: string) =>
    plain(s)
      .replace(/["]/g, '')
      .replace(/[.\s]+$/, '')
      .toLowerCase();
  return key(a) === key(b);
};

// Blanks out quoted passages, keeping every other character where it was. A document quoting a
// form ("Article 5 (a)(1) of this Act") or a word ("section") isn't using it.
export function unquoted(text: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  return text
    .replace(/“[^“”]{0,600}”/g, blank)
    .replace(/"[^"\n]{0,600}"/g, blank)
    .replace(/‘[^‘’]{0,300}’(?![A-Za-z])/g, blank);
}

// A short quote (at most 80 characters) of the text around a match.
export function quoteAt(text: string, index: number, length: number): string {
  // spaces for line breaks, one for one, so the index still points at the match
  const flat = text.replace(/\s/g, ' ');
  if (flat.replace(/ +/g, ' ').trim().length <= 80)
    return flat.replace(/ +/g, ' ').trim();
  let start = Math.max(0, index - 20);
  let end = Math.min(flat.length, Math.max(index + length, start + 60) + 10);
  if (end - start > 78) end = start + 78;
  if (index + length > end) {
    end = Math.min(flat.length, index + length);
    start = Math.max(0, end - 78);
  }
  // don't cut words in half
  while (start > 0 && start < index && /\S/.test(flat[start - 1])) start++;
  while (end < flat.length && end > index + length && /\S/.test(flat[end]))
    end--;
  const slice = flat.slice(start, end).replace(/ +/g, ' ').trim();
  return `${start > 0 ? '…' : ''}${slice}${end < flat.length ? '…' : ''}`;
}

export const quote = (text: string) => quoteAt(text, 0, 0);

// The letters of the points of an Article, in order: (a) … (z), then (aa), (ab) … (az), (ba) …
export function letters(n: number): string {
  const letter = (i: number) => String.fromCharCode(97 + i);
  return n < 26 ? letter(n) : letter(Math.floor(n / 26) - 1) + letter(n % 26);
}

// Ordinal words, for Chapters ("Third Chapter") and amendments ("Second Amendment to …").
const UNITS = [
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
  'Ninth',
];
const TEENS = [
  'Tenth',
  'Eleventh',
  'Twelfth',
  'Thirteenth',
  'Fourteenth',
  'Fifteenth',
  'Sixteenth',
  'Seventeenth',
  'Eighteenth',
  'Nineteenth',
];
const TENS = ['Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty'];
const TENTHS = ['Twentieth', 'Thirtieth', 'Fortieth', 'Fiftieth', 'Sixtieth'];

export function ordinal(n: number): string {
  if (n < 10) return UNITS[n - 1];
  if (n < 20) return TEENS[n - 10];
  const tens = Math.floor(n / 10) - 2;
  return n % 10 === 0
    ? TENTHS[tens]
    : `${TENS[tens]}-${UNITS[(n % 10) - 1].toLowerCase()}`;
}

export function ordinalNumber(word: string): number | null {
  for (let n = 1; n <= 69; n++)
    if (ordinal(n).toLowerCase() === word.toLowerCase()) return n;
  return null;
}

const ROMAN: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
export function romanNumber(text: string): number | null {
  if (!/^[IVXLC]+$/.test(text)) return null;
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const value = ROMAN[text[i]];
    total += value < (ROMAN[text[i + 1]] ?? 0) ? -value : value;
  }
  return total;
}

// One piece of a document's text and where it sits.
export interface Segment {
  // order in the document, for sorting what's found
  pos: number;
  where: string;
  text: string;
  // the text with its quotations blanked out (see unquoted)
  clean: string;
  kind:
    | 'heading'
    | 'chapter'
    | 'article-title'
    | 'clause'
    | 'item'
    | 'paragraph'
    | 'reason'
    | 'point'
    | 'point-item'
    | 'point-after'
    | 'list-item'
    | 'cell'
    | 'caption'
    | 'signature';
  // which part it's in: undefined for the document itself, else the index into the appendices
  appendix?: number;
  // the index of its block in that part
  block: number;
  // the Article or Order point it belongs to
  article?: string;
  point?: string;
}

// a numbered point of an Order as read: "5" for "5."
export const pointNumber = (label: string | undefined) =>
  label?.replace(/\.$/, '').trim() ?? '';

// Where the parts of an Order are: its "Whereas:" reasons and its numbered points.
export interface OrderParts {
  // indexes into the blocks
  whereas?: number;
  reasons?: number;
  authority?: number;
  decision?: number;
  points: number[];
}

export function orderParts(blocks: Block[]): OrderParts {
  const parts: OrderParts = { points: [] };
  blocks.forEach((block, i) => {
    if (block.type === 'paragraph') {
      const text = plain(block.text);
      if (parts.whereas === undefined && /^Whereas:?$/i.test(text))
        parts.whereas = i;
      else if (
        parts.authority === undefined &&
        /^Under the authority vested in\b/i.test(text)
      )
        parts.authority = i;
      else if (parts.decision === undefined && /^I, .+?\bhereby\b/.test(text))
        parts.decision = i;
    } else if (block.type === 'list') {
      if (
        parts.whereas !== undefined &&
        parts.reasons === undefined &&
        parts.decision === undefined
      )
        parts.reasons = i;
      else if (parts.decision !== undefined) parts.points.push(i);
    }
  });
  return parts;
}

export interface WalkPart {
  blocks: Block[];
  // index into the appendices, for an appendix
  appendix?: number;
  // "Appendix 2, " in front of every place in it
  prefix: string;
}

// Every piece of text in the parts, in order. `order` marks the document as a President's Order, so
// its numbered lists are read as reasons and points.
export function walk(parts: WalkPart[], order: boolean): Segment[] {
  const segments: Segment[] = [];
  let pos = 0;
  for (const part of parts) {
    const isMain = part.appendix === undefined;
    const orderLayout = order && isMain ? orderParts(part.blocks) : undefined;
    let lastArticle: string | undefined;
    let lastPoint: string | undefined;
    let paragraphs = 0;
    let tables = 0;
    let block = 0;
    const push = (
      seg: Omit<Segment, 'pos' | 'clean' | 'appendix' | 'block'>,
    ) => {
      if (!seg.text) return;
      segments.push({
        ...seg,
        pos: pos++,
        clean: unquoted(seg.text),
        appendix: part.appendix,
        block,
        where: part.prefix + seg.where,
      });
    };
    // where a paragraph sits: after the last Article or point it follows
    const after = () =>
      lastArticle
        ? `paragraph after Article ${lastArticle}`
        : lastPoint
          ? `paragraph after point ${lastPoint}`
          : `paragraph ${paragraphs}`;
    const pushClauses = (
      clauses: Clause[] | undefined,
      base: string,
      article: string | undefined,
      point: string | undefined,
      kind: Segment['kind'],
    ) => {
      for (const clause of clauses ?? []) {
        const where = clause.label ? `${base} ${clause.label}` : base;
        push({ where, text: clause.text ?? '', kind, article, point });
        for (const item of clause.items ?? []) {
          const itemWhere = item.label
            ? `${where}${clause.label ? '' : ' '}${item.label}`
            : where;
          push({
            where: itemWhere,
            text: item.text ?? '',
            kind: kind === 'clause' ? 'item' : kind,
            article,
            point,
          });
          // anything deeper is read as part of its point
          pushClauses(
            item.items,
            itemWhere,
            article,
            point,
            kind === 'clause' ? 'item' : kind,
          );
        }
      }
    };

    part.blocks.forEach((b, i) => {
      block = i;
      const current = b;
      switch (current.type) {
        case 'chapter':
          push({ where: current.text, text: current.text, kind: 'chapter' });
          if (current.subtitle)
            push({
              where: current.text,
              text: current.subtitle,
              kind: 'chapter',
            });
          break;
        case 'heading':
          push({ where: 'heading', text: current.text, kind: 'heading' });
          break;
        case 'article':
          lastArticle = current.number;
          lastPoint = undefined;
          if (current.title)
            push({
              where: `Article ${current.number} (title)`,
              text: current.title,
              kind: 'article-title',
              article: current.number,
            });
          pushClauses(
            current.clauses,
            `Article ${current.number}`,
            current.number,
            undefined,
            'clause',
          );
          break;
        case 'paragraph':
          paragraphs++;
          push({ where: after(), text: current.text, kind: 'paragraph' });
          break;
        case 'list': {
          const isReasons = orderLayout?.reasons === i;
          const isPoints = orderLayout?.points.includes(i);
          for (const item of current.items) {
            const label = pointNumber(item.label);
            if (isReasons) {
              push({
                where: `Whereas, reason ${label}`,
                text: item.text,
                kind: 'reason',
              });
            } else if (isPoints) {
              lastPoint = label;
              lastArticle = undefined;
              push({
                where: `point ${label}`,
                text: item.text,
                kind: 'point',
                point: label,
              });
              pushClauses(
                item.items,
                `point ${label}`,
                undefined,
                label,
                'point-item',
              );
              if (item.after)
                push({
                  where: `point ${label}`,
                  text: item.after,
                  kind: 'point-after',
                  point: label,
                });
            } else {
              const where = lastArticle
                ? `list after Article ${lastArticle}, item ${item.label ?? ''}`
                : `list item ${item.label ?? ''}`;
              push({ where: where.trim(), text: item.text, kind: 'list-item' });
              pushClauses(
                item.items,
                where.trim(),
                undefined,
                undefined,
                'list-item',
              );
              if (item.after)
                push({
                  where: where.trim(),
                  text: item.after,
                  kind: 'list-item',
                });
            }
          }
          break;
        }
        case 'table':
          tables++;
          if (current.caption)
            push({
              where: `table ${tables} (caption)`,
              text: current.caption,
              kind: 'caption',
            });
          (current.columns ?? []).forEach((column, c) =>
            push({
              where: `table ${tables}, heading ${c + 1}`,
              text: column,
              kind: 'cell',
            }),
          );
          current.rows.forEach((row, r) =>
            row.forEach((cell, c) =>
              push({
                where: `table ${tables}, row ${r + 1}, column ${c + 1}`,
                text: cell,
                kind: 'cell',
              }),
            ),
          );
          break;
        case 'signatures':
          for (const item of current.items) {
            push({
              where: 'signatures',
              text: [item.caption, item.name, item.title]
                .filter(Boolean)
                .join('\n'),
              kind: 'signature',
            });
          }
          break;
      }
    });
  }
  return segments;
}

// All the text of some blocks, joined with line breaks.
export function blocksText(blocks: Block[]): string {
  const out: string[] = [];
  const clauses = (list: Clause[] | undefined) =>
    list?.forEach((c) => {
      out.push([c.label, c.text].filter(Boolean).join(' '));
      clauses(c.items);
    });
  const items = (list: ListItem[]) =>
    list.forEach((item) => {
      out.push([item.label, item.text].filter(Boolean).join(' '));
      clauses(item.items);
      if (item.after) out.push(item.after);
    });
  for (const block of blocks) {
    switch (block.type) {
      case 'chapter':
        out.push(block.text, block.subtitle ?? '');
        break;
      case 'heading':
      case 'paragraph':
        out.push(block.text);
        break;
      case 'article':
        out.push(`Article ${block.number} ${block.title ?? ''}`);
        clauses(block.clauses);
        break;
      case 'list':
        items(block.items);
        break;
      case 'table':
        out.push(
          block.caption ?? '',
          ...(block.columns ?? []),
          ...block.rows.flat(),
        );
        break;
      case 'signatures':
        block.items.forEach((s) =>
          out.push(s.caption ?? '', s.name, s.title ?? ''),
        );
        break;
    }
  }
  return out.filter((line) => line.trim()).join('\n');
}
