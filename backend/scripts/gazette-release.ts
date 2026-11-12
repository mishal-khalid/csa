// Publishes a document in the Gazette from a release in scripts/releases/: its finished PDF (cover,
// initials and all) and its text, written out by hand as printed. It's for a document the portal's
// reader can't read cleanly, the way Director's Order Number 01/2026 was published before the
// Gazette tab existed. A release whose PDF was made outside the portal is built first by
// gazette-build.ts.
//
//   npm run gazette:release -- presidents-order-04-2026            (the local database)
//   npm run supabase:gazette-release -- presidents-order-04-2026   (the live one)
//   add --dry-run to see what it would do without changing anything
//
// It publishes the way the portal's Publish does: one publication at a time, the Register's next
// place, the document's own series number, the PDF in the public "gazette" bucket, and a
// GAZETTE_PUBLISHED record. The PDF is published as it is, since its cover already prints the
// Volume, Number and date, so the release names the place it expects and nothing is published if
// the Register would give it another one. A draft of the same document in the portal becomes the
// published document, so the Register doesn't hold it twice. The rules check isn't run.
//
// A document published in English and in Dhivehi has an entry for each language, with the same type
// and number (the user's pick for President's Order Number 04/2026 in Dhivehi): the same document is
// the same type, number and language. The number's place in its series (point 18 of Director's Order
// Number 01/2026, and the database's unique key on it) belongs to the language published first; the
// other's entry shows the same number without taking the place again.

import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type GazetteDocument, type Prisma } from '../src/generated/prisma/client.js';
import { config } from '../src/config.js';
import type { Block } from '../src/gazette/blocks.js';
import { gazetteRef, nextPlace, referenceFor, type Placed } from '../src/gazette/numbering.js';
import { GazetteStorage } from '../src/gazette/storage.js';
import { isNewType, parseSeriesNumber } from '../src/gazette/types.js';

interface Release {
  type: string;
  docNumber: string;
  title: string;
  // "en" (the default) or "dv"
  language?: string;
  issuingBody: string;
  publishedOn: string;
  commencesOn: string | null;
  cover: boolean;
  place: { serial: number; volume: number; number: number };
  pdf: string;
  blocks: Block[];
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const name = args.find((arg) => !arg.startsWith('--'));
if (!name || !/^[a-z0-9-]+$/.test(name)) {
  console.error('Name a release in scripts/releases/, e.g. presidents-order-04-2026.');
  process.exit(1);
}

const folder = new URL('./releases/', import.meta.url);
const release = JSON.parse(readFileSync(new URL(`${name}.json`, folder), 'utf8')) as Release;
const pdf = new Uint8Array(readFileSync(new URL(release.pdf, folder)));
if (Buffer.from(pdf.subarray(0, 5)).toString() !== '%PDF-') throw new Error(`${release.pdf} isn't a PDF.`);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
const storage = new GazetteStorage();

const iso = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);
const day = (value: string) => new Date(`${value}T00:00:00Z`);
const placed = (doc: GazetteDocument): Placed => ({
  serial: doc.serial,
  number: doc.number,
  publishedOn: iso(doc.publishedOn),
  type: doc.type,
  docNumber: doc.docNumber,
});

const language = release.language ?? 'en';
const series = isNewType(release.type) ? parseSeriesNumber(release.type, release.docNumber) : null;
const reference = referenceFor(release.type, release.docNumber);
const label = `${reference}${language === 'en' ? '' : ` in ${language === 'dv' ? 'Dhivehi' : language}`} (${release.title})`;

