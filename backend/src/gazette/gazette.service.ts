import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { GazetteDocument, Prisma, User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { AuthService, type Caller } from '../auth/auth.service.js';
import type { Block } from './blocks.js';
import { buildIssue, coverProblems, loadPdf, UnusablePdf, type CoverText } from './cover.js';
import { coverNumberLine, gazetteRef, nextPlace, nextSeries, referenceFor, yearOf, type Placed } from './numbering.js';
import { readAppendix, readDocument } from './read/index.js';
import { checkDocument, type Issue } from './rules/index.js';
import { GazetteStorage, MAX_FILE_BYTES } from './storage.js';
import { COVER_TYPES, NEW_TYPES, TYPES, isNewType, parseSeriesNumber, type NewType } from './types.js';

// An uploaded original, kept until the draft is published or deleted.
export interface SourceFile {
  path: string;
  name: string;
  size: number;
  pages: number;
  // what tells it from every other upload: the file itself, and the words read from it (the same
  // document saved as a PDF again reads the same, though its bytes differ)
  sha256?: string;
  textHash?: string;
}
export interface AppendixSource extends SourceFile {
  number?: number;
  title?: string;
  firstPageText: string;
  blocks: Block[];
}
interface Sources {
  main?: SourceFile;
  appendices?: AppendixSource[];
  // what the last preview was built from, so an unchanged draft isn't built again
  previewKey?: string;
}
export interface GazetteFile {
  label: string;
  href: string;
}

// What a draft's details can be changed to. Null clears a detail.
export interface DraftChanges {
  type?: NewType;
  docNumber?: string | null;
  title?: string;
  issuingBody?: string | null;
  commencesOn?: string | null;
  blocks?: Block[];
  appendixOrder?: string[];
}
// What can still change once a document is published: its standing in the Register, and its
// transcription (the official text is the PDF, which never changes)
export interface PublishedChanges {
  status?: string;
  commencesOn?: string | null;
  blocks?: Block[];
}

export const STATUSES = ['In Force', 'Amended', 'Repealed'];

const iso = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);
const day = (value: string) => new Date(`${value}T00:00:00Z`);

