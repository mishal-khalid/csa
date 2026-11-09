// Names that change while what they name stays the same: bodies and document types, through the
// tables in renames.ts. Compare issuing bodies with sameBody, never as plain strings.

import { BODY_RENAMES, TYPE_RENAMES, type BodyRename } from './renames.js';
import { TYPES, parseSeriesNumber } from './types.js';

// a name as compared: straight apostrophes, single spaces, no case
const key = (name: string) =>
  name.replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();

// The one ID of the body a name stands for: its latest name, following each rename in turn, as a
// key. "The Director’s Office" and "The President’s Office" give the same ID. A body renamed back
// to an earlier name gives one ID from any name on the loop.
export function bodyId(
  name: string,
  renames: readonly BodyRename[] = BODY_RENAMES,
): string {
  const path: string[] = [];
  let current = key(name);
  while (!path.includes(current)) {
    path.push(current);
    const next = renames.find((r) => key(r.from) === current);
    if (!next) return current;
    current = key(next.to);
  }
  return path.slice(path.indexOf(current)).sort()[0];
}

export const sameBody = (
  a: string,
  b: string,
  renames: readonly BodyRename[] = BODY_RENAMES,
) => bodyId(a, renames) === bodyId(b, renames);

// The rename that replaced this name, if one did. When it takes effect is the register's to say
// (the publication date of the document in `effective`).
export const renameOf = (
  name: string,
  renames: readonly BodyRename[] = BODY_RENAMES,
) => renames.find((r) => key(r.from) === key(name));

type Serial = { serial: number; year: number };
const later = (a: Serial, b: Serial) =>
  a.year > b.year || (a.year === b.year && a.serial > b.serial);

// The name a document goes by, from its type and number: Director’s Orders Number 01/2026 and
// 02/2026 keep their name, and the Orders after them are President’s Orders. Without a number,
// the type's name now.
export function typeName(
  type: string,
  docNumber?: string | null,
): string | undefined {
  const now = TYPES[type]?.tag;
  const number = docNumber ? parseSeriesNumber(type, docNumber) : null;
  if (!number) return now;
  const first = TYPE_RENAMES.filter(
    (r) => r.type === type && !later(number, r.lastUnderOld),
  ).sort((a, b) => (later(a.lastUnderOld, b.lastUnderOld) ? 1 : -1))[0];
  return first?.from ?? now;
}

// One of a type's set phrases ("President’s Order Number", the cover's "President’s Order"), under
// the name this document goes by
export function underItsName(
  type: string,
  docNumber: string | null | undefined,
  phrase: string,
): string {
  const now = TYPES[type]?.tag;
  const name = typeName(type, docNumber);
  return now && name && name !== now ? phrase.replace(now, name) : phrase;
}

// The type a name stands for, by any name it has had: "Director’s Order" and "President’s Order"
// are both an Order.
export function typeNamed(word: string): string | undefined {
  const k = key(word);
  const now = Object.entries(TYPES).find(([, info]) => key(info.tag) === k);
  return (
    now?.[0] ??
    TYPE_RENAMES.find((r) => key(r.from) === k || key(r.to) === k)?.type
  );
}
