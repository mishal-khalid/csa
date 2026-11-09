// Builds a document's blocks from its lines, by rule: where each line starts, what it starts with
// and how far it is from the one before. The same lines always give the same blocks.

import type { Block, Clause, ListItem, Signature } from '../blocks.js';
import { firstWordWidth, joinItems, type Line } from './lines.js';
import type { Item } from './pdf.js';
import { LABEL, type FoundTable } from './tables.js';

export type Element = { kind: 'line'; line: Line } | { kind: 'table'; table: FoundTable };

export interface Layout {
  pageWidth: number;
  // the right edge of the running text, for telling wrapped lines from ended ones
  right: number;
  bodySize: number;
  // the usual distance between two lines of a paragraph, by type size
  pitch: (size: number) => number;
}

export const CHAPTER = /^(?:[A-Z][a-z]+(?:-[a-z]+)? Chapter|Chapter\s+[\dIVXLC]+\b.*)$/;
// Articles are numbered 1, 2, 3 (or I, II, III in the earliest documents)
const ARTICLE_NUMBER = /^(\d{1,3}|[IVXLC]{1,7})$/;
export const ORDER = /^(Director|President)[’'`]s Order Number\s+(\d{1,4}\/\d{4})$/;

const near = (a: number, b: number, tol = 3.5) => Math.abs(a - b) <= tol;
const isSpace = (s: string) => s.trim() === '';

export interface Label {
  label: string;
  labelX: number;
  textX: number;
  rest: Item[];
}

// "(a)", "(1)", "1." at the start of a line, followed by a tab's gap and then text
export function leadingLabel(items: Item[]): Label | null {
  const visible = items.filter((i) => !isSpace(i.str));
  const [first, next] = visible;
  if (!first || !next) return null;
  const label = first.str.trim();
  if (!LABEL.test(label)) return null;
  if (next.x - (first.x + first.w) < 0.8 * first.size) return null;
  return { label, labelX: first.x, textX: next.x, rest: visible.slice(1) };
}

// centred, and bold or larger than the text
export function isHeading(line: Line, layout: Layout): boolean {
  const centre = (line.x0 + line.x1) / 2;
  const width = line.x1 - line.x0;
  return (
    Math.abs(centre - layout.pageWidth / 2) <= Math.max(12, 0.03 * layout.pageWidth) &&
    width < 0.97 * (layout.right - (layout.pageWidth - layout.right)) &&
    (line.bold || line.size >= layout.bodySize + 1.5)
  );
}

// How two lines of the same text join: a blank line where there's a paragraph's gap between them,
// a space where the first was full (the text wrapped), a line break where it ended early.
export function joiner(prev: Line, next: Line, layout: Layout, right = layout.right): string {
  if (prev.page === next.page && prev.y - next.y > 1.35 * layout.pitch(next.size)) return '\n\n';
  const room = right - prev.x1;
  if (room > firstWordWidth(next) + 0.35 * next.size) return '\n';
  // a word broken at its own hyphen ("non-" / "executive") joins up again
  return /\p{L}-$/u.test(prev.text) ? '' : ' ';
}

// joins wrapped lines of a title or heading
export const wrap = (a: string, b: string) => (/\p{L}-$/u.test(a) ? `${a}${b}` : `${a} ${b}`);

interface Entry {
  labelX: number | null;
  textX: number;
  node: Clause & { after?: string };
  target: 'text' | 'after';
  last: Line;
}

// The points of a list or of an Article, nested by where their labels stand: a label in line with
// an open point's label is the next point, one further right is a point under it.
class Points {
  stack: Entry[] = [];
  constructor(
    private root: Clause[],
    private kind: 'list' | 'article',
    private layout: Layout,
  ) {}

  private containerAt(i: number): Clause[] {
    return i === 0 ? this.root : (this.stack[i - 1].node.items ??= []);
  }

  add(label: Label, line: Line) {
    const text = joinItems(label.rest);
    let i = this.stack.length - 1;
    let container = this.root;
    for (; i >= 0; i--) {
      const e = this.stack[i];
      const ex = e.labelX ?? e.textX;
      if (near(ex, label.labelX)) {
        container = this.containerAt(i);
        this.stack.length = i;
        break;
      }
      if (label.labelX > ex + 3) {
        container = e.node.items ??= [];
        this.stack.length = i + 1;
        break;
      }
    }
    if (i < 0) this.stack.length = 0;
    const node: Clause = { label: label.label, text };
    container.push(node);
    this.stack.push({ labelX: label.labelX, textX: label.textX, node, target: 'text', last: line });
  }

  // a line with no label: more of an open point's text, or text after a point's own points
  continue(items: Item[], line: Line): boolean {
    const x0 = items.find((i) => !isSpace(i.str))?.x ?? line.x0;
    const text = joinItems(items);
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const e = this.stack[i];
      if (near(e.textX, x0)) {
        if (i === this.stack.length - 1) {
          // a point's lines run on (the transcriptions never break a point's line), unless there's a
          // paragraph's gap
          const glue = joiner(e.last, line, this.layout) === '\n\n' ? '\n\n' : /\p{L}-$/u.test(e.last.text) ? '' : ' ';
          if (e.target === 'after') e.node.after = `${e.node.after}${glue}${text}`;
          else e.node.text = e.node.text ? `${e.node.text}${glue}${text}` : text;
          e.last = line;
          return true;
        }
        this.stack.length = i + 1;
        if (this.kind === 'list' && i === 0) {
          e.node.after = text;
          e.target = 'after';
          e.last = line;
        } else {
          const node: Clause = { text };
          this.containerAt(i).push(node);
          this.stack[i] = { labelX: null, textX: x0, node, target: 'text', last: line };
        }
        return true;
      }
    }
    return false;
  }

  // an Article's text with no label and nowhere to go: a point of its own
  start(items: Item[], line: Line) {
    const x0 = items.find((i) => !isSpace(i.str))?.x ?? line.x0;
    const node: Clause = { text: joinItems(items) };
    this.root.push(node);
    this.stack = [{ labelX: null, textX: x0, node, target: 'text', last: line }];
  }
}

