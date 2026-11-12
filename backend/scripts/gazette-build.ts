// Builds a release's finished PDF from the document as signed, the way the portal's Publish builds an
// issue: the Gazette cover in front, the President's initials on every page of an Order but the cover
// and the signed last page, and the PDF's details. It's for a release whose PDF wasn't made in the
// portal (President's Order Number 04/2026 in Dhivehi came signed, with no cover or initials).
//
//   npm run gazette:build -- presidents-order-04-2026-dv
//
// The release names its signed PDF and, for a cover with its own number line (a Dhivehi one), that
// line; the cover's Volume, Number and date are the release's place and publication date, which
// gazette-release.ts checks against the Register before publishing. Nothing here touches a database,
// and the same release always gives the same file.

import { readFileSync, writeFileSync } from 'node:fs';
import { buildIssue, coverProblems, type CoverText } from '../src/gazette/cover.js';
import { coverNumberLine, gazetteRef } from '../src/gazette/numbering.js';

interface Release {
  type: string;
  docNumber: string;
  title: string;
  publishedOn: string;
  cover: boolean;
  place: { serial: number; volume: number; number: number };
  pdf: string;
  build?: { signed: string; numberLine?: string };
}

const name = process.argv[2];
if (!name || !/^[a-z0-9-]+$/.test(name)) {
  console.error('Name a release in scripts/releases/, e.g. presidents-order-04-2026-dv.');
  process.exit(1);
}

const folder = new URL('./releases/', import.meta.url);
const release = JSON.parse(readFileSync(new URL(`${name}.json`, folder), 'utf8')) as Release;
if (!release.build) {
  console.error(`${name}.json has no "build": its PDF is the finished one, published as it is.`);
  process.exit(1);
}

const main = new Uint8Array(readFileSync(new URL(release.build.signed, folder)));
const { volume, number } = release.place;
const cover: CoverText | undefined = release.cover
  ? { volume, number, date: release.publishedOn, numberLine: release.build.numberLine ?? coverNumberLine(release.type, release.docNumber), title: release.title }
  : undefined;
const problems = cover ? coverProblems(cover) : [];
if (problems.length) {
  console.error(`The cover can't be made:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

const pdf = await buildIssue({
  main,
  appendices: [],
  cover,
  initialled: release.type === 'order',
  info: { title: release.title, subject: `CSA Gazette, ${gazetteRef(volume, number)}`, date: release.publishedOn },
});
writeFileSync(new URL(release.pdf, folder), pdf);
console.log(`Built ${release.pdf} (${(pdf.length / 1024).toFixed(0)} KB) from ${release.build.signed}${cover ? `, with the cover for Volume ${volume}, Number ${number}` : ''}.`);
