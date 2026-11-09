// The renames the Gazette has to know about, as data. A body or a document type keeps its identity
// when it's renamed: The Director's Office and The President's Office are one body, and a
// Director's Order and a President's Order are one type with one number series. The check
// (rules/index.ts) and the Gazette's names (numbering.ts, the service) read these tables through
// names.ts; nothing else spells a rename out. Add a later rename as a new row: chains resolve, so
// a body renamed twice is still one body.

// A body renamed. Before comparing issuing bodies, each name resolves through this table to one
// body (names.ts, bodyId).
export interface BodyRename {
  from: string;
  to: string;
  // the provision that makes the rename
  source: string;
  // it takes effect on the publication date of this document, as the Gazette Register has it
  effective: { type: string; docNumber: string };
}

export const BODY_RENAMES: readonly BodyRename[] = [
  {
    from: 'The Director’s Office',
    to: 'The President’s Office',
    source: 'Director’s Order Number 02/2026, point 3 (a)',
    effective: { type: 'order', docNumber: '02/2026' },
  },
];

// A document type renamed. It stays one type with one number series: the documents numbered up to
// `lastUnderOld` keep the old name, the ones after take the new one, and a citation by either name
// means the same document.
export interface TypeRename {
  type: string;
  from: string;
  to: string;
  // where the rename comes from
  source: string;
  // the last number issued under the old name
  lastUnderOld: { serial: number; year: number };
}

export const TYPE_RENAMES: readonly TypeRename[] = [
  {
    type: 'order',
    from: 'Director’s Order',
    to: 'President’s Order',
    source: 'Director’s Order Number 02/2026',
    lastUnderOld: { serial: 2, year: 2026 },
  },
];
