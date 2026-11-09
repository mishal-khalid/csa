// Reads a PDF's pages as positioned text and the rectangles drawn on them, with pdf.js (through
// unpdf, which runs it without a worker, as serverless functions need). Nothing here guesses: it
// only reports what the file holds, in PDF points with y going up from the bottom of the page.

import { getDocumentProxy, getResolvedPDFJS } from 'unpdf';

export interface Item {
  str: string;
  // the baseline's left end, and the run's width
  x: number;
  y: number;
  w: number;
  size: number;
  font: string;
  bold: boolean;
  italic: boolean;
  // its place in the page's text, to keep ties in order
  order: number;
}

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Page {
  number: number;
  width: number;
  height: number;
  items: Item[];
  // clipping rectangles: Word clips every table cell to its box, borders or not
  clips: Rect[];
  // thin dark filled or stroked rectangles: printed rules and borders
  rules: Rect[];
}

// subset fonts are named "AAAAAE+TimesNewRomanPS-BoldMT"
const baseFont = (name: string) => name.replace(/^[A-Z]{6}\+/, '');

const round = (v: number) => Math.round(v * 100) / 100;

type Matrix = [number, number, number, number, number, number];
const multiply = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];
const apply = (m: Matrix, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

// "#1a1a1a" → its lightness, 0 (black) to 1 (white)
function lightness(color: unknown): number {
  if (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) {
    const v = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  if (Array.isArray(color) && color.length >= 3) return (0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]) / 255;
  return 0;
}

export async function loadPages(bytes: Uint8Array): Promise<Page[]> {
  // pdf.js takes ownership of the buffer it's given, so it gets a copy
  const pdf = await getDocumentProxy(new Uint8Array(bytes), { fontExtraProperties: true });
  const { OPS } = await getResolvedPDFJS();
  const pages: Page[] = [];
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const view = page.getViewport({ scale: 1 });
      // the operator list loads the fonts (so their real names can be read) and holds the drawing
      const ops = await page.getOperatorList();
      const content = await page.getTextContent();

      const fontNames = new Map<string, string>();
      const fontName = (id: string) => {
        if (!fontNames.has(id)) {
          let name = id;
          try {
            name = baseFont(page.commonObjs.get(id)?.name ?? id);
          } catch {
            // a font pdf.js couldn't load keeps its internal id
          }
          fontNames.set(id, name);
        }
        return fontNames.get(id)!;
      };

      const items: Item[] = [];
      content.items.forEach((raw: any, order: number) => {
        if (typeof raw.str !== 'string' || raw.str === '') return;
        const [a, b, c, d, e, f] = raw.transform as number[];
        // only upright text: stamps and watermarks are set at an angle
        if (a <= 0 || Math.abs(b) > 0.01 * a || Math.abs(c) > 0.01 * Math.abs(d)) return;
        const size = Math.hypot(a, b);
        const font = fontName(raw.fontName);
        items.push({
          str: raw.str,
          x: round(e),
          y: round(f),
          w: round(raw.width),
          size: round(size),
          font,
          bold: /bold|black|heavy|semibold|demibold/i.test(font),
          italic: /italic|oblique/i.test(font),
          order,
        });
      });

      // the rectangles: tracked through the graphics state so their place on the page is known
      const clips: Rect[] = [];
      const rules: Rect[] = [];
      let ctm: Matrix = [1, 0, 0, 1, 0, 0];
      let fill: unknown = '#000000';
      let stroke: unknown = '#000000';
      let lineWidth = 1;
      const stack: { ctm: Matrix; fill: unknown; stroke: unknown; lineWidth: number }[] = [];
      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        const args: any = ops.argsArray[i];
        if (fn === OPS.save) stack.push({ ctm, fill, stroke, lineWidth });
        else if (fn === OPS.restore) ({ ctm, fill, stroke, lineWidth } = stack.pop() ?? { ctm, fill, stroke, lineWidth });
        else if (fn === OPS.transform) ctm = multiply(args as Matrix, ctm);
        else if (fn === OPS.setFillRGBColor) fill = args[0];
        else if (fn === OPS.setStrokeRGBColor) stroke = args[0];
        else if (fn === OPS.setLineWidth) lineWidth = args[0];
        else if (fn === OPS.constructPath) {
          const [op, , minMax] = args as [number, unknown, number[] | null];
          if (!minMax || minMax.length < 4 || !minMax.every(Number.isFinite)) continue;
          const [ax, ay] = apply(ctm, minMax[0], minMax[1]);
          const [bx, by] = apply(ctm, minMax[2], minMax[3]);
          const rect = { x0: round(Math.min(ax, bx)), y0: round(Math.min(ay, by)), x1: round(Math.max(ax, bx)), y1: round(Math.max(ay, by)) };
          const w = rect.x1 - rect.x0;
          const h = rect.y1 - rect.y0;
          if (op === OPS.endPath) {
            // a clip; the page's own and anything tiny tell nothing
            if (w < 8 || h < 6 || (w > 0.9 * view.width && h > 0.9 * view.height)) continue;
            clips.push(rect);
          } else if (op === OPS.fill || op === OPS.eoFill) {
            if (lightness(fill) < 0.5 && Math.min(w, h) <= 2.5 && Math.max(w, h) >= 0.4) rules.push(rect);
          } else if (op === OPS.stroke || op === OPS.closeStroke) {
            const half = Math.max(lineWidth, 0.25) / 2;
            const thick = { x0: rect.x0 - (w < 1 ? half : 0), x1: rect.x1 + (w < 1 ? half : 0), y0: rect.y0 - (h < 1 ? half : 0), y1: rect.y1 + (h < 1 ? half : 0) };
            if (lightness(stroke) < 0.5 && Math.min(thick.x1 - thick.x0, thick.y1 - thick.y0) <= 2.5) rules.push(thick);
          }
        }
      }

      pages.push({ number: n, width: round(view.width), height: round(view.height), items, clips: dedupe(clips), rules: dedupe(rules) });
      page.cleanup();
    }
  } finally {
    await pdf.loadingTask.destroy();
  }
  return pages;
}

function dedupe(rects: Rect[]): Rect[] {
  const seen = new Set<string>();
  const out: Rect[] = [];
  for (const r of rects) {
    const key = `${r.x0},${r.y0},${r.x1},${r.y1}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  return out;
}
