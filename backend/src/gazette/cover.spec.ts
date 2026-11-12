import { createHash } from 'node:crypto';
import { PDFArray, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream, degrees } from 'pdf-lib';
import { buildIssue, coverDate, coverPdf, coverProblems, titleLines } from './cover.js';
import { cornerMatrix, INITIALS_WIDTH } from './initials.js';
import { sameNumber, textHash } from './gazette.service.js';
import type { Block } from './blocks.js';
import { coverNumberLine, nextPlace, nextSeries, referenceFor, volumeFor, type Placed } from './numbering.js';

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const act = { volume: 2, number: 16, date: '2026-11-08', numberLine: 'Act Number: 3/2026', title: 'Public Bonds Companies Act' };
// President's Order Number 04/2026 in Dhivehi
const dhivehi = {
  volume: 2,
  number: 22,
  date: '2026-11-12',
  numberLine: 'ރަޢީސުލްވަކާލާގެ ޤަރާރު ނަންބަރު: 04/2026',
  title: 'ސީ.އެސް.އޭގެ ޕަބްލިކް ކޮމްޕެނީސް އޮތޯރިޓީގެ ދަށަށް އީތޯސް ގްރޫޕް އޮފް ކޮމްޕެނީސް އެލް.އެލް.ސީ ގެނައުމާއި ގުޅޭ',
};

describe('the cover', () => {
  it('comes out byte for byte the same every time', async () => {
    expect(sha(await coverPdf(act))).toBe(sha(await coverPdf(act)));
  });

  it('is one A4 page', async () => {
    const doc = await PDFDocument.load(await coverPdf(act));
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect([Math.round(width), Math.round(height)]).toEqual([595, 842]);
  });

  it('writes the date the template’s way', () => {
    expect(coverDate('2026-11-08')).toEqual({ date: '08 November 2026', weekday: 'Sunday' });
    expect(coverDate('2026-01-01')).toEqual({ date: '01 January 2026', weekday: 'Thursday' });
  });

  it('wraps a long title, up to three lines', () => {
    expect(titleLines('Public Bonds Companies Act')).toHaveLength(1);
    expect(titleLines('Change of the Titles of the Leadership of the Continental Security Agency')).toHaveLength(2);
    expect(coverProblems({ ...act, title: 'Word '.repeat(80) })).toEqual([expect.stringMatching(/lines on the cover/)]);
  });

  it('refuses letters its font doesn’t have', () => {
    expect(coverProblems({ ...act, title: '公報' })[0]).toMatch(/font has no/);
    expect(coverProblems({ ...dhivehi, title: 'ޤާނޫނު 公報' })[0]).toMatch(/font has no/);
  });

  // the fonts a cover carries, by name
  const fonts = async (bytes: Uint8Array) => [
    ...new Set(
      (await PDFDocument.load(bytes)).context
        .enumerateIndirectObjects()
        .map(([, object]) => String((object as { get?: (key: PDFName) => unknown }).get?.(PDFName.of('BaseFont')) ?? ''))
        .filter(Boolean),
    ),
  ].sort();

  it('sets a Dhivehi title and number line in Faruma, and an English cover without it', async () => {
    expect(coverProblems(dhivehi)).toEqual([]);
    expect(titleLines(dhivehi.title)).toEqual([
      'ސީ.އެސް.އޭގެ ޕަބްލިކް ކޮމްޕެނީސް އޮތޯރިޓީގެ ދަށަށް އީތޯސް ގްރޫޕް އޮފް',
      'ކޮމްޕެނީސް އެލް.އެލް.ސީ ގެނައުމާއި ގުޅޭ',
    ]);
    expect(await fonts(await coverPdf(dhivehi))).toEqual(['/Faruma', '/Inter-Regular', '/PlayfairDisplay-Bold']);
    expect(await fonts(await coverPdf(act))).toEqual(['/Inter-Regular', '/PlayfairDisplay-Bold']);
    expect(sha(await coverPdf(dhivehi))).toBe(sha(await coverPdf(dhivehi)));
  });

  it('goes in front of the document, with the appendices after it', async () => {
    const page = async (n: number) => {
      const doc = await PDFDocument.create();
      for (let i = 0; i < n; i++) doc.addPage([595.32, 841.92]);
      return doc.save();
    };
    const info = { title: 'Test', subject: 'CSA Gazette, CSA/G2-16', date: '2026-11-08' };
    const issue = await buildIssue({ main: await page(3), appendices: [await page(2), await page(1)], cover: act, info });
    expect((await PDFDocument.load(issue)).getPageCount()).toBe(1 + 3 + 2 + 1);
    const again = await buildIssue({ main: await page(3), appendices: [await page(2), await page(1)], cover: act, info });
    expect(sha(issue)).toBe(sha(again));
    const notice = await buildIssue({ main: await page(3), appendices: [], info });
    expect((await PDFDocument.load(notice)).getPageCount()).toBe(3);
  });
});

