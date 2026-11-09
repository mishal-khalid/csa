// The Gazette Office's check of a document before it's published: plain rules, no AI, so the same
// document always gets the same answer. The rules are those of Director's Order Number 01/2026
// (Establishment of the Continental Security Agency Gazette) and Director's Order Number 02/2026
// (Change of the Titles of the Leadership of the Continental Security Agency), as set out in the
// CSA Gazette skill.
//
// An error stops publishing: point 32 (a) says the Gazette Office returns a document that doesn't
// comply. A warning is something to look at before publishing; it may be fine (a document the
// register doesn't hold yet, a date the text gives in words). Each problem says where it is and
// quotes the text.

import type { Block, Clause } from '../blocks.js';
import { TYPES } from '../types.js';
import {
  DATE_PATTERN,
  blocksText,
  isIsoDate,
  isoDate,
  letters,
  ordinal,
  ordinalNumber,
  orderParts,
  plain,
  pointNumber,
  quote,
  quoteAt,
  romanNumber,
  sameTitle,
  walk,
  type Segment,
  type WalkPart,
} from './text.js';

export interface RegisterEntry {
  type: string;
  docNumber?: string;
  title: string;
  publishedOn: string; // YYYY-MM-DD
  status?: string;
  // when known: an amendment must come from the same body (point 36)
  issuingBody?: string;
}

export interface CheckInput {
  type: 'act' | 'order' | 'regulation' | 'guideline' | 'notice';
  // as printed: "3/2026", "03/2026", "R-1/2026", "G-1/2026", or a Notice's reference
  docNumber: string;
  title: string;
  issuingBody: string;
  publishedOn: string; // YYYY-MM-DD
  commencesOn?: string; // YYYY-MM-DD
  cover: boolean;
  blocks: Block[];
  appendices: {
    number?: number;
    title?: string;
    firstPageText: string;
    blocks: Block[];
  }[];
  // every published document (not this one)
  register: RegisterEntry[];
}

export interface Issue {
  level: 'error' | 'warning';
  // where the rule comes from, e.g. "Director's Order 01/2026, point 17"
  rule: string;
  // e.g. "Article 5 (a)(1)", "point 4 (b)", "Appendix 2", "Cover"
  where?: string;
  message: string;
  quote?: string;
}

const DO1 = "Director's Order 01/2026";
const DO2 = "Director's Order 02/2026";

// The ruleset, in the order the check runs it. The portal lists it.
export const RULES: { id: string; source: string; summary: string }[] = [
  {
    id: 'details',
    source: `${DO1}, points 26 and 34`,
    summary:
      'The document has a title, an issuing body and a valid publication date.',
  },
  {
    id: 'cover',
    source: `${DO1}, point 26`,
    summary:
      'Acts, Orders, Regulations and Guidelines get a cover page; Notices never do.',
  },
  {
    id: 'issuer',
    source: `${DO1}, points 7 to 11`,
    summary: 'Each type comes only from the body allowed to issue it.',
  },
  {
    id: 'number-format',
    source: `${DO1}, point 17`,
    summary:
      'Numbers are exactly #/year (Acts, Orders), R-#/year (Regulations) or G-#/year (Guidelines), in the year of publication.',
  },
  {
    id: 'number-series',
    source: `${DO1}, point 18`,
    summary:
      'A number is never used twice in a series, and the series runs in order from 1 each year.',
  },
  {
    id: 'notice-reference',
    source: `${DO1}, points 17 (e) and 26`,
    summary:
      'A Notice carries its issuing body’s reference number and date below the letterhead, and ends signed.',
  },
  {
    id: 'amendment',
    source: `${DO1}, points 19 and 36`,
    summary:
      'An amendment is titled “First Amendment to Act Number 2/2026 (title)”, is the same type as what it amends and counts in order.',
  },
  {
    id: 'enabling',
    source: `${DO1}, points 9, 10, 14 and 15`,
    summary:
      'A Regulation (and a Guideline made under one) cites its enabling provision in Article 1 (a), in the set form.',
  },
  {
    id: 'articles',
    source: `${DO1}, point 20`,
    summary:
      'Acts, Regulations and Guidelines are in Articles numbered 1 to n through the whole document, with Chapters in order.',
  },
  {
    id: 'points',
    source: `${DO1}, point 20`,
    summary:
      'Points run (a), (b), (c) and the points under them (1), (2), (3).',
  },
  {
    id: 'no-section',
    source: `${DO1}, point 20`,
    summary:
      'Acts, Regulations and Guidelines never use the words “section” or “subsection”.',
  },
  {
    id: 'opening-articles',
    source: `${DO1}, point 27 (a), (b)`,
    summary:
      'Article 1 is “Introduction and title” and states the title; Article 2 sets out the purpose.',
  },
  {
    id: 'commencement',
    source: `${DO1}, points 27 (c) and 33`,
    summary:
      'The second last Article says when it comes into force, never before publication.',
  },
  {
    id: 'signed',
    source: `${DO1}, point 27 (d)`,
    summary:
      'The document ends with the name, position and signature of the issuer and the date signed.',
  },
  {
    id: 'order-layout',
    source: `${DO1}, points 21 and 28`,
    summary:
      'An Order runs: number, title, the words “President’s Order”, “I, … state the following.”, “Whereas:”, the authority, “I, … hereby …”, numbered points, where and when issued, signature.',
  },
  {
    id: 'self-reference',
    source: `${DO1}, point 23`,
    summary:
      'The document calls itself by its own type: “this Act”, “this Order”, “this Regulation”, “this Guideline” or “this Policy”.',
  },
  {
    id: 'internal-citation',
    source: `${DO1}, point 23`,
    summary:
      'Its own Articles, points and Appendices are cited in the set forms and exist.',
  },
  {
    id: 'citation',
    source: `${DO1}, point 24`,
    summary:
      'Other documents are cited in full: type, number and title in brackets, matching the Gazette Register.',
  },
  {
    id: 'no-gazette',
    source: `${DO1}, point 24`,
    summary: 'A document doesn’t cite the CSA Gazette in its own text.',
  },
  {
    id: 'appendices',
    source: `${DO1}, points 22, 25 and 29`,
    summary:
      'Appendices are numbered in order, say their number on the first page, open by citing the provision that refers to them in full, and never say “this Act”.',
  },
  {
    id: 'notice-content',
    source: `${DO1}, point 11`,
    summary: 'A Notice doesn’t create, amend or repeal rules.',
  },
  {
    id: 'bodies',
    source: `${DO1}, points 14 and 16`,
    summary:
      'Only Acts and Orders establish bodies; Guidelines and Notices create no documents, and nothing creates an Act or an Order.',
  },
  {
    id: 'titles',
    source: `${DO2}`,
    summary:
      'Once Director’s Order 02/2026 is in force: President, Vice President and The President’s Office, never the old titles; no terminated titles.',
  },
];

const SOURCE = Object.fromEntries(RULES.map((rule) => [rule.id, rule.source]));
const RANK = Object.fromEntries(RULES.map((rule, i) => [rule.id, i]));

interface Found extends Issue {
  pos: number;
  id: string;
}

// what the register calls a type: the Laws of the old Gazette are Acts
const typeOf = (type: string) => (type === 'law' ? 'act' : type);

// the serial and year of a printed number, wherever it sits in the string ("Number 01/2026")
function numberParts(
  printed: string | undefined,
): { prefix: string; serial: number; year: number } | null {
  const match = /((?:[RG]-)?)(\d{1,4})\/(\d{4})\s*$/.exec(
    printed?.trim() ?? '',
  );
  return match
    ? { prefix: match[1], serial: Number(match[2]), year: Number(match[3]) }
    : null;
}

// how a document type is written in a citation ("Act Number …", "Regulation Number …")
const CITE_TYPES: Record<string, string> = {
  act: 'Act',
  order: "President's Order",
  regulation: 'Regulation',
  guideline: 'Guideline',
};
function citedType(word: string): string {
  const w = plain(word).toLowerCase();
  if (w === 'act') return 'act';
  if (w.endsWith("'s order")) return 'order';
  if (w === 'regulation') return 'regulation';
  return 'guideline'; // Guideline, or Policy
}