// Strips the empty label keys, so blocks hold only what was printed
function tidy(clauses: Clause[]): Clause[] {
  return clauses.map((c) => {
    const out: Clause & { after?: string } = {};
    if (c.label) out.label = c.label;
    if (c.text !== undefined) out.text = c.text;
    if (c.items?.length) out.items = tidy(c.items);
    const after = (c as { after?: string }).after;
    if (after) out.after = after;
    return out;
  });
}

export interface ArticleColumns {
  // margin titles stand left of this
  marginLimit: number;
  // the points start at or right of this
  contentStart: number;
}

// An Article's first line: its number, standing between the margin title and the points
export function articleNumber(line: Line, cols?: ArticleColumns): { number: Item; index: number } | null {
  const visible = line.items.filter((i) => !isSpace(i.str));
  for (let i = 0; i < visible.length - 1; i++) {
    const item = visible[i];
    if (!ARTICLE_NUMBER.test(item.str.trim())) continue;
    const next = visible[i + 1];
    if (next.x - (item.x + item.w) < 0.4 * item.size) continue;
    if (cols) {
      if (item.x >= cols.marginLimit - 1 && item.x < cols.contentStart) return { number: item, index: i };
      continue;
    }
    const before = visible.slice(0, i);
    const titled = before.length > 0 && item.x - (before.at(-1)!.x + before.at(-1)!.w) >= 10;
    if (LABEL.test(next.str.trim()) || titled) return { number: item, index: i };
  }
  return null;
}

export interface Parsed {
  blocks: Block[];
  title?: string;
  headings: string[];
}

type ListBlock = Extract<Block, { type: 'list' }>;
type ParagraphBlock = Extract<Block, { type: 'paragraph' }>;
type ChapterBlock = Extract<Block, { type: 'chapter' }>;
type ArticleBlock = Extract<Block, { type: 'article' }>;
type HeadingBlock = Extract<Block, { type: 'heading' }>;

