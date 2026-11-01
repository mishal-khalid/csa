import { PDFDocument } from "pdf-lib";
import { api, API } from "./api";
import { words } from "./words";

// A student's transcript: a one-page PDF to the user's Word template (2026-11-01). It's drawn here in
// the browser, which shapes the Thaana properly, onto an A4 canvas at 300 dpi, and the PDF holds that
// one picture. The measurements are the template's (Word's twips and EMUs, turned into points). What
// it says comes from the API, and so do the crest, stamp, signature and fonts it's drawn with, which
// only the Platoon In-Charge gets (see backend/src/mjscc/transcripts.service.ts).

const DPI = 300;
const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 72;
// right-to-left lines start at the right margin
const RIGHT = A4.width - MARGIN;
const CENTER = A4.width / 2;
const twips = (n) => n / 20;
const emu = (n) => n / 12700;
// Word's default tab stops, every half inch from the margin
const TAB = twips(720);
// the template's body text: Faruma 12, Word's 1.16 line spacing, 8pt after each paragraph
const LINE = 278 / 240;
const AFTER = 8;

const TITLE_FONT = '"MJSCC Transcript Title"';
// Faruma, as the app already loads it
const faruma = () => getComputedStyle(document.documentElement).getPropertyValue("--font-faruma").trim();

// at most one decimal place, as on the results page
const one = (n) => (Math.round(n * 10) / 10).toLocaleString("en", { maximumFractionDigits: 1 });

async function file(name) {
  const res = await fetch(`${API}/mjscc/transcript-files/${name}`, { credentials: "include" });
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  return res.arrayBuffer();
}

const picture = async (name) => createImageBitmap(new Blob([await file(name)], { type: "image/png" }));

// the template's own fonts, added to the page once
let fonts;
function loadFonts() {
  const add = async (family, name, weight = "400") => document.fonts.add(await new FontFace(family.replaceAll('"', ""), await file(name), { weight }).load());
  fonts ??= Promise.all([
    add(TITLE_FONT, "title.ttf"),
    add(TITLE_FONT, "title-bold.ttf", "700"),
    document.fonts.load(`12px ${faruma()}`, "ހ"),
  ]).catch((error) => {
    fonts = null;
    throw error;
  });
  return fonts;
}

