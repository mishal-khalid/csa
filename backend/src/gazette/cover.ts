// The CSA Gazette cover page and the finished issue (cover + document + appendices).
//
// The cover is the user's Word template (The CSA File/Gazette/Templates/Gazette Cover (<type>).docx)
// drawn in code, at the positions Word gives it: every measurement below was taken from the
// published V2-N14 cover, which the templates were made from. Nothing is left to chance, so the same
// details always give the same cover, to the point.
//
// Layout, top to bottom (y measured down from the top of an A4 page, in points):
// - the Gazette eagle, cropped as in the template;
// - "CSA Gazette" in Playfair Display Bold 72 pt, #262626, with Word's -0.5 pt character spacing;
// - a strip between thin rules: Volume, Number, Date, weekday;
// - the type and number line ("Act Number: 3/2026");
// - the title in a box with a soft shadow (see shadow.ts);
// - the contact box: The President's Office on the left, where to send submissions on the right.

import fontkit from '@pdf-lib/fontkit';
import {
  PDFDocument,
  PDFPage,
  PDFFont,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  rectangle,
  clip,
  endPath,
  concatTransformationMatrix,
  drawObject,
} from 'pdf-lib';
import { gazetteEagle, interRegular, playfairBold } from './cover-assets.js';
import { shadowAlpha, type ShadowGlyph } from './shadow.js';
import { addInitials } from './initials.js';

export interface CoverText {
  volume: number;
  number: number;
  // the date of publication, YYYY-MM-DD
  date: string;
  // the type and number, e.g. "Act Number: 3/2026"
  numberLine: string;
  title: string;
}

// A4, as Word sets it (11906 x 16838 twips)
const PAGE = { width: 595.32, height: 841.92 };
const CENTRE = 297.65;

// Word on the Mac lays text out at its own size (10 pt, 14 pt) but prints the letters at sizes rounded
// to 1/300 inch (10.08, 13.92). The published covers carry exactly that, so these do too.
type Size = { layout: number; print: number };
const size = (layout: number, print = layout): Size => ({ layout, print });
const SMALL = size(10, 10.08);