// The document's lines and tables, top to bottom, into blocks. `articles` holds the columns of an
// Act, Regulation or Guideline; without it everything is running text, lists and headings. With
// `skipTitle`, the document's title (its first heading) and its repeats are left out, as the
// transcriptions of Acts leave them out.
export function parse(elements: Element[], layout: Layout, articles: ArticleColumns | null, opts: { skipTitle: boolean }): Parsed {
  const blocks: Block[] = [];
  const headings: string[] = [];
  let title: string | undefined;
  let list: { block: ListBlock; points: Points } | null = null;
  let para: { block: ParagraphBlock; last: Line; x0: number } | null = null;
  let heading: { text: string; last: Line; block?: HeadingBlock } | null = null;
  let chapter: { block: ChapterBlock; last: Line } | null = null;
  let article: { block: ArticleBlock; points: Points; titleLast: Line | null } | null = null;
  let lastTable: FoundTable | null = null;
  let seenContent = false;

  const finishList = () => {
    if (list) list.block.items = tidy(list.block.items as Clause[]) as ListItem[];
    list = null;
  };
  const closeArticle = () => {
    if (article) article.block.clauses = tidy(article.block.clauses);
    article = null;
  };
  const mergeable = (prev: Line, line: Line) =>
    prev.page === line.page && Math.abs(prev.size - line.size) <= 0.6 && prev.bold === line.bold && prev.y - line.y <= 1.5 * line.size;

  const headingLine = (line: Line) => {
    const text = line.text;
    finishList();
    para = null;
    if (articles && CHAPTER.test(text)) {
      closeArticle();
      heading = null;
      const block: ChapterBlock = { type: 'chapter', text };
      blocks.push(block);
      chapter = { block, last: line };
      seenContent = true;
      return;
    }
    if (chapter && !chapter.block.subtitle && chapter.last.page === line.page && chapter.last.y - line.y <= 3.5 * line.size) {
      chapter.block.subtitle = text;
      chapter = null;
      return;
    }
    chapter = null;
    if (heading && mergeable(heading.last, line)) {
      heading.text = wrap(heading.text, text);
      heading.last = line;
      if (heading.block) {
        heading.block.text = heading.text;
        headings[headings.length - 1] = heading.text;
      } else if (!seenContent) title = heading.text;
      return;
    }
    if (opts.skipTitle && title === undefined && !seenContent) {
      title = text;
      heading = { text, last: line };
      return;
    }
    // the title again, at the top of a later page
    if (opts.skipTitle && title !== undefined && title.startsWith(text)) {
      heading = { text, last: line };
      return;
    }
    closeArticle();
    const block: HeadingBlock = { type: 'heading', text };
    blocks.push(block);
    headings.push(text);
    heading = { text, last: line, block };
  };

  const flowLine = (line: Line) => {
    const label = leadingLabel(line.items);
    if (!label && isHeading(line, layout)) return headingLine(line);
    heading = null;
    chapter = null;
    seenContent = true;
    closeArticle();
    if (label) {
      para = null;
      if (!list) {
        const block: ListBlock = { type: 'list', items: [] };
        blocks.push(block);
        list = { block, points: new Points(block.items as Clause[], 'list', layout) };
      }
      list.points.add(label, line);
      return;
    }
    if (list) {
      if (list.points.continue(line.items, line)) return;
      finishList();
    }
    if (
      para &&
      Math.abs(para.last.size - line.size) <= 0.6 &&
      para.last.bold === line.bold &&
      ((para.last.page === line.page && para.last.y - line.y <= 1.35 * layout.pitch(line.size)) ||
        (para.last.page !== line.page && near(para.x0, line.x0, 6)))
    ) {
      para.block.text += `${joiner(para.last, line, layout)}${line.text}`;
      para.last = line;
      return;
    }
    const block: ParagraphBlock = { type: 'paragraph', text: line.text };
    blocks.push(block);
    para = { block, last: line, x0: line.x0 };
  };

  for (const el of elements) {
    if (el.kind === 'table') {
      finishList();
      para = null;
      heading = null;
      chapter = null;
      closeArticle();
      const prev = blocks.at(-1);
      // a table carried over from the page before
      if (prev?.type === 'table' && lastTable && prev === lastTable.block && el.table.page === lastTable.page + 1 && el.table.columnEdges.length === lastTable.columnEdges.length) {
        const rows = el.table.block.columns ? [el.table.block.columns, ...el.table.block.rows] : [...el.table.block.rows];
        if (el.table.continues && rows.length && prev.rows.length) {
          const first = rows.shift()!;
          const last = prev.rows.at(-1)!;
          first.forEach((cell, i) => {
            if (cell) last[i] = last[i] ? `${last[i]}\n${cell}` : cell;
          });
        }
        prev.rows.push(...rows);
        lastTable = { ...el.table, block: prev };
        continue;
      }
      blocks.push(el.table.block);
      lastTable = el.table;
      seenContent = true;
      continue;
    }
    const line = el.line;
    if (!articles) {
      flowLine(line);
      continue;
    }

    // an Act, Regulation or Guideline
    const found = articleNumber(line, articles);
    const visible = line.items.filter((i) => !isSpace(i.str));
    const margin = visible.filter((i) => i.x < articles.marginLimit && (!found || i !== found.number));
    const content = visible.filter((i) => i.x >= articles.contentStart - 1 && (!found || i !== found.number));
    if (found) {
      finishList();
      para = null;
      heading = null;
      chapter = null;
      closeArticle();
      const block: ArticleBlock = { type: 'article', number: found.number.str.trim(), clauses: [] };
      if (margin.length) block.title = joinItems(margin);
      blocks.push(block);
      article = { block, points: new Points(block.clauses, 'article', layout), titleLast: margin.length ? line : null };
      seenContent = true;
      if (content.length) {
        const label = leadingLabel(content);
        if (label) article.points.add(label, line);
        else article.points.start(content, line);
      }
      continue;
    }
    if (!leadingLabel(line.items) && isHeading(line, layout)) {
      flowLine(line);
      continue;
    }
    if (article && margin.length + content.length === visible.length) {
      if (margin.length) {
        const last = article.titleLast;
        if (last && last.page === line.page && last.y - line.y <= 2.2 * line.size) {
          article.block.title = article.block.title ? wrap(article.block.title, joinItems(margin)) : joinItems(margin);
          article.titleLast = line;
        } else if (!content.length) {
          // margin text that isn't the Article's title: the Article has ended
          closeArticle();
          flowLine(line);
          continue;
        }
      }
      if (content.length) {
        const label = leadingLabel(content);
        if (label) article.points.add(label, line);
        else if (!article.points.continue(content, line)) article.points.start(content, line);
      }
      continue;
    }
    flowLine(line);
  }
  closeArticle();
  finishList();
  return { blocks, title, headings };
}