// a citation of another document: "Act Number 2/2026 (Public Bonds Companies Act)"
const CITATION =
  /\b(Act|President['’]s Order|Director['’]s Order|Regulation|Guideline|Policy) Number ((?:[RG]-)?(?:\d{1,4}|#)\/(?:\d{4}|year))(\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\))?/g;

// the parts of a document: the document itself, then each Appendix (written into the blocks after
// an "Appendix N" heading, or given separately)
interface Appendix {
  number?: number;
  firstPageText: string;
  blocks: Block[];
  label: string;
}

function split(input: CheckInput): { main: Block[]; appendices: Appendix[] } {
  const start = input.blocks.findIndex(
    (b) => b.type === 'heading' && /^Appendix \d+$/i.test(plain(b.text)),
  );
  const main = start === -1 ? input.blocks : input.blocks.slice(0, start);
  const appendices: Appendix[] = [];
  if (start !== -1) {
    let current: Appendix | undefined;
    for (const block of input.blocks.slice(start)) {
      const heading =
        block.type === 'heading'
          ? /^Appendix (\d+)$/i.exec(plain(block.text))
          : null;
      if (heading) {
        current = {
          number: Number(heading[1]),
          firstPageText: '',
          blocks: [block],
          label: `Appendix ${heading[1]}`,
        };
        appendices.push(current);
      } else current!.blocks.push(block);
    }
    for (const appendix of appendices)
      appendix.firstPageText = blocksText(appendix.blocks.slice(0, 3));
  }
  for (const a of input.appendices)
    appendices.push({
      number: a.number,
      firstPageText: a.firstPageText,
      blocks: a.blocks,
      label: `Appendix ${a.number ?? appendices.length + 1}`,
    });
  return { main, appendices };
}

export function checkDocument(input: CheckInput): Issue[] {
  const found: Found[] = [];
  const add = (
    id: string,
    level: Issue['level'],
    pos: number,
    where: string | undefined,
    message: string,
    quoted?: string,
  ) =>
    found.push({
      id,
      pos,
      level,
      rule: SOURCE[id],
      where,
      message,
      quote: quoted || undefined,
    });

  const { type } = input;
  const isOrder = type === 'order';
  const articled =
    type === 'act' || type === 'regulation' || type === 'guideline';
  const own = numberParts(input.docNumber);
  // Director's Orders 01/2026 and 02/2026 were issued under the old titles, and set the rules
  const isFoundingOrder =
    isOrder && own?.year === 2026 && (own.serial === 1 || own.serial === 2);
  const isGazetteOrder = isOrder && own?.year === 2026 && own.serial === 1;
  // Director's Order 02/2026 is in force from its publication
  const titlesChanged = input.register.some(
    (e) =>
      typeOf(e.type) === 'order' &&
      numberParts(e.docNumber)?.serial === 2 &&
      numberParts(e.docNumber)?.year === 2026 &&
      e.publishedOn <= input.publishedOn,
  );

  const { main, appendices } = split(input);
  const parts: WalkPart[] = [
    { blocks: main, prefix: '' },
    ...appendices.map((a, i) => ({
      blocks: a.blocks,
      appendix: i,
      prefix: `${a.label}, `,
    })),
  ];
  const segments = walk(parts, isOrder);
  const mainSegments = segments.filter((s) => s.appendix === undefined);
  // the place of a block of the document: its first piece of text, or the next one after it
  const firstPos = (blockIndex: number) =>
    mainSegments.find((s) => s.block >= blockIndex)?.pos ??
    mainSegments.at(-1)?.pos ??
    0;
  const DOC = -1; // problems with the details themselves come first

  // the register's entries by type and number
  const registered = (t: string, serial: number, year: number) =>
    input.register.find(
      (e) =>
        typeOf(e.type) === t &&
        numberParts(e.docNumber)?.serial === serial &&
        numberParts(e.docNumber)?.year === year,
    );

  // -- details ---------------------------------------------------------------------------------
  if (!input.title.trim())
    add('details', 'error', DOC, 'Title', 'The document has no title.');
  if (!input.issuingBody.trim())
    add(
      'details',
      'error',
      DOC,
      'Issuing body',
      'The issuing body is missing.',
    );
  if (!isIsoDate(input.publishedOn))
    add(
      'details',
      'error',
      DOC,
      'Publication date',
      'The publication date is missing or not a date.',
    );
  if (
    input.commencesOn !== undefined &&
    input.commencesOn !== '' &&
    !isIsoDate(input.commencesOn)
  )
    add(
      'details',
      'error',
      DOC,
      'Commencement date',
      'The commencement date is not a date.',
    );
  if (
    !TYPES[type] ||
    !['act', 'order', 'regulation', 'guideline', 'notice'].includes(type)
  )
    add(
      'details',
      'error',
      DOC,
      'Type',
      `“${type}” isn’t one of the five types of document (point 6).`,
    );

  // -- cover -----------------------------------------------------------------------------------
  if (type === 'notice' && input.cover)
    add(
      'cover',
      'error',
      DOC,
      'Cover',
      'A Notice is published without a cover page. Use “No cover”.',
    );
  if (type !== 'notice' && !input.cover)
    add(
      'cover',
      'error',
      DOC,
      'Cover',
      `${TYPES[type]?.tag ?? 'This document'}s are published with a cover page. Use “Add Cover”.`,
    );

  // -- issuer ----------------------------------------------------------------------------------
  const body = plain(input.issuingBody);
  const presidentsOffice = /^The President's Office$/i.test(body);
  const directorsOffice = /^The Director's Office$/i.test(body);
  if (
    isOrder &&
    !(
      presidentsOffice ||
      (directorsOffice && (!titlesChanged || isFoundingOrder))
    )
  )
    add(
      'issuer',
      'error',
      DOC,
      'Issuing body',
      `An Order is issued only by the President, so its issuing body is The President’s Office, not “${input.issuingBody}”.`,
    );
  if (
    type === 'act' &&
    !(presidentsOffice || directorsOffice || /\bCabinet\b/i.test(body))
  )
    add(
      'issuer',
      'warning',
      DOC,
      'Issuing body',
      `${input.issuingBody} can issue an Act only after the Continental Assembly ratifies it; until ratification exists, only the Cabinet or the President issue Acts (point 7). Check it was ratified.`,
    );

  // -- numbers ---------------------------------------------------------------------------------
  const publicationYear = Number(input.publishedOn.slice(0, 4));
  if (type === 'notice') {
    if (!input.docNumber.trim())
      add(
        'notice-reference',
        'error',
        DOC,
        'Number',
        'A Notice needs its issuing body’s reference number.',
      );
  } else {
    const prefix = TYPES[type]?.prefix ?? '';
    const format = new RegExp(`^${prefix}\\d{1,4}/\\d{4}$`);
    if (!format.test(input.docNumber.trim())) {
      add(
        'number-format',
        'error',
        DOC,
        'Number',
        `${TYPES[type]?.tag} numbers are written “${prefix}#/year”, e.g. “${prefix}1/${publicationYear || 2026}”, with nothing added.`,
        input.docNumber,
      );
    } else if (
      own &&
      isIsoDate(input.publishedOn) &&
      own.year !== publicationYear
    ) {
      add(
        'number-format',
        'error',
        DOC,
        'Number',
        `The year in the number (${own.year}) must be the year it’s published (${publicationYear}).`,
        input.docNumber,
      );
    }
    if (own && format.test(input.docNumber.trim())) {
      const taken = registered(type, own.serial, own.year);
      if (taken) {
        add(
          'number-series',
          'error',
          DOC,
          'Number',
          `${TYPES[type].cite} ${input.docNumber} is already used by “${taken.title}”.`,
          input.docNumber,
        );
      } else {
        const used = input.register
          .filter(
            (e) =>
              typeOf(e.type) === type &&
              numberParts(e.docNumber)?.year === own.year,
          )
          .map((e) => numberParts(e.docNumber)!.serial);
        const next = (used.length ? Math.max(...used) : 0) + 1;
        if (own.serial !== next)
          add(
            'number-series',
            'warning',
            DOC,
            'Number',
            own.serial > next
              ? `The next free ${TYPES[type].tag} number in ${own.year} is ${next}; ${own.serial} skips ${own.serial - next === 1 ? next : `${next} to ${own.serial - 1}`}.`
              : `${own.serial} is lower than the last ${TYPES[type].tag} number used in ${own.year} (${next - 1}); the series runs in the order documents are accepted.`,
            input.docNumber,
          );
      }
    }
  }

  // -- amendments ------------------------------------------------------------------------------
  checkAmendment(input, add, DOC, registered);

  // -- commencement date -----------------------------------------------------------------------
  if (
    isIsoDate(input.commencesOn) &&
    isIsoDate(input.publishedOn) &&
    input.commencesOn < input.publishedOn
  )
    add(
      'commencement',
      'error',
      DOC,
      'Commencement date',
      'A document can’t come into force before it’s published (point 33).',
      input.commencesOn,
    );

  // -- structure -------------------------------------------------------------------------------
  if (type === 'regulation' || type === 'guideline')
    checkEnabling(input, main, add, firstPos, registered);
  if (articled) checkArticles(input, main, mainSegments, add, firstPos);
  if (isOrder)
    checkOrderLayout(input, main, mainSegments, add, firstPos, {
      titlesChanged,
      isFoundingOrder,
    });
  if (type === 'notice') checkNoticeLayout(input, main, mainSegments, add);

  // -- text rules, piece by piece --------------------------------------------------------------
  const articles = new Map<string, Clause[]>();
  for (const block of main)
    if (block.type === 'article') articles.set(block.number, block.clauses);
  const points = new Map<string, Clause[]>();
  for (const i of isOrder ? orderParts(main).points : []) {
    const list = main[i];
    if (list.type === 'list')
      for (const item of list.items)
        points.set(pointNumber(item.label), item.items ?? []);
  }
  const selfWord =
    type === 'guideline'
      ? /\bPolicy\b/i.test(input.title)
        ? 'Policy'
        : 'Guideline'
      : TYPES[type]?.tag.replace('President’s ', '');

  for (const seg of segments) {
    const inAppendix = seg.appendix !== undefined;
    const { clean } = seg;

    // "section" and "subsection"
    if (articled)
      for (const m of clean.matchAll(/\b(sub-?)?sections?\b/gi))
        add(
          'no-section',
          'error',
          seg.pos,
          seg.where,
          `Uses the word “${m[0]}”. Acts, Regulations and Guidelines are divided into Articles and points.`,
          quoteAt(seg.text, m.index!, m[0].length),
        );

    // "this Act", "this Order" …
    for (const m of clean.matchAll(
      /\bthis (Act|Order|Regulation|Guideline|Policy)\b/gi,
    )) {
      const word = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
      const q = quoteAt(seg.text, m.index!, m[0].length);
      if (inAppendix) {
        add(
          'appendices',
          'error',
          seg.pos,
          seg.where,
          `An Appendix never says “${m[0]}”; it cites the document in full: “${input.issuingBody}’s ${citeForm(input)}”.`,
          q,
        );
      } else if (type === 'notice') {
        add(
          'self-reference',
          'error',
          seg.pos,
          seg.where,
          `A Notice says “this Notice”, not “${m[0]}”.`,
          q,
        );
      } else if (word !== selfWord) {
        const guidelinePolicy =
          type === 'guideline' && (word === 'Guideline' || word === 'Policy');
        add(
          'self-reference',
          guidelinePolicy ? 'warning' : 'error',
          seg.pos,
          seg.where,
          guidelinePolicy
            ? `This Guideline is titled “${input.title}”, so it calls itself “this ${selfWord}”, not “${m[0]}”.`
            : `This is ${type === 'act' ? 'an' : 'a'} ${TYPES[type].tag}; it calls itself “this ${selfWord}”, not “${m[0]}”.`,
          q,
        );
      } else if (m[1] !== word) {
        add(
          'self-reference',
          'warning',
          seg.pos,
          seg.where,
          `Write “this ${word}”, with a capital.`,
          q,
        );
      }
    }

    // citations of other documents
    checkCitations(input, seg, add, registered);

    // its own Articles, points and Appendices
    if (!inAppendix)
      checkInternalCitations(
        input,
        seg,
        add,
        articles,
        points,
        appendices.length,
      );

    // the CSA Gazette
    if (!isGazetteOrder)
      for (const m of clean.matchAll(
        /\bCSA Gazette\b(?! Office| Register)|\bthe Gazette\b(?! Office| Register)|gazette\.csa|\bGZT\/|\bCSA\/G\d/g,
      ))
        add(
          'no-gazette',
          'warning',
          seg.pos,
          seg.where,
          `Cites the CSA Gazette (“${m[0]}”). A document doesn’t cite the Gazette within its own text.`,
          quoteAt(seg.text, m.index!, m[0].length),
        );

    // Executive Mandates are Orders now
    for (const m of clean.matchAll(/\bExecutive Mandates?\b/g))
      add(
        'citation',
        'warning',
        seg.pos,
        seg.where,
        'An Executive Mandate is read as an Order (point 8); cite it as a President’s Order.',
        quoteAt(seg.text, m.index!, m[0].length),
      );

    // bodies and the documents a document may create
    checkBodies(input, seg, add);

    // the titles changed by Director's Order 02/2026
    if (titlesChanged && !isFoundingOrder) checkTitles(seg, add);
  }

  // -- appendices ------------------------------------------------------------------------------
  checkAppendices(input, main, appendices, segments, add, articles, points);

  // the same problem found twice in one place is reported once
  const seen = new Set<string>();
  return found
    .sort(
      (a, b) =>
        a.pos - b.pos ||
        RANK[a.id] - RANK[b.id] ||
        a.message.localeCompare(b.message) ||
        (a.quote ?? '').localeCompare(b.quote ?? ''),
    )
    .filter((f) => {
      const key = `${f.id}|${f.where}|${f.message}|${f.quote}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ level, rule, where, message, quote: q }) => ({
      level,
      rule,
      ...(where ? { where } : {}),
      message,
      ...(q ? { quote: q } : {}),
    }));
}

type Add = (
  id: string,
  level: Issue['level'],
  pos: number,
  where: string | undefined,
  message: string,
  quoted?: string,
) => void;

// "Act Number 2/2026 (Public Bonds Companies Act)"
const citeForm = (input: CheckInput) =>
  input.type === 'notice'
    ? input.docNumber
    : `${CITE_TYPES[input.type]} Number ${input.docNumber} (${input.title})`;

// -- amendments --------------------------------------------------------------------------------

function checkAmendment(
  input: CheckInput,
  add: Add,
  pos: number,
  registered: (t: string, s: number, y: number) => RegisterEntry | undefined,
) {
  const title = plain(input.title);
  if (!/\bamendment\b/i.test(title)) return;
  if (input.type === 'notice') {
    add(
      'amendment',
      'error',
      pos,
      'Title',
      'A Notice is never amended; it’s withdrawn or replaced by a new Notice (point 36).',
      input.title,
    );
    return;
  }
  const form =
    /^([A-Z][a-z]+(?:-[a-z]+)?) Amendment to (Act|President's Order|Director's Order|Regulation|Guideline) Number ((?:[RG]-)?\d{1,4}\/\d{4}) \((.+)\)$/.exec(
      title,
    );
  if (!form) {
    if (
      /^[A-Z][a-z]+(?:-[a-z]+)? Amendment\b/.test(title) ||
      /\bAmendment\b/.test(title)
    )
      add(
        'amendment',
        'error',
        pos,
        'Title',
        'An amendment is titled “First Amendment to Act Number 2/2026 (Public Bonds Companies Act)”: its order, then the number and title of what it amends.',
        input.title,
      );
    return;
  }
  const [, order, typeWord, number, amendedTitle] = form;
  const n = ordinalNumber(order);
  if (!n)
    add(
      'amendment',
      'error',
      pos,
      'Title',
      `“${order}” isn’t an order word; amendments count First, Second, Third…`,
      input.title,
    );
  const amendedType = citedType(typeWord);
  if (amendedType !== input.type)
    add(
      'amendment',
      'error',
      pos,
      'Title',
      `An amendment is the same type as the document it amends: this amends ${typeWord === 'Act' ? 'an' : 'a'} ${typeWord}, so it must be ${typeWord === 'Act' ? 'an' : 'a'} ${typeWord} too.`,
      input.title,
    );
  const parts = numberParts(number)!;
  const amended = registered(amendedType, parts.serial, parts.year);
  if (!amended) {
    add(
      'amendment',
      'warning',
      pos,
      'Title',
      `${typeWord} Number ${number} isn’t in the Gazette Register.`,
      input.title,
    );
  } else {
    if (!sameTitle(amended.title, amendedTitle))
      add(
        'amendment',
        'error',
        pos,
        'Title',
        `${typeWord} Number ${number} is titled “${amended.title}”.`,
        input.title,
      );
    if (
      amended.issuingBody &&
      amendedType !== 'act' &&
      plain(amended.issuingBody).toLowerCase() !==
        plain(input.issuingBody).toLowerCase()
    )
      add(
        'amendment',
        'error',
        pos,
        'Issuing body',
        `Only ${amended.issuingBody}, which issued ${typeWord} Number ${number}, can amend it (point 36).`,
        input.issuingBody,
      );
    if (n) {
      const earlier = input.register.filter((e) => {
        const m =
          /^([A-Z][a-z]+(?:-[a-z]+)?) Amendment to (.+?) Number ((?:[RG]-)?\d{1,4}\/\d{4}) /.exec(
            plain(e.title),
          );
        const p = m && numberParts(m[3]);
        return (
          m &&
          citedType(m[2]) === amendedType &&
          p?.serial === parts.serial &&
          p.year === parts.year
        );
      }).length;
      if (n !== earlier + 1)
        add(
          'amendment',
          'warning',
          pos,
          'Title',
          `${typeWord} Number ${number} has ${earlier} amendment${earlier === 1 ? '' : 's'} in the register, so this would be the ${ordinal(earlier + 1)} Amendment.`,
          input.title,
        );
    }
  }
}

// -- enabling provisions -------------------------------------------------------------------------

// "This Regulation is made under Article 12 (a) of Act Number 2/2026 (Public Bonds Companies Act)."
const ENABLING =
  /^This (Regulation|Guideline|Policy) is made under ((?:Article|point) \d+(?: \([a-z]{1,2}\)(?:\(\d+\))?)?) of (Act|President's Order|Director's Order|Regulation|Guideline|Policy) Number ((?:[RG]-)?\d{1,4}\/\d{4}) \((.+)\)\.$/;

function checkEnabling(
  input: CheckInput,
  main: Block[],
  add: Add,
  firstPos: (i: number) => number,
  registered: (t: string, s: number, y: number) => RegisterEntry | undefined,
) {
  const i = main.findIndex((b) => b.type === 'article' && b.number === '1');
  const first =
    i === -1 ? undefined : (main[i] as Extract<Block, { type: 'article' }>);
  const a = first?.clauses.find((c) => c.label === '(a)');
  const text = plain(a?.text ?? '');
  const word =
    input.type === 'regulation'
      ? 'Regulation'
      : /\bPolicy\b/i.test(input.title)
        ? 'Policy'
        : 'Guideline';
  const pos = i === -1 ? 0 : firstPos(i);
  const example = `“This ${word} is made under Article 12 (a) of Act Number 2/2026 (Public Bonds Companies Act).”`;
  const m = ENABLING.exec(text);
  if (!m) {
    if (
      /\bmade under\b|\bissued under\b|\bpursuant to\b|\bin exercise of\b/i.test(
        text,
      )
    )
      add(
        'enabling',
        'error',
        pos,
        'Article 1 (a)',
        `State the enabling provision in the set form: ${example}`,
        quote(a?.text ?? ''),
      );
    else if (input.type === 'regulation')
      add(
        'enabling',
        'error',
        pos,
        'Article 1 (a)',
        `A Regulation is made only under an enabling provision of an Act or an Order, stated in Article 1 (a): ${example}`,
        a?.text ? quote(a.text) : undefined,
      );
    else
      add(
        'enabling',
        'warning',
        pos,
        'Article 1 (a)',
        `No enabling provision is stated. That’s right only if this ${word} covers ${input.issuingBody}’s own functions (point 10 (b)); otherwise Article 1 (a) states it: ${example}`,
        a?.text ? quote(a.text) : undefined,
      );
    return;
  }
  const [, selfWord, provision, typeWord, number, title] = m;
  if (selfWord !== word)
    add(
      'self-reference',
      'warning',
      pos,
      'Article 1 (a)',
      `This document calls itself “this ${word}”.`,
      quote(text),
    );
  const from = citedType(typeWord);
  const allowed =
    input.type === 'regulation'
      ? ['act', 'order']
      : ['act', 'order', 'regulation'];
  if (!allowed.includes(from))
    add(
      'enabling',
      'error',
      pos,
      'Article 1 (a)',
      `${input.type === 'regulation' ? 'A Regulation is made only under an Act or an Order' : 'A Guideline is made only under an Act, an Order or a Regulation'} (point 14); not under a ${typeWord}.`,
      quote(text),
    );
  if (provision.startsWith('point') !== (from === 'order'))
    add(
      'enabling',
      'error',
      pos,
      'Article 1 (a)',
      from === 'order'
        ? 'An Order’s provisions are points: “point 4 (a) of President’s Order Number …”.'
        : `A ${typeWord}’s provisions are Articles: “Article 12 (a) of ${typeWord} Number …”.`,
      quote(text),
    );
  const parts = numberParts(number)!;
  const entry = registered(from, parts.serial, parts.year);
  if (!entry)
    add(
      'enabling',
      'warning',
      pos,
      'Article 1 (a)',
      `The enabling ${typeWord}, Number ${number}, isn’t in the Gazette Register; a ${word} can only be made under a published document.`,
      quote(text),
    );
  else if (!sameTitle(entry.title, title))
    add(
      'enabling',
      'error',
      pos,
      'Article 1 (a)',
      `${typeWord} Number ${number} is titled “${entry.title}”.`,
      quote(text),
    );
}

// -- Acts, Regulations and Guidelines ------------------------------------------------------------

function checkArticles(
  input: CheckInput,
  main: Block[],
  segments: Segment[],
  add: Add,
  firstPos: (i: number) => number,
) {
  const articles = main
    .map((b, i) => ({ b, i }))
    .filter((x) => x.b.type === 'article') as {
    b: Extract<Block, { type: 'article' }>;
    i: number;
  }[];
  if (!articles.length) {
    add(
      'articles',
      'error',
      0,
      undefined,
      `${TYPES[input.type].tag}s are written in Articles; none were found in the text.`,
    );
    return;
  }
  const word = TYPES[input.type].tag;

  // Articles 1 to n, through the whole document; after a break, count on from the number printed
  let expected = 1;
  for (const { b, i } of articles) {
    if (b.number !== String(expected))
      add(
        'articles',
        'error',
        firstPos(i),
        `Article ${b.number}`,
        `Expected Article ${expected} here: Articles are numbered in order through the whole document, without restarting in a Chapter.`,
        `Article ${b.number}${b.title ? ` ${b.title}` : ''}`,
      );
    expected = /^\d+$/.test(b.number) ? Number(b.number) + 1 : expected + 1;
  }

  // Chapters in order
  let chapter = 0;
  main.forEach((b, i) => {
    if (b.type !== 'chapter') return;
    const text = plain(b.text);
    const m =
      /^([A-Za-z-]+) Chapter$/.exec(text) ??
      /^Chapter (\d+|[IVXLC]+)\b/.exec(text);
    if (!m) return;
    const n = /^\d+$/.test(m[1])
      ? Number(m[1])
      : (ordinalNumber(m[1]) ?? romanNumber(m[1]));
    if (n === null) return;
    if (n !== chapter + 1)
      add(
        'articles',
        'error',
        firstPos(i),
        text,
        `Expected the ${ordinal(chapter + 1)} Chapter here; Chapters are numbered in order.`,
        text,
      );
    chapter = n;
  });

  // (a), (b), (c), and (1), (2), (3) under them
  for (const { b, i } of articles)
    checkClauseLabels(b.clauses, `Article ${b.number}`, firstPos(i), add);

  // Article 1: Introduction and title
  const first = articles[0].b;
  if (first.number === '1') {
    if (
      !first.title ||
      plain(first.title).toLowerCase() !== 'introduction and title'
    )
      add(
        'opening-articles',
        'error',
        firstPos(articles[0].i),
        'Article 1',
        `Article 1 is titled “Introduction and title”.`,
        first.title ?? '(no title)',
      );
    const text = blocksText([first]);
    const cited = /\bcited as (?:the )?["“]([^"”]+)["”]/.exec(text);
    if (!cited)
      add(
        'opening-articles',
        'error',
        firstPos(articles[0].i),
        'Article 1',
        `Article 1 states the title the ${word} is cited by (“This ${word} shall be cited as …”).`,
      );
    else if (!sameTitle(cited[1], input.title))
      add(
        'opening-articles',
        'error',
        firstPos(articles[0].i),
        'Article 1',
        `Article 1 says it’s cited as “${cited[1].replace(/\.$/, '')}”, but the title given is “${input.title}”.`,
        quote(cited[0]),
      );
  }

  // Article 2: purpose
  const second = articles[1]?.b;
  if (
    second &&
    !/\bpurpose/i.test(`${second.title ?? ''} ${blocksText([second])}`)
  )
    add(
      'opening-articles',
      'error',
      firstPos(articles[1].i),
      'Article 2',
      `Article 2 sets out the ${word}’s purpose.`,
      second.title ?? '',
    );

  // the second last Article: commencement
  const commencement = (a: Extract<Block, { type: 'article' }>) =>
    /commencement|coming into force|comes? into force/i.test(
      `${a.title ?? ''}`,
    ) ||
    /\bcomes? into force\b|\bshall come into force\b/i.test(
      blocksText([a]).split('\n').slice(0, 3).join(' '),
    );
  if (articles.length >= 2) {
    const secondLast = articles[articles.length - 2];
    if (!commencement(secondLast.b)) {
      const actual = articles.find((a) => commencement(a.b));
      add(
        'commencement',
        'error',
        firstPos(secondLast.i),
        `Article ${secondLast.b.number}`,
        actual
          ? `The second last Article states when the ${word} comes into force; here that’s Article ${actual.b.number} (${actual.b.title}), not the second last (Article ${secondLast.b.number}).`
          : `The second last Article states when the ${word} comes into force; no Article does.`,
        secondLast.b.title ?? '',
      );
    }
  }
  // a commencement date written in the text, earlier than publication
  for (const { b, i } of articles.filter((a) => commencement(a.b))) {
    for (const m of blocksText([b]).matchAll(new RegExp(DATE_PATTERN, 'g'))) {
      const date = isoDate(m[1], m[2], m[3]);
      if (
        isIsoDate(input.publishedOn) &&
        date < input.publishedOn &&
        !/\bwith effect from\b|\bretrospective|\bretroactive/i.test(
          blocksText([b]),
        )
      )
        add(
          'commencement',
          'warning',
          firstPos(i),
          `Article ${b.number}`,
          `Gives ${m[0]}, before publication; a document has no effect before it’s published unless it says so expressly (point 33).`,
          m[0],
        );
    }
  }

  // the signatures and the date signed
  const lastArticle = articles[articles.length - 1].i;
  const tail = main.slice(lastArticle + 1);
  const signatures = tail.find((b) => b.type === 'signatures');
  const endPos = segments.length ? segments[segments.length - 1].pos : 0;
  if (
    !signatures ||
    signatures.type !== 'signatures' ||
    !signatures.items.some((s) => s.name.trim())
  ) {
    add(
      'signed',
      'error',
      endPos,
      'End of the document',
      `The ${word} ends with the name, position and signature of the person who issues it, the date signed and the stamp; no signatures were found after the last Article.`,
    );
  } else {
    if (!signatures.items.some((s) => s.title?.trim()))
      add(
        'signed',
        'error',
        endPos,
        'signatures',
        'The signature block gives the signer’s position.',
      );
    if (!new RegExp(DATE_PATTERN).test(blocksText(tail)))
      add(
        'signed',
        'warning',
        endPos,
        'signatures',
        'No date of signing was found with the signatures.',
      );
  }
}

// the place of a letter label in the run (a) … (z), (aa) …, or -1
function letterIndex(label: string): number {
  for (let n = 0; n < 702; n++) if (`(${letters(n)})` === label) return n;
  return -1;
}

// (a), (b), (c) in order, and (1), (2), (3) under each; after a break, count on from the label
// printed, so one slip is reported once
function checkClauseLabels(
  clauses: Clause[],
  where: string,
  pos: number,
  add: Add,
) {
  let n = 0;
  for (const clause of clauses) {
    if (clause.label) {
      const expected = `(${letters(n)})`;
      const at = letterIndex(clause.label);
      if (clause.label !== expected)
        add(
          'points',
          'error',
          pos,
          `${where} ${clause.label}`,
          at >= 0
            ? `Expected ${expected} here; points run (a), (b), (c) in order.`
            : `Points of an Article are lettered (a), (b), (c); “${clause.label}” should be ${expected}.`,
          clause.text ? quote(clause.text) : clause.label,
        );
      n = at >= 0 ? at + 1 : n + 1;
    }
    let m = 1;
    for (const item of clause.items ?? []) {
      if (!item.label) continue;
      const expected = `(${m})`;
      const printed = /^\((\d+)\)$/.exec(item.label);
      if (item.label !== expected)
        add(
          'points',
          'error',
          pos,
          `${where} ${clause.label ?? ''}${item.label}`,
          printed
            ? `Expected ${expected} here; the points under a point run (1), (2), (3).`
            : `The points under a point are numbered (1), (2), (3); “${item.label}” should be ${expected}.`,
          item.text ? quote(item.text) : item.label,
        );
      m = printed ? Number(printed[1]) + 1 : m + 1;
    }
  }
}

// -- President's Orders --------------------------------------------------------------------------

function checkOrderLayout(
  input: CheckInput,
  main: Block[],
  segments: Segment[],
  add: Add,
  firstPos: (i: number) => number,
  {
    titlesChanged,
    isFoundingOrder,
  }: { titlesChanged: boolean; isFoundingOrder: boolean },
) {
  // Director's Orders 01 and 02/2026 use the old names; before 02/2026 is in force either is right
  const words = isFoundingOrder
    ? ['Director']
    : titlesChanged
      ? ['President']
      : ['President', 'Director'];
  const named = (w: string) => `${w}’s Order`;
  const expectedName = named(words[0]);
  const anyName = new RegExp(`^(${words.join('|')})'s Order`);

  if (main.some((b) => b.type === 'article' || b.type === 'chapter'))
    add(
      'order-layout',
      'error',
      0,
      undefined,
      'An Order is written in numbered points (1., 2., …), not in Articles or Chapters (point 21).',
    );

  const headings = main
    .slice(0, 4)
    .filter((b) => b.type === 'heading')
    .map((b) => plain((b as { text: string }).text));
  const numberLine = headings[0];
  if (!numberLine || !anyName.test(numberLine) || !/ Number /.test(numberLine))
    add(
      'order-layout',
      'error',
      0,
      'opening',
      `An Order opens with its number: “${expectedName} Number ${input.docNumber}”.`,
      numberLine,
    );
  else {
    const printed = numberParts(numberLine);
    const own = numberParts(input.docNumber);
    if (
      !printed ||
      !own ||
      printed.serial !== own.serial ||
      printed.year !== own.year
    )
      add(
        'order-layout',
        'error',
        0,
        'opening',
        `The Order prints its number as “${numberLine}”, but the number given is ${input.docNumber}.`,
        numberLine,
      );
    else if (!numberLine.endsWith(` Number ${input.docNumber.trim()}`))
      add(
        'order-layout',
        'warning',
        0,
        'opening',
        `The printed number “${numberLine.replace(/^.* Number /, '')}” is written differently from ${input.docNumber}.`,
        numberLine,
      );
  }
  if (!headings[1] || !sameTitle(headings[1], input.title))
    add(
      'order-layout',
      'error',
      0,
      'opening',
      `The title follows the number: “${input.title}”.`,
      headings[1],
    );
  if (
    !headings[2] ||
    !anyName.test(headings[2]) ||
    / Number /.test(headings[2])
  )
    add(
      'order-layout',
      'error',
      0,
      'opening',
      `After the title come the words “${expectedName}”.`,
      headings[2],
    );

  const parts = orderParts(main);
  const paragraphs = main
    .map((b, i) => ({ b, i }))
    .filter((x) => x.b.type === 'paragraph') as {
    b: { text: string };
    i: number;
  }[];
  const statement = paragraphs.find((p) =>
    /^I, .+ state the following\.?$/.test(plain(p.b.text)),
  );
  const holder = new RegExp(
    `, (${words.join('|')}) of the Continental Security Agency,`,
  );
  if (!statement)
    add(
      'order-layout',
      'error',
      0,
      'opening',
      `The ${words[0]} introduces the Order in the first person: “I, [name], ${words[0]} of the Continental Security Agency, state the following.”`,
    );
  else if (!holder.test(plain(statement.b.text)))
    add(
      'order-layout',
      'error',
      firstPos(statement.i),
      'opening',
      `The statement names the ${words[0]} of the Continental Security Agency.`,
      quote(statement.b.text),
    );

  if (parts.whereas === undefined || parts.reasons === undefined)
    add(
      'order-layout',
      'error',
      0,
      'opening',
      'The reasons for the Order follow “Whereas:”, numbered 1., 2., 3.',
    );
  else {
    const list = main[parts.reasons];
    if (list.type === 'list')
      list.items.forEach((item, n) => {
        const where = `Whereas, reason ${pointNumber(item.label) || n + 1}`;
        const pos =
          segments.find((s) => s.where === where)?.pos ??
          firstPos(parts.reasons!);
        if (pointNumber(item.label) !== String(n + 1))
          add(
            'order-layout',
            'error',
            pos,
            where,
            `Expected reason ${n + 1}. here; the reasons are numbered 1., 2., 3.`,
            quote(item.text),
          );
        if (!/;(\s+(and|or))?$/.test(plain(item.text)))
          add(
            'order-layout',
            'warning',
            pos,
            where,
            'Each reason ends with a semicolon (“…;” or “…; and”).',
            quote(item.text),
          );
      });
  }
  if (parts.authority === undefined)
    add(
      'order-layout',
      'error',
      0,
      'opening',
      'The Order states the authority it’s issued under: “Under the authority vested in …,”.',
    );
  if (parts.decision === undefined)
    add(
      'order-layout',
      'error',
      0,
      'opening',
      `The decision is in the first person: “I, [name], ${words[0]} of the Continental Security Agency, hereby …”.`,
    );
  else if (!holder.test(plain((main[parts.decision] as { text: string }).text)))
    add(
      'order-layout',
      'error',
      firstPos(parts.decision),
      'decision',
      `The decision names the ${words[0]} of the Continental Security Agency.`,
      quote((main[parts.decision] as { text: string }).text),
    );

  // the points: 1., 2., 3. through every list after the decision, with (a), (b) under them
  if (!parts.points.length)
    add(
      'order-layout',
      'error',
      0,
      undefined,
      'No numbered points were found after the decision.',
    );
  let n = 1;
  for (const i of parts.points) {
    const list = main[i];
    if (list.type !== 'list') continue;
    for (const item of list.items) {
      const label = pointNumber(item.label);
      const pos =
        segments.find((s) => s.where === `point ${label}`)?.pos ?? firstPos(i);
      if (item.label !== `${n}.`)
        add(
          'points',
          'error',
          pos,
          `point ${label}`,
          `Expected point ${n}. here; the points of an Order are numbered 1., 2., 3.`,
          quote(item.text),
        );
      n = /^\d+$/.test(label) ? Number(label) + 1 : n + 1;
      let k = 0;
      for (const sub of item.items ?? []) {
        if (!sub.label) continue;
        const at = letterIndex(sub.label);
        if (sub.label !== `(${letters(k)})`)
          add(
            'points',
            'error',
            pos,
            `point ${label} ${sub.label}`,
            `Expected (${letters(k)}) here; the points under a point run (a), (b), (c).`,
            quote(sub.text ?? ''),
          );
        k = at >= 0 ? at + 1 : k + 1;
      }
    }
  }

  // where and when it was issued
  const office = words.map((w) => `The ${w}'s Office`);
  const issued = paragraphs.find((p) =>
    /^This Order was issued on\b/.test(plain(p.b.text)),
  );
  const issuedPattern = new RegExp(
    `^This Order was issued on ${DATE_PATTERN} at (${office.join('|')}), Washington, D\\.C\\.$`,
  );
  if (!issued)
    add(
      'order-layout',
      'error',
      segments.at(-1)?.pos ?? 0,
      'end',
      `The Order ends by stating when and where it was issued: “This Order was issued on DD Month YYYY at ${office[0].replace("'", '’')}, Washington, D.C.”`,
    );
  else {
    const m = issuedPattern.exec(plain(issued.b.text));
    if (!m)
      add(
        'order-layout',
        'error',
        firstPos(issued.i),
        'end',
        `Write it as: “This Order was issued on DD Month YYYY at ${office[0].replace("'", '’')}, Washington, D.C.”`,
        quote(issued.b.text),
      );
    else if (
      isIsoDate(input.publishedOn) &&
      isoDate(m[1], m[2], m[3]) > input.publishedOn
    )
      add(
        'order-layout',
        'error',
        firstPos(issued.i),
        'end',
        `The Order was issued on ${m[1]} ${m[2]} ${m[3]}, after the publication date; it can’t be published before it’s issued.`,
        quote(issued.b.text),
      );
  }

  // the signature
  const signatures = main
    .filter((b) => b.type === 'signatures')
    .flatMap((b) => (b.type === 'signatures' ? b.items : []));
  if (!signatures.length)
    add(
      'signed',
      'error',
      segments.at(-1)?.pos ?? 0,
      'end',
      `The Order ends with the signature, name and title of the ${words[0]}.`,
    );
  else if (!signatures.some((s) => s.title && words.includes(plain(s.title))))
    add(
      'signed',
      'error',
      segments.at(-1)?.pos ?? 0,
      'signatures',
      `The Order is signed by the ${words[0]}, with the title “${words[0]}”.`,
      signatures.map((s) => `${s.name}, ${s.title ?? ''}`).join('; '),
    );
}

// -- Notices -------------------------------------------------------------------------------------

function checkNoticeLayout(
  input: CheckInput,
  main: Block[],
  segments: Segment[],
  add: Add,
) {
  const opening = blocksText(main.slice(0, 4));
  const ref = input.docNumber.trim();
  if (ref && !plain(opening).includes(plain(ref)))
    add(
      'notice-reference',
      'warning',
      0,
      'opening',
      `The reference number (${ref}) goes directly below the letterhead; it wasn’t found at the top.`,
    );
  if (
    !new RegExp(DATE_PATTERN).test(opening) &&
    !/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/.test(opening)
  )
    add(
      'notice-reference',
      'warning',
      0,
      'opening',
      'The date of the Notice goes directly below the letterhead, with the reference number; no date was found at the top.',
    );
  if (!main.some((b) => b.type === 'signatures'))
    add(
      'notice-reference',
      'warning',
      segments.at(-1)?.pos ?? 0,
      'end',
      'A Notice ends with the name, position and signature of the person who issues it, and the body’s stamp; no signatures were found.',
    );
}

// -- citations ----------------------------------------------------------------------------------

function checkCitations(
  input: CheckInput,
  seg: Segment,
  add: Add,
  registered: (t: string, s: number, y: number) => RegisterEntry | undefined,
) {
  const { clean, text, pos, where } = seg;
  for (const m of clean.matchAll(CITATION)) {
    const [, typeWord, number, bracket, title] = m;
    const q = quoteAt(text, m.index!, m[0].length);
    if (number.includes('#') || number.includes('year')) continue; // a form, not a citation
    const t = citedType(typeWord);
    const parts = numberParts(number)!;
    const prefix = TYPES[t].prefix ?? '';
    if (prefix && !number.startsWith(prefix)) {
      add(
        'citation',
        'error',
        pos,
        where,
        `${typeWord} numbers are written ${prefix}#/year: “${typeWord} Number ${prefix}${parts.serial}/${parts.year}”.`,
        q,
      );
      continue;
    }
    if (!prefix && parts.prefix) {
      add(
        'citation',
        'error',
        pos,
        where,
        `${typeWord} numbers have no prefix: “${typeWord} Number ${parts.serial}/${parts.year}”.`,
        q,
      );
      continue;
    }
    // the document citing itself (an Appendix does)
    const self =
      t === input.type &&
      numberParts(input.docNumber)?.serial === parts.serial &&
      numberParts(input.docNumber)?.year === parts.year;
    // an Order's own number line ("President's Order Number 03/2026") isn't a citation
    if (self && seg.kind === 'heading' && plain(text) === plain(m[0])) continue;
    const entry = self
      ? { title: input.title }
      : registered(t, parts.serial, parts.year);
    if (!bracket) {
      add(
        'citation',
        'error',
        pos,
        where,
        `Cite it in full, with its title in brackets: “${typeWord} Number ${number} (${entry?.title ?? 'title'})”.`,
        q,
      );
      continue;
    }
    if (!entry)
      add(
        'citation',
        'warning',
        pos,
        where,
        `${typeWord} Number ${number} isn’t in the Gazette Register.`,
        q,
      );
    else if (!sameTitle(entry.title, title))
      add(
        'citation',
        'error',
        pos,
        where,
        `${typeWord} Number ${number} is titled “${entry.title}”, not “${title}”.`,
        q,
      );
  }
  // the forms that aren't allowed: "Act No. 2/2026", "Issue Number 2/2026", "Law No. 1/2026"
  for (const m of clean.matchAll(
    /\b(Act|Law|Order|Regulation|Guideline|Policy|Issue)\s+(No\.?|#|Number)\s*:?\s*((?:[RG]-)?\d{1,4}\/\d{4})/g,
  )) {
    const [, word, , number] = m;
    const before = clean.slice(Math.max(0, m.index! - 12), m.index);
    if (word === 'Order' && m[2] === 'Number' && /['’]s\s*$/.test(before))
      continue; // "President's Order Number" is the right form
    if (
      m[2] === 'Number' &&
      ['Act', 'Regulation', 'Guideline', 'Policy'].includes(word)
    )
      continue;
    const as =
      word === 'Issue' || word === 'Law'
        ? 'Act'
        : word === 'Order'
          ? "President's Order"
          : word;
    add(
      'citation',
      'error',
      pos,
      where,
      `Cite documents by type, number and title: “${as} Number ${number} (title)”, not “${m[0]}”.`,
      quoteAt(text, m.index!, m[0].length),
    );
  }
}

function checkInternalCitations(
  input: CheckInput,
  seg: Segment,
  add: Add,
  articles: Map<string, Clause[]>,
  points: Map<string, Clause[]>,
  appendixCount: number,
) {
  const { clean, text, pos, where } = seg;
  const articled =
    input.type === 'act' ||
    input.type === 'regulation' ||
    input.type === 'guideline';
  const q = (m: RegExpMatchArray) => quoteAt(text, m.index!, m[0].length);
  const labelsOf = (raw: string) =>
    [...raw.matchAll(/\(([a-z]{1,2}|\d{1,3})\)/g)].map((x) => `(${x[1]})`);
  // does Article n (or point n), with these points under it, exist?
  const exists = (map: Map<string, Clause[]>, n: string, labels: string[]) => {
    const clauses = map.get(n);
    if (!clauses) return false;
    const [first, second] = labels;
    if (!first) return true;
    // "(1)" straight under an Article whose opening words have no letter
    if (/^\(\d+\)$/.test(first))
      return clauses.some(
        (c) => !c.label && c.items?.some((i) => i.label === first),
      );
    const clause = clauses.find((c) => c.label === first);
    if (!clause) return false;
    return !second || !!clause.items?.some((i) => i.label === second);
  };

  if (articled || input.type === 'notice') {
    // ranges: "Articles 28 to 40 of this Act"
    for (const m of clean.matchAll(
      /\bArticles (\d+)\s*(to|and|-|–|—)\s*(\d+)(\s+of\s+(this \w+|[^,;.]{0,60}))?/g,
    )) {
      const internal = !m[4] || /^this /i.test(m[5] ?? '');
      if (!internal) continue;
      if (['-', '–', '—'].includes(m[2]))
        add(
          'internal-citation',
          'warning',
          pos,
          where,
          `Write a range as “Articles ${m[1]} to ${m[3]}”.`,
          q(m),
        );
      if (articled && (!articles.has(m[1]) || !articles.has(m[3])))
        add(
          'internal-citation',
          'error',
          pos,
          where,
          `There is no Article ${articles.has(m[1]) ? m[3] : m[1]} in this ${TYPES[input.type].tag}.`,
          q(m),
        );
    }
    // "Article 5 (a)(1) of this Act"
    for (const m of clean.matchAll(
      /\bArticle (\d+)((?:\s*\((?:[a-z]{1,2}|\d{1,3})\))*)(\s+(?:or|and)\s+Article \d+)?(\s+of\s+([^,;.]{0,80}))?/g,
    )) {
      const of = m[5] ?? '';
      const internal =
        !m[4] ||
        /^this (Act|Regulation|Guideline|Policy|Order|Notice)\b/i.test(of);
      if (!internal) continue; // another document's Article, checked as a citation
      if (input.type === 'notice') continue;
      const labels = labelsOf(m[2]);
      if (m[2] && !m[2].startsWith(' (') && m[2].trim())
        add(
          'internal-citation',
          'warning',
          pos,
          where,
          `Leave a space after the Article number: “Article ${m[1]} ${labels.join('')}”.`,
          q(m),
        );
      else if (/\)\s+\(/.test(m[2]))
        add(
          'internal-citation',
          'warning',
          pos,
          where,
          `Write the points together: “Article ${m[1]} ${labels.join('')}”.`,
          q(m),
        );
      if (!m[4] && !m[3])
        add(
          'internal-citation',
          'warning',
          pos,
          where,
          `Cite another Article as “Article ${m[1]}${labels.length ? ` ${labels.join('')}` : ''} of this ${TYPES[input.type].tag}”.`,
          q(m),
        );
      if (!exists(articles, m[1], labels))
        add(
          'internal-citation',
          'error',
          pos,
          where,
          articles.has(m[1])
            ? `Article ${m[1]} has no ${labels.join('')}.`
            : `There is no Article ${m[1]} in this ${TYPES[input.type].tag}.`,
          q(m),
        );
    }
    // "(a)(1) of this Article"
    if (seg.article)
      for (const m of clean.matchAll(
        /((?:\((?:[a-z]{1,2}|\d{1,3})\))+) of this Article\b/g,
      )) {
        const labels = labelsOf(m[1]);
        if (!exists(articles, seg.article, labels))
          add(
            'internal-citation',
            'error',
            pos,
            where,
            `Article ${seg.article} has no ${labels.join('')}.`,
            q(m),
          );
      }
  }

  if (input.type === 'order') {
    for (const m of clean.matchAll(
      /\bArticle \d+[^,;.]{0,30}? of this Order\b/g,
    ))
      add(
        'internal-citation',
        'error',
        pos,
        where,
        'An Order has points, not Articles: cite “point 5 (a) of this Order”.',
        q(m),
      );
    for (const m of clean.matchAll(
      /\bpoint (\d+)((?:\s*\([a-z]{1,2}\))*)\s+of\s+(this Order|[^,;.]{0,60})/g,
    )) {
      if (m[3] !== 'this Order') continue;
      const labels = labelsOf(m[2]);
      if (!exists(points, m[1], labels))
        add(
          'internal-citation',
          'error',
          pos,
          where,
          points.has(m[1])
            ? `Point ${m[1]} has no ${labels.join('')}.`
            : `There is no point ${m[1]} in this Order.`,
          q(m),
        );
    }
    if (seg.point)
      for (const m of clean.matchAll(/(\([a-z]{1,2}\)) of this point\b/g))
        if (!exists(points, seg.point, [m[1]]))
          add(
            'internal-citation',
            'error',
            pos,
            where,
            `Point ${seg.point} has no ${m[1]}.`,
            q(m),
          );
  }

  // "Appendix 2 of this Regulation"
  for (const m of clean.matchAll(
    /\bAppendix (\d+) of this (Act|Order|Regulation|Guideline|Policy)\b/g,
  ))
    if (Number(m[1]) > appendixCount || Number(m[1]) < 1)
      add(
        'internal-citation',
        'error',
        pos,
        where,
        appendixCount
          ? `There ${appendixCount === 1 ? 'is 1 Appendix' : `are ${appendixCount} Appendices`}, so there’s no Appendix ${m[1]}.`
          : `There are no Appendices, so there’s no Appendix ${m[1]}.`,
        q(m),
      );
}

// -- bodies and documents created ----------------------------------------------------------------

function checkBodies(input: CheckInput, seg: Segment, add: Add) {
  const { clean, text, pos, where } = seg;
  const t = input.type;
  const q = (m: RegExpMatchArray) => quoteAt(text, m.index!, m[0].length);
  if (seg.appendix !== undefined) return;

  if (t === 'regulation' || t === 'guideline' || t === 'notice')
    for (const m of clean.matchAll(
      /\b(?:is|are) (?:hereby )?established\b|\bhereby establish(?:es)?\b|\bthere (?:is|shall be) established\b/gi,
    ))
      add(
        'bodies',
        'warning',
        pos,
        where,
        `Only an Act or an Order can establish a body (point 16); ${t === 'notice' ? 'a Notice' : `a ${TYPES[t].tag}`} can’t.`,
        q(m),
      );

  // what may make what (point 14)
  const makes =
    /\bmay (?:make|issue|create) (?:an? )?(Acts?|Orders?|President['’]s Orders?|Director['’]s Orders?|Regulations?|Guidelines?|Policies|Policy)\b/gi;
  for (const m of clean.matchAll(makes)) {
    const made = m[1].toLowerCase();
    if (/^acts?$|order/.test(made))
      add(
        'bodies',
        'error',
        pos,
        where,
        'No document creates an Act or an Order (point 14 (f)).',
        q(m),
      );
    else if (t === 'guideline')
      add(
        'bodies',
        'warning',
        pos,
        where,
        'A Guideline creates no other documents; it may only have Appendices (point 14 (d)).',
        q(m),
      );
    else if (t === 'notice')
      add(
        'bodies',
        'warning',
        pos,
        where,
        'A Notice creates no other documents (point 14 (e)).',
        q(m),
      );
    else if (t === 'regulation' && /^regulations?$/.test(made))
      add(
        'bodies',
        'warning',
        pos,
        where,
        'A Regulation may create only Guidelines (point 14 (c)).',
        q(m),
      );
  }

  // what a Notice is for (point 11)
  if (t === 'notice')
    for (const m of clean.matchAll(
      /\b(?:is|are) (?:hereby )?(?:amended|repealed|revoked|rescinded)\b|\bhereby (?:amend|repeal|revoke|rescind)s?\b|\bshall be (?:amended|repealed)\b|\bthe following rules?\b/gi,
    ))
      add(
        'notice-content',
        'warning',
        pos,
        where,
        'A Notice doesn’t create, amend or repeal rules; that takes a document of the rule’s own type (points 11 and 36).',
        q(m),
      );
}

// -- the titles of Director's Order 02/2026 --------------------------------------------------------

const RENAMED: [RegExp, (m: RegExpMatchArray) => string][] = [
  [
    /\bDeputy Director of the (?:Continental Security Agency|CSA)\b/g,
    () => 'Vice President of the Continental Security Agency',
  ],
  [/\bDirector of Security\b/g, () => 'President'],
  [
    /\b(?<!Deputy )Director of the (?:Continental Security Agency|CSA)\b/g,
    () => 'President of the Continental Security Agency',
  ],
  [/\b[Tt]he Director['’]s Office\b/g, () => 'The President’s Office'],
  [/\bwww\.tdo\.csa\b/g, () => 'www.presidency.csa'],
  [/@tdo\.csa\b/g, () => '@po.csa'],
  [/(?<![@.\w])tdo\.csa\b/g, () => 'presidency.csa'],
  // "the Deputy Director", but not a Deputy Director of something else or a Deputy Director-General
  [
    /\b[Tt]he Deputy Director\b(?![-–]|\s+of\s+(?!the Continental Security Agency\b|the CSA\b))/g,
    () => 'the Vice President',
  ],
  // "the Director", the CSA's head: not an Executive or Managing Director, a Director-General, the
  // Director of something else, or the Director's Office or Order (checked on their own)
  [
    /\b[Tt]he Director\b(?![-–]|s\b|\s+of\s+(?!the Continental Security Agency\b|the CSA\b)|['’]s (?:Office|Orders?)\b)/g,
    () => 'the President',
  ],
  // a Director's Order issued after 02/2026 is a President's Order
  [
    /\bDirector['’]s Order Number (?!0?[12]\/2026\b)\S+/g,
    (m) => m[0].replace(/Director['’]s/, 'President’s'),
  ],
];

const TERMINATED =
  /\b(?:Deputy )?Commanding Officer of the (?:Continental Security Agency|CSA)\b|\bAdjutant of the (?:Continental Security Agency|CSA)\b/g;

function checkTitles(seg: Segment, add: Add) {
  const { clean, text, pos, where } = seg;
  const taken: [number, number][] = [];
  for (const [pattern, replacement] of RENAMED) {
    for (const m of clean.matchAll(pattern)) {
      const start = m.index!;
      if (taken.some(([a, b]) => start < b && start + m[0].length > a))
        continue;
      taken.push([start, start + m[0].length]);
      add(
        'titles',
        'error',
        pos,
        where,
        `“${m[0]}” is now “${replacement(m)}” (Director’s Order 02/2026).`,
        quoteAt(text, start, m[0].length),
      );
    }
  }
  if (seg.kind === 'signature' && /^Director$/m.test(text))
    add(
      'titles',
      'error',
      pos,
      where,
      'The title “Director” is now “President” (Director’s Order 02/2026).',
      quote(text),
    );
  for (const m of clean.matchAll(TERMINATED))
    add(
      'titles',
      'error',
      pos,
      where,
      `“${m[0]}” is a terminated title (Director’s Order 02/2026).`,
      quoteAt(text, m.index!, m[0].length),
    );
}

// -- appendices ----------------------------------------------------------------------------------

function checkAppendices(
  input: CheckInput,
  main: Block[],
  appendices: Appendix[],
  segments: Segment[],
  add: Add,
  articles: Map<string, Clause[]>,
  points: Map<string, Clause[]>,
) {
  const mainText = segments
    .filter((s) => s.appendix === undefined)
    .map((s) => s.clean)
    .join('\n');
  const endOfMain =
    segments.filter((s) => s.appendix === undefined).at(-1)?.pos ?? 0;

  // "Schedules" are Appendices
  for (const seg of segments)
    for (const m of seg.clean.matchAll(
      /\bSchedules? \d+\b|\b(?:the|these|its) Schedules\b/g,
    ))
      add(
        'appendices',
        'error',
        seg.pos,
        seg.where,
        'The schedules of a document are called Appendices (point 22).',
        quoteAt(seg.text, m.index!, m[0].length),
      );

  appendices.forEach((appendix, i) => {
    const pos = segments.find((s) => s.appendix === i)?.pos ?? endOfMain;
    const where = appendix.label;
    const n = i + 1;
    if (appendix.number !== undefined && appendix.number !== n)
      add(
        'appendices',
        'error',
        pos,
        where,
        `Expected Appendix ${n} here; Appendices are numbered in order.`,
      );
    const first = plain(appendix.firstPageText);
    const number = appendix.number ?? n;
    if (!new RegExp(`\\bAppendix ${number}\\b`).test(first))
      add(
        'appendices',
        'error',
        pos,
        where,
        `The first page carries the Appendix number in a header: “Appendix ${number}” wasn’t found on it.`,
      );

    // the opening line: "the [subject] stated in Article # (x) of [body]'s Regulation Number R-#/year (title)"
    const opening =
      /\bstated in ((?:Article|point) (\d+)((?:\s*\([a-z0-9]{1,3}\))*)) of (.{1,120}?)['’]s (Act|President's Order|Director's Order|Regulation|Guideline|Policy|Issue) Number ((?:[RG]-)?\d{1,4}\/\d{4})(?: \(([^)]+)\))?/.exec(
        first,
      );
    const expectedDoc = citeForm(input);
    if (!opening) {
      add(
        'appendices',
        'error',
        pos,
        where,
        `The Appendix opens by citing the provision that refers to it: “the [subject] stated in Article # (x) of ${input.issuingBody}’s ${expectedDoc}”.`,
        quote(first.split('\n')[0] ?? ''),
      );
    } else {
      const [, provision, provNumber, provLabels, body, typeWord, num, title] =
        opening;
      const ok =
        !/^this\b/i.test(body) &&
        plain(body).toLowerCase() === plain(input.issuingBody).toLowerCase() &&
        typeWord !== 'Issue' &&
        citedType(typeWord) === input.type &&
        numberParts(num)?.serial === numberParts(input.docNumber)?.serial &&
        numberParts(num)?.year === numberParts(input.docNumber)?.year &&
        !!title &&
        sameTitle(title, input.title);
      if (!ok)
        add(
          'appendices',
          'error',
          pos,
          where,
          `Cite the document in full: “stated in ${provision} of ${input.issuingBody}’s ${expectedDoc}”.`,
          quote(opening[0]),
        );
      // the provision exists and refers to this Appendix
      const labels = [...provLabels.matchAll(/\(([a-z0-9]{1,3})\)/g)].map(
        (x) => `(${x[1]})`,
      );
      const map = provision.startsWith('point') ? points : articles;
      const clauses = map.get(provNumber);
      const clause = labels.length
        ? clauses?.find((c) => c.label === labels[0])
        : undefined;
      const refText = clause
        ? [
            clause.text ?? '',
            ...(clause.items ?? []).map((x) => x.text ?? ''),
          ].join(' ')
        : clauses
          ? clauses.map((c) => c.text ?? '').join(' ')
          : '';
      if (!clauses || (labels.length && !clause))
        add(
          'appendices',
          'error',
          pos,
          where,
          `The opening line cites ${provision}, which isn’t in the document.`,
          quote(opening[0]),
        );
      else if (!new RegExp(`\\bAppendix ${number}\\b`).test(refText))
        add(
          'appendices',
          'warning',
          pos,
          where,
          `${provision} doesn’t mention Appendix ${number}.`,
          quote(opening[0]),
        );
    }
    if (!new RegExp(`\\bAppendix ${number}\\b`).test(mainText))
      add(
        'appendices',
        'warning',
        pos,
        where,
        `Nothing in the ${TYPES[input.type]?.tag ?? 'document'} refers to Appendix ${number}.`,
      );
  });
  void main;
}