// The register row for the portal's table (no text, no originals)
function summary(doc: GazetteDocument) {
  return {
    id: doc.id,
    state: doc.state,
    serial: doc.serial,
    volume: doc.volume,
    number: doc.number,
    gazetteRef: gazetteRef(doc.volume, doc.number),
    body: doc.body,
    type: doc.type,
    tag: doc.tag ?? TYPES[doc.type]?.tag ?? doc.type,
    docNumber: doc.docNumber,
    reference: doc.reference,
    title: doc.title,
    issuingBody: doc.issuingBody,
    publishedOn: iso(doc.publishedOn),
    commencesOn: iso(doc.commencesOn),
    status: doc.status,
    language: doc.language,
    cover: doc.cover,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// The whole document, for the portal's editor
function full(doc: GazetteDocument) {
  const sources = doc.sources as Sources;
  return {
    ...summary(doc),
    blocks: doc.blocks as unknown as Block[],
    notes: doc.notes,
    files: doc.files as unknown as GazetteFile[],
    main: sources.main ? { name: sources.main.name, size: sources.main.size, pages: sources.main.pages } : null,
    appendices: (sources.appendices ?? []).map(({ path, name, size, pages, number, title }) => ({ path, name, size, pages, number, title })),
  };
}

// The public Gazette's view of a published document
function publicDoc(doc: GazetteDocument, withText: boolean) {
  return {
    serial: doc.serial,
    index: doc.legacyIndex,
    body: doc.body,
    type: doc.type,
    tag: doc.tag ?? TYPES[doc.type]?.tag ?? doc.type,
    title: doc.title,
    reference: doc.reference,
    issuingBody: doc.issuingBody,
    date: iso(doc.publishedOn),
    commencesOn: iso(doc.commencesOn),
    status: doc.status,
    volume: doc.volume,
    number: doc.number,
    gazetteRef: gazetteRef(doc.volume, doc.number),
    language: doc.language,
    pdfs: doc.files,
    ...(withText ? { blocks: doc.blocks } : {}),
  };
}

const sha256 = (data: Uint8Array | string) => createHash('sha256').update(data).digest('hex');

// A hash of the words read from a PDF, or nothing when too few were read to tell one document
// from another (a scan, a near-empty page).
export function textHash(blocks: Block[], ...more: (string | undefined)[]): string | undefined {
  const words: string[] = more.filter((text): text is string => !!text);
  const collect = (value: unknown): void => {
    if (typeof value === 'string') words.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object')
      for (const [key, inner] of Object.entries(value)) if (key !== 'type') collect(inner);
  };
  collect(blocks);
  const text = words.join(' ').toLowerCase().replace(/\s+/g, ' ').trim();
  return text.length >= 200 ? sha256(text) : undefined;
}

// Whether two documents of a type carry the same number: 1/2026 and 01/2026 are one number; a
// Notice's own reference is compared as written, ignoring case and spacing.
export function sameNumber(type: string, a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  const left = parseSeriesNumber(type, a);
  const right = parseSeriesNumber(type, b);
  if (left && right) return left.serial === right.serial && left.year === right.year;
  const plain = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
  return plain(a) === plain(b);
}

// What an upload or a number would repeat: the same file, the same text, or the same type and number.
type DuplicateReason = 'same_file' | 'same_text' | 'same_number';
interface Candidate {
  sha256?: string;
  textHash?: string;
  type?: string;
  docNumber?: string | null;
}

const placed = (doc: GazetteDocument): Placed => ({
  serial: doc.serial,
  number: doc.number,
  publishedOn: iso(doc.publishedOn),
  type: doc.type,
  docNumber: doc.docNumber,
});

@Injectable()
export class GazetteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly storage: GazetteStorage,
  ) {}

  private async find(id: string): Promise<GazetteDocument> {
    const doc = await this.prisma.gazetteDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException({ code: 'not_found' });
    return doc;
  }

  private async draft(id: string): Promise<GazetteDocument> {
    const doc = await this.find(id);
    if (doc.state !== 'DRAFT') throw new ConflictException({ code: 'published' });
    return doc;
  }

  private published() {
    return this.prisma.gazetteDocument.findMany({ where: { state: 'PUBLISHED' }, orderBy: { serial: 'asc' } });
  }

  // The document `candidate` would repeat, if any, with how: its file or text is already uploaded
  // (to another document, or to `doc` itself as another of its files), or another document has its
  // type and number. `own` leaves out one of doc's files (the one being replaced). Only published
  // documents are looked at when `publishedOnly`.
  private async duplicateOf(doc: GazetteDocument, candidate: Candidate, { own, publishedOnly = false }: { own?: string; publishedOnly?: boolean } = {}) {
    const others = await this.prisma.gazetteDocument.findMany({
      where: publishedOnly ? { state: 'PUBLISHED' } : {},
      orderBy: [{ state: 'desc' }, { serial: 'asc' }, { createdAt: 'asc' }],
    });
    const files = (entry: GazetteDocument) => {
      const sources = entry.sources as Sources;
      return [sources.main, ...(sources.appendices ?? [])].filter((file): file is SourceFile => !!file && file.path !== own);
    };
    const found = (entry: GazetteDocument, reason: DuplicateReason) => ({ reason, duplicate: { ...summary(entry), self: entry.id === doc.id } });
    for (const entry of others) {
      for (const file of files(entry)) {
        if (candidate.sha256 && file.sha256 === candidate.sha256) return found(entry, 'same_file');
        if (candidate.textHash && file.textHash === candidate.textHash) return found(entry, 'same_text');
      }
    }
    if (candidate.type) {
      const twin = others.find((entry) => entry.id !== doc.id && entry.type === candidate.type && sameNumber(candidate.type!, entry.docNumber, candidate.docNumber));
      if (twin) return found(twin, 'same_number');
    }
    return null;
  }

  // ---- the Register (the portal's table) ----

  async list() {
    const docs = await this.prisma.gazetteDocument.findMany({
      orderBy: [{ state: 'asc' }, { serial: 'desc' }, { updatedAt: 'desc' }],
    });
    return docs.map(summary);
  }

  async get(id: string) {
    return full(await this.find(id));
  }

  // Where a document published on `date` would go, and the next number in each series that year.
  async next(date: string) {
    const published = (await this.published()).map(placed);
    return { ...nextPlace(published, date), series: nextSeries(published, yearOf(date)) };
  }

  // ---- drafts ----

  async createDraft(cover: boolean, me: User, caller: Caller) {
    const doc = await this.prisma.gazetteDocument.create({
      data: { type: cover ? 'act' : 'notice', cover, createdById: me.id },
    });
    await this.auth.record('GAZETTE_DRAFTED', me.id, caller, { targetId: doc.id, detail: cover ? 'cover' : 'no cover' });
    return full(doc);
  }

  // A link to upload the document (`main`) or an appendix to.
  async uploadTarget(id: string, kind: 'main' | 'appendix', size: number) {
    await this.draft(id);
    if (size > MAX_FILE_BYTES) throw new BadRequestException({ code: 'too_large' });
    const path = kind === 'main' ? `drafts/${id}/main-${randomUUID()}.pdf` : `drafts/${id}/appendix-${randomUUID()}.pdf`;
    return { path, upload: await this.storage.uploadTarget('gazette-drafts', path) };
  }

  // Takes an uploaded file into the draft: checks it's a usable PDF, then reads it. The document's
  // reading fills in any details still empty and replaces the text; an appendix is added at the end.
  async attach(id: string, kind: 'main' | 'appendix', path: string, name: string, me: User, caller: Caller) {
    const doc = await this.draft(id);
    if (!path.startsWith(`drafts/${id}/`)) throw new BadRequestException({ code: 'invalid' });
    const bytes = await this.storage.get('gazette-drafts', path);
    if (!bytes) throw new BadRequestException({ code: 'upload_missing' });
    let pages: number;
    try {
      pages = (await loadPdf(bytes)).getPageCount();
    } catch (error) {
      await this.storage.remove('gazette-drafts', [path]);
      throw new UnprocessableEntityException({ code: 'unusable_pdf', message: error instanceof UnusablePdf ? error.message : 'This file couldn’t be read as a PDF.' });
    }
    const sources = doc.sources as Sources;
    const file: SourceFile = { path, name, size: bytes.length, pages, sha256: sha256(bytes) };
    let data: Prisma.GazetteDocumentUpdateInput;
    // nothing is uploaded twice: a repeat is turned away, naming the document it repeats
    const refuse = async (candidate: Candidate, own?: string) => {
      const duplicate = await this.duplicateOf(doc, candidate, { own });
      if (!duplicate) return;
      await this.storage.remove('gazette-drafts', [path]);
      throw new ConflictException({ code: 'duplicate', ...duplicate });
    };

    if (kind === 'main') {
      const read = await readDocument(bytes);
      const fields = read.fields;
      // a cover choice stays: "No cover" is a Notice; "Add Cover" takes the type read, if it's one with a cover
      const type = doc.cover ? (fields.type && COVER_TYPES.includes(fields.type) ? fields.type : doc.type) : 'notice';
      const docNumber = doc.docNumber ?? fields.docNumber ?? null;
      file.textHash = textHash(read.blocks);
      await refuse({ ...file, type, docNumber }, sources.main?.path);
      const notes = [...read.notes];
      if (fields.hasCover) notes.unshift({ page: 1, message: 'This PDF already starts with a Gazette cover. Upload the document without its cover; the module adds it.' });
      if (sources.main) await this.storage.remove('gazette-drafts', [sources.main.path]);
      data = {
        type,
        docNumber,
        title: doc.title || fields.title || '',
        issuingBody: doc.issuingBody ?? fields.issuingBody ?? null,
        language: fields.language,
        blocks: read.blocks as unknown as Prisma.InputJsonValue,
        notes: notes as unknown as Prisma.InputJsonValue,
        sources: { ...sources, main: file } as unknown as Prisma.InputJsonValue,
      };
    } else {
      const read = await readAppendix(bytes);
      file.textHash = textHash(read.blocks, read.firstPageText);
      await refuse(file);
      const appendix: AppendixSource = { ...file, number: read.number, title: read.title, firstPageText: read.firstPageText, blocks: read.blocks };
      data = { sources: { ...sources, appendices: [...(sources.appendices ?? []), appendix] } as unknown as Prisma.InputJsonValue };
    }
    const updated = await this.prisma.gazetteDocument.update({ where: { id }, data });
    await this.auth.record('GAZETTE_UPDATED', me.id, caller, { targetId: id, detail: kind === 'main' ? 'document uploaded' : 'appendix uploaded' });
    return full(updated);
  }

  async removeAppendix(id: string, path: string, me: User, caller: Caller) {
    const doc = await this.draft(id);
    const sources = doc.sources as Sources;
    const appendices = (sources.appendices ?? []).filter((appendix) => appendix.path !== path);
    if (appendices.length === (sources.appendices ?? []).length) throw new NotFoundException({ code: 'not_found' });
    await this.storage.remove('gazette-drafts', [path]);
    const updated = await this.prisma.gazetteDocument.update({
      where: { id },
      data: { sources: { ...sources, appendices } as unknown as Prisma.InputJsonValue },
    });
    await this.auth.record('GAZETTE_UPDATED', me.id, caller, { targetId: id, detail: 'appendix removed' });
    return full(updated);
  }

  async update(id: string, changes: DraftChanges | PublishedChanges, me: User, caller: Caller) {
    const doc = await this.find(id);
    const data: Prisma.GazetteDocumentUpdateInput = {};
    if (doc.state === 'PUBLISHED') {
      const allowed = changes as PublishedChanges;
      if (Object.keys(changes).some((key) => !['status', 'commencesOn', 'blocks'].includes(key))) throw new ConflictException({ code: 'published' });
      if (allowed.status !== undefined) data.status = allowed.status;
      if (allowed.commencesOn !== undefined) data.commencesOn = allowed.commencesOn ? day(allowed.commencesOn) : null;
      if (allowed.blocks) data.blocks = allowed.blocks as unknown as Prisma.InputJsonValue;
    } else {
      const draft = changes as DraftChanges;
      if (draft.type !== undefined) {
        // the cover choice decides between a Notice and the four types with a cover
        if (doc.cover === (draft.type === 'notice')) throw new BadRequestException({ code: 'invalid' });
        data.type = draft.type;
      }
      if (draft.docNumber !== undefined) data.docNumber = draft.docNumber;
      // no two documents of a type carry the same number
      if (draft.type !== undefined || draft.docNumber !== undefined) {
        const duplicate = await this.duplicateOf(doc, { type: draft.type ?? doc.type, docNumber: draft.docNumber !== undefined ? draft.docNumber : doc.docNumber });
        if (duplicate) throw new ConflictException({ code: 'duplicate', ...duplicate });
      }
      if (draft.title !== undefined) data.title = draft.title;
      if (draft.issuingBody !== undefined) data.issuingBody = draft.issuingBody;
      if (draft.commencesOn !== undefined) data.commencesOn = draft.commencesOn ? day(draft.commencesOn) : null;
      if (draft.blocks) data.blocks = draft.blocks as unknown as Prisma.InputJsonValue;
      if (draft.appendixOrder) {
        const sources = doc.sources as Sources;
        const appendices = sources.appendices ?? [];
        const order = draft.appendixOrder;
        if (order.length !== appendices.length || !appendices.every((appendix) => order.includes(appendix.path))) throw new BadRequestException({ code: 'invalid' });
        const sorted = order.map((path) => appendices.find((appendix) => appendix.path === path)!);
        data.sources = { ...sources, appendices: sorted } as unknown as Prisma.InputJsonValue;
      }
    }
    const updated = await this.prisma.gazetteDocument.update({ where: { id }, data });
    await this.auth.record('GAZETTE_UPDATED', me.id, caller, { targetId: id, detail: Object.keys(changes).join(',') });
    return full(updated);
  }

  async remove(id: string, me: User, caller: Caller) {
    const doc = await this.draft(id);
    const sources = doc.sources as Sources;
    const paths = [sources.main?.path, ...(sources.appendices ?? []).map((appendix) => appendix.path), `drafts/${id}/preview.pdf`].filter(Boolean) as string[];
    await this.storage.remove('gazette-drafts', paths).catch(() => undefined);
    await this.prisma.gazetteDocument.delete({ where: { id } });
    await this.auth.record('GAZETTE_DELETED', me.id, caller, { targetId: id, detail: doc.title || 'untitled draft' });
  }

  // ---- the finished issue ----

  private cover(doc: GazetteDocument, place: { volume: number | null; number: number | null }, date: string): CoverText | undefined {
    if (!doc.cover) return undefined;
    return {
      volume: place.volume ?? 0,
      number: place.number ?? 0,
      date,
      numberLine: coverNumberLine(doc.type, doc.docNumber ?? ''),
      title: doc.title,
    };
  }

  private async issue(doc: GazetteDocument, place: { volume: number | null; number: number | null }, date: string) {
    const sources = doc.sources as Sources;
    if (!sources.main) throw new UnprocessableEntityException({ code: 'no_document' });
    const main = await this.storage.get('gazette-drafts', sources.main.path);
    if (!main) throw new UnprocessableEntityException({ code: 'upload_missing' });
    const appendices: Uint8Array[] = [];
    for (const appendix of sources.appendices ?? []) {
      const bytes = await this.storage.get('gazette-drafts', appendix.path);
      if (!bytes) throw new UnprocessableEntityException({ code: 'upload_missing' });
      appendices.push(bytes);
    }
    const cover = this.cover(doc, place, date);
    const ref = gazetteRef(place.volume, place.number);
    const pdf = await buildIssue({
      main,
      appendices,
      cover,
      initialled: doc.type === 'order',
      info: { title: doc.title, subject: `CSA Gazette${ref ? `, ${ref}` : ''}`, date },
    });
    return { pdf, appendices };
  }

  // The issue as it would be published on `date`, with the Volume and Number it would get then, for
  // the portal to show and download. Kept until the draft changes.
  async preview(id: string, date: string) {
    const doc = await this.draft(id);
    const sources = doc.sources as Sources;
    if (!sources.main) throw new UnprocessableEntityException({ code: 'no_document' });
    const place = await this.next(date);
    const cover = this.cover(doc, place, date);
    const problems = cover ? coverProblems(cover) : [];
    if (problems.length) throw new UnprocessableEntityException({ code: 'cover', problems });

    const path = `drafts/${id}/preview.pdf`;
    // (the first entry names how issues are built: change it when that changes, to rebuild old previews)
    const key = createHash('sha256')
      .update(JSON.stringify(['initials-2', sources.main.path, (sources.appendices ?? []).map((a) => a.path), cover ?? null, doc.type, doc.title, date]))
      .digest('hex');
    if (sources.previewKey !== key) {
      const { pdf } = await this.issue(doc, place, date);
      await this.storage.put('gazette-drafts', path, pdf);
      await this.prisma.gazetteDocument.update({
        where: { id },
        data: { sources: { ...sources, previewKey: key } as unknown as Prisma.InputJsonValue },
      });
    }
    const filename = `${(doc.title || 'Gazette draft').replace(/[^\w .()-]+/g, '').trim() || 'Gazette draft'}.pdf`;
    return {
      place,
      view: await this.storage.signedUrl('gazette-drafts', path, 3600),
      download: await this.storage.signedUrl('gazette-drafts', path, 3600, filename),
    };
  }

  // ---- the rules ----

  private async issues(doc: GazetteDocument, date: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    const sources = doc.sources as Sources;
    const missing = (what: string, where?: string) =>
      issues.push({ level: 'error', rule: 'Gazette module', where, message: `${what} is missing.` });
    if (!sources.main) missing('The document’s PDF');
    if (!doc.title.trim()) missing('The title');
    if (!doc.docNumber?.trim()) missing(doc.type === 'notice' ? 'The Notice’s reference number' : 'The document number');
    if (!doc.issuingBody?.trim()) missing('The issuing body');
    if (!(doc.blocks as unknown as Block[]).length) missing('The transcribed text');
    for (const note of doc.notes as unknown as { page?: number; message: string }[]) {
      if (/already starts with a Gazette cover/.test(note.message)) issues.push({ level: 'error', rule: 'Gazette module', where: 'Page 1', message: note.message });
    }
    const cover = this.cover(doc, await this.next(date), date);
    for (const problem of cover ? coverProblems(cover) : []) issues.push({ level: 'error', rule: 'Cover template', where: 'Cover', message: problem });

    // nothing already published goes out again (a draft that repeats another draft is turned away
    // when it's uploaded; whichever of two old ones is published first goes). A number already used
    // in a series is the rules' own error (number-series), so only a Notice's reference is matched here.
    for (const [i, file] of [sources.main, ...(sources.appendices ?? [])].entries()) {
      if (!file) continue;
      const numbered = i === 0 && doc.type === 'notice' ? { type: doc.type, docNumber: doc.docNumber } : {};
      const found = await this.duplicateOf(doc, { sha256: file.sha256, textHash: file.textHash, ...numbered }, { publishedOnly: true });
      if (found) {
        const { duplicate, reason } = found;
        const what = reason === 'same_number' ? 'Its type and number are' : i === 0 ? 'This PDF is' : `Appendix ${i}’s PDF is`;
        issues.push({
          level: 'error',
          rule: 'Gazette module',
          where: i === 0 ? 'Document' : `Appendix ${i}`,
          message: `${what} already published in the Gazette, as “${duplicate.title}”${duplicate.gazetteRef ? ` (${duplicate.gazetteRef})` : ''}.`,
        });
      }
    }

    if (sources.main && isNewType(doc.type) && doc.docNumber) {
      const register = (await this.published()).map((entry) => ({
        type: entry.type,
        docNumber: entry.docNumber ?? undefined,
        title: entry.title,
        issuingBody: entry.issuingBody ?? undefined,
        publishedOn: iso(entry.publishedOn)!,
        status: entry.status ?? undefined,
      }));
      issues.push(
        ...checkDocument({
          type: doc.type,
          docNumber: doc.docNumber,
          title: doc.title,
          issuingBody: doc.issuingBody ?? '',
          publishedOn: date,
          commencesOn: iso(doc.commencesOn) ?? undefined,
          cover: doc.cover,
          blocks: doc.blocks as unknown as Block[],
          appendices: (sources.appendices ?? []).map(({ number, title, firstPageText, blocks }) => ({ number, title, firstPageText, blocks })),
          register,
        }),
      );
    }
    return issues;
  }

  async check(id: string, date: string) {
    const doc = await this.draft(id);
    return { issues: await this.issues(doc, date) };
  }

  // Publishes a draft on `date`: checks it against the rules again (errors stop it; warnings must
  // have been seen), gives it its place in the Gazette and its series number, builds the issue with
  // the cover, and puts the PDFs where the public Gazette links to them.
  async publish(id: string, date: string, acknowledged: boolean, me: User, caller: Caller) {
    const doc = await this.draft(id);
    const issues = await this.issues(doc, date);
    if (issues.some((issue) => issue.level === 'error')) throw new UnprocessableEntityException({ code: 'not_compliant', issues });
    if (issues.length && !acknowledged) throw new ConflictException({ code: 'warnings', issues });

    // the latest published date: a document can't be published before it
    const latest = await this.prisma.gazetteDocument.findFirst({ where: { state: 'PUBLISHED' }, orderBy: { publishedOn: 'desc' } });
    if (latest?.publishedOn && iso(latest.publishedOn)! > date) throw new BadRequestException({ code: 'date_before_latest', latest: iso(latest.publishedOn) });

    const series = isNewType(doc.type) ? parseSeriesNumber(doc.type, doc.docNumber ?? '') : null;
    const published = await this.prisma.$transaction(
      async (tx) => {
        // one publication at a time, so two can't take the same place
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(4206)`;
        const others = await tx.gazetteDocument.findMany({ where: { state: 'PUBLISHED' } });
        const place = nextPlace(others.map(placed), date);
        if (series && others.some((other) => other.type === doc.type && other.seriesYear === series.year && other.seriesNumber === series.serial)) {
          throw new ConflictException({ code: 'number_taken' });
        }
        const { pdf, appendices } = await this.issue(doc, place, date);
        const files: GazetteFile[] = [{ label: 'View PDF', href: this.storage.publicUrl(`${place.serial}.pdf`) }];
        await this.storage.put('gazette', `${place.serial}.pdf`, pdf);
        for (const [i, bytes] of appendices.entries()) {
          const name = `${place.serial}-appendix-${i + 1}.pdf`;
          await this.storage.put('gazette', name, bytes);
          files.push({ label: appendices.length === 1 ? 'View appendix' : `View appendix ${i + 1}`, href: this.storage.publicUrl(name) });
        }
        return tx.gazetteDocument.update({
          where: { id },
          data: {
            state: 'PUBLISHED',
            serial: place.serial,
            volume: place.volume,
            number: place.number,
            publishedOn: day(date),
            seriesNumber: series?.serial ?? null,
            seriesYear: series?.year ?? null,
            reference: referenceFor(doc.type, doc.docNumber ?? ''),
            status: 'In Force',
            files: files as unknown as Prisma.InputJsonValue,
            publishedById: me.id,
            publishedAt: new Date(),
          },
        });
      },
      { timeout: 120_000, maxWait: 20_000 },
    );
    await this.auth.record('GAZETTE_PUBLISHED', me.id, caller, { targetId: id, detail: `${published.serial} ${published.title}`.slice(0, 200) });
    return full(published);
  }

  // ---- the public Gazette ----

  async publicList() {
    return (await this.published()).map((doc) => publicDoc(doc, false));
  }

  async publicGet(serial: number) {
    const doc = await this.prisma.gazetteDocument.findFirst({ where: { state: 'PUBLISHED', serial } });
    if (!doc) throw new NotFoundException({ code: 'not_found' });
    return publicDoc(doc, true);
  }

  async publicByIndex(index: string) {
    const doc = await this.prisma.gazetteDocument.findFirst({ where: { state: 'PUBLISHED', legacyIndex: index } });
    if (!doc) throw new NotFoundException({ code: 'not_found' });
    return { serial: doc.serial };
  }

  static readonly types = NEW_TYPES;
}