// The signatures at the end: a few short lines set apart from the text above them. An italic first
// line ("Signature of the director") is the caption, then the name, then the title.
export function trailingSignatures(elements: Element[], layout: Layout): { start: number; block: Extract<Block, { type: 'signatures' }> } | null {
  const width = layout.right - (layout.pageWidth - layout.right);
  const group: Line[] = [];
  let i = elements.length - 1;
  for (; i >= 0 && group.length < 6; i--) {
    const el = elements[i];
    if (el.kind !== 'line') break;
    const line = el.line;
    if (leadingLabel(line.items) || line.x1 - line.x0 > 0.5 * width) break;
    const below = group[0];
    if (below && (below.page !== line.page || line.y - below.y > 2.6 * line.size)) break;
    group.unshift(line);
  }
  if (!group.length || i < 0) return null;
  const above = elements[i];
  if (above.kind === 'line' && above.line.page === group[0].page && above.line.y - group[0].y < 2 * layout.pitch(group[0].size)) return null;

  // side-by-side signatures are separate columns
  const columns: Line[][] = [];
  for (const line of [...group].sort((a, b) => a.x0 - b.x0 || b.y - a.y)) {
    const col = columns.find((c) => Math.abs(c[0].x0 - line.x0) < 100);
    if (col) col.push(line);
    else columns.push([line]);
  }
  const items: Signature[] = columns.map((col) => {
    const lines = col.sort((a, b) => b.y - a.y);
    const sig: Partial<Signature> = {};
    if (lines.length > 1 && (lines[0].italic || /^signature|^signed/i.test(lines[0].text))) sig.caption = lines.shift()!.text;
    sig.name = lines.shift()?.text ?? '';
    if (lines.length) sig.title = lines.map((l) => l.text).join('\n');
    return sig as Signature;
  });
  return { start: i + 1, block: { type: 'signatures', items } };
}