describe('the President’s initials', () => {
  const blank = async (n: number) => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < n; i++) doc.addPage([595.32, 841.92]);
    return doc.save();
  };
  const info = { title: 'Test', subject: 'CSA Gazette, CSA/G2-16', date: '2026-11-08' };
  const order = { ...act, numberLine: 'President’s Order: 03/2026', title: 'Test Order' };

  // the pages that draw the initials
  const initialled = async (bytes: Uint8Array) => {
    const doc = await PDFDocument.load(bytes);
    return doc.getPages().flatMap((page, index) => {
      const contents = page.node.Contents();
      const refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
      const drawing = refs
        .map((ref) => Buffer.from(decodePDFRawStream(doc.context.lookup(ref) as PDFRawStream).decode()).toString('latin1'))
        .join('\n');
      return /\/Initials-\d+ Do/.test(drawing) ? [index] : [];
    });
  };

  it('go on every page of an Order’s issue but the cover and the Order’s last, its appendices included', async () => {
    // cover, the Order's 3 pages (the last signed), an appendix of 2 pages
    const issue = await buildIssue({ main: await blank(3), appendices: [await blank(2)], cover: order, initialled: true, info });
    expect(await initialled(issue)).toEqual([1, 2, 4, 5]);
    const again = await buildIssue({ main: await blank(3), appendices: [await blank(2)], cover: order, initialled: true, info });
    expect(sha(issue)).toBe(sha(again));
  });

  it('leave a one-page Order’s only page to its signature', async () => {
    const issue = await buildIssue({ main: await blank(1), appendices: [], cover: order, initialled: true, info });
    expect(await initialled(issue)).toEqual([]);
  });

  it('aren’t put on other documents', async () => {
    expect(await initialled(await buildIssue({ main: await blank(3), appendices: [], cover: act, info }))).toEqual([]);
  });

  it('sit 52 pt in and 30 pt up from the corner as the page is seen, 36 pt tall', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.32, 841.92]);
    const [a, b, c, d, e, f] = cornerMatrix(page);
    expect([a, b, c, d, e, f]).toEqual([INITIALS_WIDTH, 0, 0, 36, 52, 30]);
    // turned a quarter clockwise: the seen bottom-left is the page's bottom-right
    page.setRotation(degrees(90));
    expect(cornerMatrix(page)).toEqual([0, INITIALS_WIDTH, -36, 0, 595.32 - 30, 52]);
    page.setRotation(degrees(270));
    expect(cornerMatrix(page)).toEqual([0, -INITIALS_WIDTH, 36, 0, 30, 841.92 - 52]);
  });
});

describe('the numbering', () => {
  const published: Placed[] = [
    { serial: 1, number: null, publishedOn: '2024-05-02', type: 'founding', docNumber: null },
    { serial: 3, number: 1, publishedOn: '2026-01-01', type: 'act', docNumber: '1/2026' },
    { serial: 16, number: 14, publishedOn: '2026-11-07', type: 'act', docNumber: '2/2026' },
    { serial: 17, number: 15, publishedOn: '2026-11-07', type: 'order', docNumber: '01/2026' },
  ];

  it('gives two volumes a year from Volume 1, January to June 2026', () => {
    expect(volumeFor('2026-06-30')).toBe(1);
    expect(volumeFor('2026-07-01')).toBe(2);
    expect(volumeFor('2027-01-01')).toBe(3);
    expect(volumeFor('2025-04-07')).toBeNull();
  });

  it('puts the next document after the last, restarting Number each January', () => {
    expect(nextPlace(published, '2026-11-08')).toEqual({ serial: 18, volume: 2, number: 16, gazetteRef: 'CSA/G2-16' });
    expect(nextPlace(published, '2027-01-02')).toEqual({ serial: 18, volume: 3, number: 1, gazetteRef: 'CSA/G3-1' });
  });

  it('gives the next number in each series, written like the last', () => {
    expect(nextSeries(published, 2026)).toEqual({ act: '3/2026', order: '02/2026', regulation: 'R-1/2026', guideline: 'G-1/2026' });
    expect(nextSeries(published, 2027)).toEqual({ act: '1/2027', order: '01/2027', regulation: 'R-1/2027', guideline: 'G-1/2027' });
  });

  it('writes the cover line from the templates and the reference for the Gazette', () => {
    expect(coverNumberLine('act', '3/2026')).toBe('Act Number: 3/2026');
    expect(coverNumberLine('order', '03/2026')).toBe('President’s Order: 03/2026');
    // Orders 01 and 02/2026 keep the name they were issued under
    expect(coverNumberLine('order', '02/2026')).toBe('Director’s Order: 02/2026');
    expect(coverNumberLine('regulation', 'R-1/2026')).toBe('Regulation Number: R-1/2026');
    expect(referenceFor('guideline', 'G-1/2026')).toBe('Guideline Number G-1/2026');
    expect(referenceFor('notice', 'PO/2026/N/4')).toBe('PO/2026/N/4');
  });
});

describe('telling repeats apart', () => {
  it('counts 1/2026 and 01/2026 as one number, and a reference written differently as the same', () => {
    expect(sameNumber('order', '01/2026', '1/2026')).toBe(true);
    expect(sameNumber('regulation', 'R-3/2026', 'R-03/2026')).toBe(true);
    expect(sameNumber('act', '3/2026', '3/2027')).toBe(false);
    expect(sameNumber('notice', 'PO/2026/N/01', ' po/2026/n/01 ')).toBe(true);
    expect(sameNumber('notice', 'PO/2026/N/01', null)).toBe(false);
  });

  it('only fingerprints text long enough to tell documents apart', () => {
    const paragraph = (text: string) => [{ type: 'paragraph', text }] as unknown as Block[];
    expect(textHash(paragraph('Short.'))).toBeUndefined();
    const long = 'Every body of the Continental Security Agency shall publish its documents in the Gazette. '.repeat(3);
    expect(textHash(paragraph(long))).toBe(textHash(paragraph(long.toUpperCase().replace(/ /g, '  '))));
    expect(textHash(paragraph(long))).not.toBe(textHash(paragraph(`${long} More.`)));
  });
});
