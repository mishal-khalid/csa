// Loads the documents published before the portal's Gazette tab into the Gazette Register, from
// scripts/gazette-seed.json (the public Gazette's former hard-coded list and transcriptions). Their
// places (address, Volume, Number) are kept exactly as they were. Their PDFs stay where they are, in
// the website's own files (frontend/public/gazette).
//
//   npm run gazette:import            (the local database)
//   npm run supabase:gazette-import   (the live one)
//
// Running it again changes nothing that's already there: a document is matched by its old index
// and left alone.

import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client.js';
import { config } from '../src/config.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });

interface Seed {
  legacyIndex: string;
  serial: number;
  volume: number | null;
  number: number | null;
  body: string;
  type: string;
  title: string;
  reference: string | null;
  publishedOn: string;
  status: string;
  language: string;
  files: { label: string; href: string }[];
  issuingBody: string | null;
  blocks: unknown[];
  docNumber?: string;
  seriesNumber?: number;
  seriesYear?: number;
  tag?: string;
  cover?: boolean;
}

const seed = JSON.parse(readFileSync(new URL('./gazette-seed.json', import.meta.url), 'utf8')) as Seed[];

let added = 0;
for (const doc of seed) {
  const existing = await prisma.gazetteDocument.findUnique({ where: { legacyIndex: doc.legacyIndex } });
  if (existing) continue;
  const data: Prisma.GazetteDocumentCreateInput = {
    state: 'PUBLISHED',
    legacyIndex: doc.legacyIndex,
    serial: doc.serial,
    volume: doc.volume,
    number: doc.number,
    body: doc.body,
    type: doc.type,
    title: doc.title,
    reference: doc.reference,
    tag: doc.tag ?? null,
    docNumber: doc.docNumber ?? null,
    seriesNumber: doc.seriesNumber ?? null,
    seriesYear: doc.seriesYear ?? null,
    issuingBody: doc.issuingBody,
    publishedOn: new Date(`${doc.publishedOn}T00:00:00Z`),
    status: doc.status,
    language: doc.language,
    cover: doc.cover ?? false,
    blocks: doc.blocks as Prisma.InputJsonValue,
    files: doc.files as unknown as Prisma.InputJsonValue,
    publishedAt: new Date(`${doc.publishedOn}T00:00:00Z`),
  };
  await prisma.gazetteDocument.create({ data });
  added += 1;
}

console.log(`${added} document${added === 1 ? '' : 's'} added; ${seed.length - added} already there.`);
await prisma.$disconnect();