// Writing on the canvas, in points, right to left.
function writer(ctx) {
  // sets the font, and answers its ascent and its single line's height
  const font = ({ family = faruma(), size = 12, bold = false, color = "#000000" }) => {
    ctx.font = `${bold ? "bold " : ""}${size}px ${family}`;
    ctx.fillStyle = color;
    const m = ctx.measureText("ހ");
    return { ascent: m.fontBoundingBoxAscent, height: m.fontBoundingBoxAscent + m.fontBoundingBoxDescent };
  };
  const width = (text) => ctx.measureText(text).width;
  const write = (text, x, baseline, align = "right") => {
    ctx.textAlign = align;
    ctx.fillText(text, x, baseline);
  };
  // a paragraph's lines: the first can be narrower (when it starts further in)
  const wrap = (text, first, rest = first) => {
    const lines = [];
    let line = "";
    for (const word of text.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (line && width(next) > (lines.length ? rest : first)) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    return line ? [...lines, line] : lines;
  };
  // a line spread from the right edge to the left, its words in reading order from the right
  const justified = (text, right, span, baseline) => {
    const list = text.split(" ");
    const gap = (span - list.reduce((sum, w) => sum + width(w), 0)) / Math.max(1, list.length - 1);
    let x = right;
    for (const word of list) {
      write(word, x, baseline);
      x -= width(word) + gap;
    }
  };
  return { font, width, write, wrap, justified };
}

function draw(ctx, t, { crest, stamp, signature, bismillah }) {
  const w = words.transcript;
  const { font, width, write, wrap, justified } = writer(ctx);
  ctx.scale(DPI / 72, DPI / 72);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, A4.width, A4.height);
  ctx.direction = "rtl";
  ctx.textBaseline = "alphabetic";

  // The footer, behind the page's text as in Word: the signature, a rule, and the statement in 5pt,
  // justified, its last line ending 0.49" above the foot of the page.
  let f = font({ size: 5 });
  const statement = wrap(w.footer, RIGHT - MARGIN);
  const footerTop = A4.height - twips(708) - statement.length * f.height;
  const rule = footerTop - 8;
  ctx.drawImage(signature, MARGIN + emu(-215204), rule + emu(-575557), emu(1446336), emu(663879));
  ctx.fillStyle = "#000000";
  ctx.fillRect(MARGIN, rule - 0.75, RIGHT - MARGIN, 1.5);
  statement.forEach((line, i) => {
    const baseline = footerTop + i * f.height + f.ascent;
    if (i < statement.length - 1) justified(line, RIGHT, RIGHT - MARGIN, baseline);
    else write(line, RIGHT, baseline);
  });

  // the header: the Bismillah, as tall as the template's 14pt line of it
  const bismillahHeight = 14 * (0.881 + 0.264);
  const bismillahWidth = (bismillahHeight * bismillah.width) / bismillah.height;
  ctx.drawImage(bismillah, CENTER - bismillahWidth / 2, twips(708), bismillahWidth, bismillahHeight);

  // the crest, 1.03" square, centred
  let y = MARGIN;
  const crestSize = emu(944880);
  ctx.drawImage(crest, CENTER - crestSize / 2, y, crestSize, crestSize);
  y += crestSize * LINE + AFTER;

  // the address, its first line bold and its last one a tab in
  w.address.forEach((line, i) => {
    f = font({ bold: i === 0 });
    write(line, i === 2 ? RIGHT - TAB : RIGHT, y + f.ascent);
    y += f.height * LINE;
  });
  y += AFTER;
  const body = font({});
  const empty = () => (y += body.height * LINE + AFTER);
  empty();

  // the title: MV Typewriter bold 20, a little tighter, underlined where the font puts it
  f = font({ family: TITLE_FONT, size: 20, bold: true });
  ctx.letterSpacing = "-0.5px";
  const titleBaseline = y + f.ascent;
  write(w.title, CENTER, titleBaseline, "center");
  const titleWidth = width(w.title);
  ctx.fillRect(CENTER - titleWidth / 2, titleBaseline + 0.552 * 20 - 0.44, titleWidth, 0.88);
  ctx.letterSpacing = "0px";
  y += f.height + 4;

  // the student: rank and full name, MV Typewriter bold 14, a dark grey
  y += 18;
  f = font({ family: TITLE_FONT, size: 14, bold: true, color: "#262626" });
  write(`${t.student.rank} ${t.student.name}`, CENTER, y + f.ascent, "center");
  y += f.height * LINE + 4;
  empty();

  // The marks: a right-to-left table 1.34" in from the right margin, labels on the right and the
  // marks on the left, a rule under each row but the blank one before the total.
  const row = twips(510);
  const tableRight = RIGHT - twips(1932);
  const tableLeft = tableRight - twips(2576 + 2387);
  const part = ({ points, max, percent }) => `${one(points)} / ${max} · ${one(percent)}%`;
  const rows = [
    [w.parts.THEORY, part(t.marks.theory)],
    [w.parts.DRILL, part(t.marks.drill)],
    [w.parts.COMMANDING, part(t.marks.commanding)],
    [w.parts.INSPECTION, `${one(t.marks.inspection.points)} / ${t.marks.inspection.max}`],
    null,
    [w.total, `${one(t.marks.final)}%`, true],
  ];
  for (const r of rows) {
    if (r) {
      const [label, value, bold] = r;
      f = font({ bold });
      const baseline = y + (row - f.height) / 2 + f.ascent;
      write(label, tableRight - twips(108), baseline);
      write(value, tableLeft + twips(108), baseline, "left");
      ctx.fillStyle = "#000000";
      ctx.fillRect(tableLeft, y + row - 0.25, tableRight - tableLeft, 0.5);
    }
    y += row;
  }
  empty();

  // What the inspection found, 1" in from the right (and four spaces more): one note after the
  // heading, as in the template, or several each on its own line a tab further in.
  const indent = RIGHT - twips(1440);
  f = font({});
  const spaces = width("    ");
  const lines = (text, right, first = right) => {
    wrap(text, first - MARGIN, right - MARGIN).forEach((line, i) => {
      write(line, i ? right : first, y + f.ascent);
      y += f.height * LINE;
    });
  };
  if (t.issues.length <= 1) lines(`${w.issues} ${t.issues[0] ?? w.noIssues}`, indent, indent - spaces);
  else {
    lines(w.issues, indent, indent - spaces);
    for (const issue of t.issues) lines(issue, RIGHT - 3 * TAB);
  }
  y += AFTER;
  y += font({ size: 4 }).height * LINE + AFTER;

  // The evaluating instructors, with the stamp 1.02" below where their paragraph starts, but never
  // lower than that comes to with the template's one line of inspection notes (more lines would
  // push it over the footer's text).
  const stampTop = Math.min(y + emu(929640), rule - emu(1063689) - 16);
  f = font({});
  lines(w.instructors, indent, indent - spaces);
  for (const instructor of t.instructors) lines(instructor, RIGHT - 3 * TAB);
  ctx.drawImage(stamp, MARGIN + emu(-325755), stampTop, emu(1063689), emu(1063689));
}

// Makes the student's transcript and hands it to the browser to save, as "Transcript - CPL. Maahin.pdf".
export async function downloadTranscript(student) {
  const [{ status, data: t }, crest, stamp, signature, bismillah] = await Promise.all([
    api(`/transcripts/${student}`),
    picture("crest.png"),
    picture("stamp.png"),
    picture("signature.png"),
    picture("bismillah.png"),
    loadFonts(),
  ]);
  if (status !== 200) throw new Error(`transcript: ${status}`);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round((A4.width / 72) * DPI);
  canvas.height = Math.round((A4.height / 72) * DPI);
  draw(canvas.getContext("2d"), t, { crest, stamp, signature, bismillah });
  // (a JPEG goes into the PDF as it is; a PNG this size would be unpacked and packed again)
  const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
  canvas.width = canvas.height = 0;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${words.transcript.title} - ${t.student.rank} ${t.student.name}`);
  pdf.setAuthor(words.transcript.address[0]);
  pdf.setCreator("MJSCC Evaluation Portal");
  pdf.setProducer("MJSCC Evaluation Portal");
  const page = pdf.addPage([A4.width, A4.height]);
  page.drawImage(await pdf.embedJpg(await jpeg.arrayBuffer()), { x: 0, y: 0, width: A4.width, height: A4.height });
  const url = URL.createObjectURL(new Blob([await pdf.save()], { type: "application/pdf" }));

  const link = Object.assign(document.createElement("a"), { href: url, download: `Transcript - ${t.student.short}.pdf` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
