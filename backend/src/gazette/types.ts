// The kinds of document in the CSA Gazette.
//
// The five types of Director's Order Number 01/2026 (point 6) come first, under the names of
// Director's Order Number 02/2026: Act, President's Order, Regulation, Guideline (which may be
// titled a Policy) and Notice. After them are the kinds published before those Orders (circulars,
// executive mandates, founding documents) and the Salaadheeb Salaamathee Council's own kinds. Only
// the five can be made in the portal.

export const NEW_TYPES = ['act', 'order', 'regulation', 'guideline', 'notice'] as const;
export type NewType = (typeof NEW_TYPES)[number];

// the types that get a cover page (point 26); a Notice never does
export const COVER_TYPES: readonly NewType[] = ['act', 'order', 'regulation', 'guideline'];

// the types the Gazette Office numbers, one series each for the whole CSA, restarting every year
// (point 18). A Notice carries its issuing body's own reference number.
export const SERIES_TYPES: readonly NewType[] = ['act', 'order', 'regulation', 'guideline'];

export interface TypeInfo {
  // the website's section heading and the tag on each row
  label: string;
  tag: string;
  // the number line on the cover, from the user's templates (The CSA File/Gazette/Templates):
  // "<cover>: <number>", e.g. "Act Number: 3/2026", "President’s Order: 03/2026"
  cover?: string;
  // how the document is cited (point 24): "<cite> <number>", e.g. "Regulation Number R-1/2026"
  cite?: string;
  // the series prefix of the number (point 17): R-1/2026, G-1/2026
  prefix?: string;
}

export const TYPES: Record<string, TypeInfo> = {
  act: { label: 'Acts', tag: 'Act', cover: 'Act Number', cite: 'Act Number' },
  order: { label: 'President’s Orders', tag: 'President’s Order', cover: 'President’s Order', cite: 'President’s Order Number' },
  regulation: { label: 'Regulations', tag: 'Regulation', cover: 'Regulation Number', cite: 'Regulation Number', prefix: 'R-' },
  guideline: { label: 'Guidelines', tag: 'Guideline', cover: 'Guideline Number', cite: 'Guideline Number', prefix: 'G-' },
  notice: { label: 'Notices', tag: 'Notice' },
  circular: { label: 'Circulars', tag: 'Circular' },
  mandate: { label: 'Executive mandates', tag: 'Executive mandate' },
  founding: { label: 'Founding documents', tag: 'Founding document' },
  // the Salaadheeb Salaamathee Council's kinds
  announcement: { label: 'Announcements', tag: 'Announcement' },
  'press-release': { label: 'Press releases', tag: 'Press release' },
};

export const isNewType = (type: string): type is NewType => (NEW_TYPES as readonly string[]).includes(type);

// A series number as printed: "3/2026", "03/2026", "R-1/2026", "G-12/2026". Returns its serial and
// year, or null when it isn't one.
export function parseSeriesNumber(type: string, printed: string): { serial: number; year: number } | null {
  const prefix = TYPES[type]?.prefix ?? '';
  const match = new RegExp(`^${prefix}(\\d{1,4})/(\\d{4})$`).exec(printed.trim());
  return match ? { serial: Number(match[1]), year: Number(match[2]) } : null;
}

// The next number in a series, written the way the series' last document was (a President's Order
// keeps the two digits of 01/2026 and 02/2026).
export function formatSeriesNumber(type: string, serial: number, year: number, padTo = 1): string {
  return `${TYPES[type]?.prefix ?? ''}${String(serial).padStart(padTo, '0')}/${year}`;
}