const EAGLE = {
  // the whole picture's place, and the part of it the template shows
  image: { x: 190.45, y: 80.18, size: 212.5 },
  crop: { x: 206.4, y: 103.2, width: 182.4, height: 159.35 },
};
const MASTHEAD = { text: 'CSA Gazette', size: size(72), baseline: 380.16, spacing: -0.5, colour: rgb(0x26 / 255, 0x26 / 255, 0x26 / 255) };
const STRIP = {
  rules: [443.55, 463.45],
  left: 54,
  right: 540.7,
  baseline: 457.2,
  // the middle of each cell: Volume:, #, Number:, #, Date:, date, weekday
  centres: [84.78, 145.75, 206.46, 267.43, 328.15, 419.54, 510.79],
};
const NUMBER_LINE = { size: size(14, 13.92), baseline: 527.04 };
const TITLE = {
  size: size(18),
  baseline: 583.92,
  // the template's text box is 456.9 pt wide with 7.2 pt insets; a longer title wraps (Word would let
  // it run off the box), and each extra line moves the contact box down by one line
  maxWidth: 442.5,
  lineAdvance: 25.2,
  maxLines: 3,
  // the shadow picture's box around a line, as Word draws it
  shadow: { padX: 7.2, above: 18.22, below: 3.08 },
};
const CONTACT = {
  top: 612.0,
  bottom: 732.25,
  divider: 297.35,
  rule: 1.5,
  leftCentre: 175.68,
  rightX: 300.24,
  left: [
    { text: 'The President’s Office', baseline: 632.16 },
    { text: 'Continental Security Agency,', baseline: 644.4 },
    { text: 'United States of America', baseline: 656.4 },
    { text: 'Phone: +102 325-0001', baseline: 681.36 },
    { text: 'Hotline: 0631', baseline: 699.12 },
    { text: 'Website: www.gazette.csa', baseline: 717.12 },
  ],
  right: [
    { text: '  For publication in the CSA Gazette, please send ', baseline: 665.04 },
    { text: '  submissions to publish@gazette.csa', baseline: 677.28 },
  ],
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// "08 November 2026" and "Sunday", from 2026-11-08 (the template's "dd Month yyyy" and "Day")
export function coverDate(iso: string): { date: string; weekday: string } {
  const [year, month, day] = iso.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return { date: `${String(day).padStart(2, '0')} ${MONTHS[month - 1]} ${year}`, weekday };
}

const fromBase64 = (data: string) => Uint8Array.from(Buffer.from(data, 'base64'));
const interBytes = fromBase64(interRegular);
const playfairBytes = fromBase64(playfairBold);
const eagleBytes = fromBase64(gazetteEagle);
const inter = fontkit.create(Buffer.from(interBytes));
const playfair = fontkit.create(Buffer.from(playfairBytes));

type Font = typeof inter;

// Where each letter of a line sits, with the font's kerning (as Word sets it) and any character
// spacing after every letter.
function layout(font: Font, text: string, size: number, spacing = 0) {
  const run = font.layout(text);
  const unit = size / font.unitsPerEm;
  // code points, as fontkit maps them (the cover has no emoji or joined characters)
  // oxlint-disable-next-line typescript/no-misused-spread
  const chars = [...text];
  const glyphs: { char: string; x: number; commands: ShadowGlyph['commands'] }[] = [];
  let x = 0;
  run.glyphs.forEach((glyph, i) => {
    glyphs.push({ char: chars[i] ?? '', x: x + run.positions[i].xOffset * unit, commands: (glyph.path as unknown as { commands: ShadowGlyph['commands'] }).commands });
    x += run.positions[i].xAdvance * unit + spacing;
  });
  // one glyph per character keeps the letters and their text in step; a font substitution that
  // merged letters would break that, so it's refused (Inter and Playfair don't, for these texts)
  if (run.glyphs.length !== chars.length) throw new Error(`Can't set "${text}" letter by letter`);
  return { glyphs, width: x };
}

const textWidth = (text: string, { layout: at }: Size) => layout(inter, text, at).width;

// The title split into lines that fit the template's box, breaking between words.
export function titleLines(title: string): string[] {
  const words = title.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, TITLE.size) > TITLE.maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// Problems that stop a cover being made, in words for the portal
export function coverProblems(cover: CoverText): string[] {
  const problems: string[] = [];
  if (!cover.title.trim()) problems.push('The cover needs a title.');
  else {
    const lines = titleLines(cover.title);
    if (lines.length > TITLE.maxLines) problems.push(`The title runs to ${lines.length} lines on the cover; it fits ${TITLE.maxLines}.`);
    if (lines.some((line) => textWidth(line, TITLE.size) > TITLE.maxWidth)) problems.push('A word in the title is too long to fit across the cover.');
  }
  // oxlint-disable-next-line typescript/no-misused-spread -- code points, as the font maps them
  const missing = [...new Set([...`${cover.title}${cover.numberLine}`].filter((char) => !inter.hasGlyphForCodePoint(char.codePointAt(0)!)))];
  if (missing.length) problems.push(`The cover’s font has no ${missing.map((char) => `“${char}”`).join(', ')}.`);
  if (!cover.numberLine.trim()) problems.push('The cover needs the type and number.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cover.date)) problems.push('The cover needs the date of publication.');
  return problems;
}

// Draws text letter by letter from `x` on a baseline measured from the top of the page.
function drawLine(page: PDFPage, font: PDFFont, metrics: Font, text: string, x: number, baseline: number, at: Size, spacing = 0, colour = rgb(0, 0, 0)) {
  const { glyphs } = layout(metrics, text, at.layout, spacing);
  for (const glyph of glyphs) {
    if (glyph.char === ' ') continue;
    page.drawText(glyph.char, { x: x + glyph.x, y: PAGE.height - baseline, size: at.print, font, color: colour });
  }
}

function drawCentred(page: PDFPage, font: PDFFont, metrics: Font, text: string, centre: number, baseline: number, at: Size, spacing = 0, colour = rgb(0, 0, 0)) {
  const { width } = layout(metrics, text, at.layout, spacing);
  drawLine(page, font, metrics, text, centre - width / 2, baseline, at, spacing, colour);
}

const hline = (page: PDFPage, y: number, x0: number, x1: number, thickness: number) =>
  page.drawLine({ start: { x: x0, y: PAGE.height - y }, end: { x: x1, y: PAGE.height - y }, thickness, color: rgb(0, 0, 0) });

// The shadow behind one line of the title: a black picture with the blurred title as its
// transparency, placed in the box Word gives it.
function drawShadow(doc: PDFDocument, page: PDFPage, line: string, startX: number, baseline: number) {
  const { glyphs, width } = layout(inter, line, TITLE.size.layout);
  const box = {
    width: width + TITLE.shadow.padX * 2,
    height: TITLE.shadow.above + TITLE.shadow.below,
    left: TITLE.shadow.padX,
    baseline: TITLE.shadow.above,
  };
  const shadow = shadowAlpha(glyphs, inter.unitsPerEm, TITLE.size.layout, box);
  const imageDict = { Type: 'XObject', Subtype: 'Image', Width: shadow.width, Height: shadow.height, ColorSpace: 'DeviceGray', BitsPerComponent: 8 };
  const mask = doc.context.register(doc.context.flateStream(shadow.alpha, imageDict));
  const black = doc.context.register(doc.context.flateStream(new Uint8Array(shadow.width * shadow.height), { ...imageDict, SMask: mask }));
  const name = page.node.newXObject('Shadow', black);
  const x = startX - TITLE.shadow.padX;
  const y = PAGE.height - (baseline + TITLE.shadow.below);
  // scale the 1 x 1 image space to the box, then move it into place
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(box.width, 0, 0, box.height, x, y), drawObject(name), popGraphicsState());
}

// Draws the cover onto `page` of `doc`.
async function drawCover(doc: PDFDocument, page: PDFPage, cover: CoverText) {
  doc.registerFontkit(fontkit);
  // embedded whole: they're already cut down (see cover-assets.ts)
  const interFont = await doc.embedFont(interBytes, { subset: false, customName: 'Inter-Regular' });
  const playfairFont = await doc.embedFont(playfairBytes, { subset: false, customName: 'PlayfairDisplay-Bold' });
  const eagle = await doc.embedPng(eagleBytes);

  // the eagle, cropped to the part the template shows
  const { image, crop } = EAGLE;
  page.pushOperators(pushGraphicsState(), rectangle(crop.x, PAGE.height - crop.y - crop.height, crop.width, crop.height), clip(), endPath());
  page.drawImage(eagle, { x: image.x, y: PAGE.height - image.y - image.size, width: image.size, height: image.size });
  page.pushOperators(popGraphicsState());

  drawCentred(page, playfairFont, playfair, MASTHEAD.text, CENTRE, MASTHEAD.baseline, MASTHEAD.size, MASTHEAD.spacing, MASTHEAD.colour);

  // the strip
  for (const y of STRIP.rules) hline(page, y, STRIP.left, STRIP.right, 0.5);
  const { date, weekday } = coverDate(cover.date);
  const cells = ['Volume:', String(cover.volume), 'Number:', String(cover.number), 'Date:', date, weekday];
  cells.forEach((text, i) => drawCentred(page, interFont, inter, text, STRIP.centres[i], STRIP.baseline, SMALL));

  drawCentred(page, interFont, inter, cover.numberLine, CENTRE, NUMBER_LINE.baseline, NUMBER_LINE.size);

  // the title, each line with its shadow underneath
  const lines = titleLines(cover.title);
  lines.forEach((line, i) => {
    const baseline = TITLE.baseline + i * TITLE.lineAdvance;
    const startX = CENTRE - textWidth(line, TITLE.size) / 2;
    drawShadow(doc, page, line, startX, baseline);
    drawLine(page, interFont, inter, line, startX, baseline, TITLE.size);
  });

  // the contact box, moved down by any extra title lines
  const shift = (lines.length - 1) * TITLE.lineAdvance;
  hline(page, CONTACT.top + shift, STRIP.left, STRIP.right, CONTACT.rule);
  hline(page, CONTACT.bottom + shift, STRIP.left, STRIP.right, CONTACT.rule);
  page.drawLine({
    start: { x: CONTACT.divider, y: PAGE.height - (CONTACT.top + shift) },
    end: { x: CONTACT.divider, y: PAGE.height - (CONTACT.bottom + shift) },
    thickness: CONTACT.rule,
    color: rgb(0, 0, 0),
  });
  for (const { text, baseline } of CONTACT.left) drawCentred(page, interFont, inter, text, CONTACT.leftCentre, baseline + shift, SMALL);
  for (const { text, baseline } of CONTACT.right) drawLine(page, interFont, inter, text, CONTACT.rightX, baseline + shift, SMALL);
}

// The cover on its own, as a one-page PDF (for the portal's preview and for tests).
export async function coverPdf(cover: CoverText): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const page = doc.addPage([PAGE.width, PAGE.height]);
  await drawCover(doc, page, cover);
  return doc.save();
}

