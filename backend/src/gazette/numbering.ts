import { underItsName } from './names.js';
import { TYPES, SERIES_TYPES, formatSeriesNumber, parseSeriesNumber } from './types.js';

// The Gazette's numbering, the user's scheme (2026-10-29), modelled on the Maldives Government
// Gazette:
// - the address /g/<serial> counts every document ever published, from 1, and never resets;
// - Volume 1 is January to June 2026, Volume 2 July to December 2026, and so on, two a year;
// - Number counts the year's documents from 1 each January, across both of its volumes;
// - the Gazette reference is CSA/G<volume>-<number>.
// Each is given once, when the document is published, and never changes afterwards.
//
// Separately, the Gazette Office numbers Acts, President's Orders, Regulations and Guidelines in
// one series per type for the whole CSA, from 1 each year (Director's Order Number 01/2026, point
// 18). That's the document's own number, printed on it.

export const FIRST_YEAR = 2026;

export const yearOf = (iso: string) => Number(iso.slice(0, 4));

export function volumeFor(iso: string): number | null {
  const [year, month] = iso.split('-').map(Number);
  if (year < FIRST_YEAR) return null;
  return (year - FIRST_YEAR) * 2 + (month <= 6 ? 1 : 2);
}

export const gazetteRef = (volume: number | null, number: number | null) => (volume && number ? `CSA/G${volume}-${number}` : null);

export interface Placed {
  serial: number | null;
  number: number | null;
  publishedOn: string | null;
  type: string;
  docNumber: string | null;
}

// Where the next document published on `iso` goes.
export function nextPlace(published: Placed[], iso: string) {
  const serial = Math.max(0, ...published.map((doc) => doc.serial ?? 0)) + 1;
  const volume = volumeFor(iso);
  const sameYear = published.filter((doc) => doc.publishedOn && yearOf(doc.publishedOn) === yearOf(iso));
  const number = volume ? Math.max(0, ...sameYear.map((doc) => doc.number ?? 0)) + 1 : null;
  return { serial, volume, number, gazetteRef: gazetteRef(volume, number) };
}

// The next free number in each series for `year`, written like the series' last one (a President's
// Order keeps the two digits of Director's Order Number 01/2026).
export function nextSeries(published: Placed[], year: number): Record<string, string> {
  const next: Record<string, string> = {};
  for (const type of SERIES_TYPES) {
    const used = published
      .filter((doc) => doc.type === type && doc.docNumber)
      .map((doc) => ({ printed: doc.docNumber!, parsed: parseSeriesNumber(type, doc.docNumber!) }))
      .filter((doc) => doc.parsed?.year === year);
    const last = used.sort((a, b) => b.parsed!.serial - a.parsed!.serial)[0];
    const digits = last ? last.printed.replace(TYPES[type].prefix ?? '', '').split('/')[0].length : type === 'order' ? 2 : 1;
    next[type] = formatSeriesNumber(type, (last?.parsed!.serial ?? 0) + 1, year, digits);
  }
  return next;
}

// How the public Gazette shows a new document's number: "Act Number 3/2026", "Regulation Number
// R-1/2026"; a Notice shows its own reference. Orders 01 and 02/2026 keep the name Director's Order
// (names.ts).
export function referenceFor(type: string, docNumber: string): string {
  const cite = TYPES[type]?.cite;
  return cite ? `${underItsName(type, docNumber, cite)} ${docNumber}` : docNumber;
}

// The cover's type and number line, from the user's templates: "Act Number: 3/2026",
// "President’s Order: 03/2026", "Regulation Number: R-1/2026", "Guideline Number: G-1/2026".
export function coverNumberLine(type: string, docNumber: string): string {
  return `${underItsName(type, docNumber, TYPES[type]?.cover ?? TYPES[type]?.tag ?? '')}: ${docNumber}`;
}