try {
  // the same document (its type, number and language), as a draft or already published
  const same = (await prisma.gazetteDocument.findMany({ where: { type: release.type, language } })).filter(
    (doc) => doc.docNumber?.trim() === release.docNumber,
  );
  const done = same.find((doc) => doc.state === 'PUBLISHED');
  if (done) {
    console.log(`${label} is already published, at /g/${done.serial}. Nothing changed.`);
    process.exit(0);
  }
  const draft = same.find((doc) => doc.state === 'DRAFT') ?? null;

  const published = await prisma.gazetteDocument.findMany({ where: { state: 'PUBLISHED' } });
  const place = nextPlace(published.map(placed), release.publishedOn);
  const latest = published.map((doc) => iso(doc.publishedOn)).filter(Boolean).sort().at(-1);
  // the same document in another language, published already: it holds the number in the series
  const otherLanguage = series
    ? published.find((doc) => doc.type === release.type && doc.language !== language && doc.seriesYear === series.year && doc.seriesNumber === series.serial)
    : undefined;

  const problems = [
    place.serial !== release.place.serial || place.volume !== release.place.volume || place.number !== release.place.number
      ? `The Register's next place is /g/${place.serial}, Volume ${place.volume}, Number ${place.number}, but the PDF's cover prints Volume ${release.place.volume}, Number ${release.place.number} (/g/${release.place.serial}).`
      : null,
    latest && latest > release.publishedOn ? `It can't be published on ${release.publishedOn}, before the latest document (${latest}).` : null,
    series && published.some((doc) => doc.type === release.type && doc.language === language && doc.seriesYear === series.year && doc.seriesNumber === series.serial)
      ? `${reference} is already taken in the Register.`
      : null,
    isNewType(release.type) && !series ? `"${release.docNumber}" isn't a number in the ${release.type} series.` : null,
  ].filter(Boolean);
  if (problems.length) {
    console.error(`${label} wasn't published:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }

  console.log(
    [
      `${dryRun ? 'Would publish' : 'Publishing'} ${label}`,
      `  at /g/${place.serial}, ${gazetteRef(place.volume, place.number)}, on ${release.publishedOn}`,
      `  ${draft ? `from the portal's draft ${draft.id}` : 'as a new document (there is no draft of it)'}`,
      ...(otherLanguage ? [`  beside its ${otherLanguage.language} text at /g/${otherLanguage.serial}, which holds ${reference} in the series`] : []),
      `  PDF: ${release.pdf} (${(pdf.length / 1024).toFixed(0)} KB) to gazette/${place.serial}.pdf`,
      `  text: ${release.blocks.length} blocks, written out by hand`,
    ].join('\n'),
  );
  if (dryRun) process.exit(0);

  const fields = {
    state: 'PUBLISHED' as const,
    serial: place.serial,
    volume: place.volume,
    number: place.number,
    body: 'csa',
    type: release.type,
    docNumber: release.docNumber,
    seriesNumber: otherLanguage ? null : (series?.serial ?? null),
    seriesYear: otherLanguage ? null : (series?.year ?? null),
    reference,
    title: release.title,
    issuingBody: release.issuingBody,
    publishedOn: day(release.publishedOn),
    commencesOn: release.commencesOn ? day(release.commencesOn) : null,
    status: 'In Force',
    language,
    cover: release.cover,
    blocks: release.blocks as unknown as Prisma.InputJsonValue,
    // the reader's notes were about its own reading, which this text replaces
    notes: [] as Prisma.InputJsonValue,
    files: [{ label: 'View PDF', href: storage.publicUrl(`${place.serial}.pdf`) }] as unknown as Prisma.InputJsonValue,
    // published under the account that drafted it in the portal, if there's a draft
    publishedById: draft?.createdById ?? null,
    publishedAt: new Date(),
  };

  const doc = await prisma.$transaction(
    async (tx) => {
      // one publication at a time, the same lock as the portal's Publish
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(4206)`;
      const now = await tx.gazetteDocument.findMany({ where: { state: 'PUBLISHED' } });
      const again = nextPlace(now.map(placed), release.publishedOn);
      if (again.serial !== place.serial || again.number !== place.number) throw new Error('Something else was published meanwhile. Run it again.');
      await storage.put('gazette', `${place.serial}.pdf`, pdf);
      return draft
        ? tx.gazetteDocument.update({ where: { id: draft.id }, data: fields })
        : tx.gazetteDocument.create({ data: fields });
    },
    { timeout: 120_000, maxWait: 20_000 },
  );

  await prisma.authEvent.create({
    data: {
      type: 'GAZETTE_PUBLISHED',
      userId: doc.publishedById,
      targetId: doc.id,
      detail: `${doc.serial} ${doc.title}`.slice(0, 200) + `\nPublished from the release scripts/releases/${name}.json, with its text written out by hand.`,
    },
  });

  console.log(`Published at /g/${doc.serial}: ${(doc.files as { href: string }[])[0].href}`);
} finally {
  await prisma.$disconnect();
}