export interface IssueInput {
  main: Uint8Array;
  appendices: Uint8Array[];
  // left out for a Notice, which has no cover
  cover?: CoverText;
  // a President's Order: the President's initials on every page but the cover and the Order's last
  // (see initials.ts)
  initialled?: boolean;
  info: { title: string; subject: string; date: string };
}

// The finished issue: the cover in front of the document, then its appendices in order. The
// document itself is kept whole (its own outline and links survive); the appendices are copied in
// page by page. The PDF's dates are the date of publication, so building it twice gives the same
// file.
export async function buildIssue({ main, appendices, cover, initialled, info }: IssueInput): Promise<Uint8Array> {
  const doc = await loadPdf(main);
  // the Order's last page, where the President signs in full
  const signed = (cover ? 1 : 0) + doc.getPageCount() - 1;
  if (cover) {
    const page = doc.insertPage(0, [PAGE.width, PAGE.height]);
    await drawCover(doc, page, cover);
  }
  for (const bytes of appendices) {
    const appendix = await loadPdf(bytes);
    const pages = await doc.copyPages(appendix, appendix.getPageIndices());
    for (const page of pages) doc.addPage(page);
  }
  // every page but the cover and the signed one
  if (initialled) addInitials(doc, doc.getPageIndices().filter((index) => index !== signed && !(cover && index === 0)));
  const when = new Date(`${info.date}T00:00:00Z`);
  doc.setTitle(info.title);
  doc.setSubject(info.subject);
  doc.setCreator('CSA Gazette');
  doc.setProducer('CSA Portal');
  doc.setCreationDate(when);
  doc.setModificationDate(when);
  return doc.save();
}

// Loads a PDF, with the reason in words when it can't be used.
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/encrypt/i.test(message)) throw new UnusablePdf('This PDF is password-protected. Save it again without a password.');
    throw new UnusablePdf('This file couldn’t be read as a PDF.');
  }
}

export class UnusablePdf extends Error {}
