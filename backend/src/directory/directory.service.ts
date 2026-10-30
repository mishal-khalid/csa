import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { DirectoryEntry, User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { AuthService, type Caller } from '../auth/auth.service.js';

export interface NewEntry {
  parentId: string | null;
  folder: boolean;
  kind?: string;
  name: string;
}

// one entry in a bulk add: a folder (with what's inside it) or an entry of a kind
export interface BulkEntry {
  folder: boolean;
  kind?: string;
  name: string;
  children?: BulkEntry[];
}

// the most a bulk add can make at once, and how deep its folders can go
export const MAX_BULK = 300;
const MAX_DEPTH = 20;

// what can be changed in an entry; null clears a detail (a name and kind can't be cleared)
export type EntryChanges = { name?: string; kind?: string } & Partial<
  Record<'headName' | 'headPost' | 'email' | 'phone' | 'website' | 'address', string | null>
>;

const row = (entry: DirectoryEntry) => ({
  id: entry.id,
  parentId: entry.parentId,
  folder: entry.folder,
  kind: entry.kind,
  name: entry.name,
  position: entry.position,
  headName: entry.headName,
  headPost: entry.headPost,
  email: entry.email,
  phone: entry.phone,
  website: entry.website,
  address: entry.address,
});

// The Directory. Entries sit in folders and inside one another; each knows its parent and its place
// among its siblings (0, 1, 2…), which every change keeps gapless. The rules:
// - Folders have a name only; everything else has a kind as well, and head and contact details.
// - An entry can't be moved inside itself, or inside anything inside it.
// - Only an empty entry can be deleted (the database refuses the rest too).
// Every change goes in the sign-in record.
@Injectable()
export class DirectoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  // every entry, as a flat list in order; the portal builds the tree
  async list() {
    const entries = await this.prisma.directoryEntry.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
    return entries.map(row);
  }

  async create(input: NewEntry, me: User, caller: Caller) {
    if (input.parentId) await this.find(input.parentId);
    if (!input.folder && !input.kind) throw new BadRequestException({ code: 'invalid' });
    const last = await this.prisma.directoryEntry.aggregate({ where: { parentId: input.parentId }, _max: { position: true } });
    const entry = await this.prisma.directoryEntry.create({
      data: {
        parentId: input.parentId,
        folder: input.folder,
        kind: input.folder ? null : input.kind,
        name: input.name,
        // added at the end
        position: (last._max.position ?? -1) + 1,
      },
    });
    await this.auth.record('DIRECTORY_ADDED', me.id, caller, { targetId: entry.id, detail: entry.name });
    return row(entry);
  }

  // Adds many at once (the Add modal's "Add several"), inside `parentId` (null for the top level),
  // after what's already there. All or nothing, in one go. Answers with the whole Directory and
  // the ids of what was added at the first level.
  async bulkCreate(parentId: string | null, entries: BulkEntry[], me: User, caller: Caller) {
    if (parentId) await this.find(parentId);
    const rows: { id: string; parentId: string | null; folder: boolean; kind: string | null; name: string; position: number }[] = [];
    const walk = (list: BulkEntry[], parent: string | null, depth: number, start: number) => {
      if (depth > MAX_DEPTH) throw new BadRequestException({ code: 'too_deep' });
      list.forEach((entry, i) => {
        if (entry.folder === Boolean(entry.kind) || (!entry.folder && entry.children?.length)) throw new BadRequestException({ code: 'invalid' });
        const id = randomUUID();
        rows.push({ id, parentId: parent, folder: entry.folder, kind: entry.folder ? null : entry.kind!, name: entry.name, position: start + i });
        if (rows.length > MAX_BULK) throw new BadRequestException({ code: 'too_many' });
        walk(entry.children ?? [], id, depth + 1, 0);
      });
    };
    const last = await this.prisma.directoryEntry.aggregate({ where: { parentId }, _max: { position: true } });
    walk(entries, parentId, 1, (last._max.position ?? -1) + 1);

    // one statement each: parents come before what's inside them, so every row's parent exists
    await this.prisma.$transaction([
      this.prisma.directoryEntry.createMany({ data: rows }),
      this.prisma.authEvent.createMany({
        data: rows.map((row) => ({ type: 'DIRECTORY_ADDED' as const, userId: me.id, ip: caller.ip, userAgent: caller.userAgent, targetId: row.id, detail: row.name })),
      }),
    ]);
    return { entries: await this.list(), added: rows.filter((row) => row.parentId === parentId).map((row) => row.id) };
  }

  async update(id: string, changes: EntryChanges, me: User, caller: Caller) {
    const entry = await this.find(id);
    // folders have only a name
    if (entry.folder && Object.keys(changes).some((field) => field !== 'name')) throw new BadRequestException({ code: 'folder' });
    const saved = await this.prisma.directoryEntry.update({ where: { id }, data: changes });
    await this.auth.record('DIRECTORY_UPDATED', me.id, caller, { targetId: id, detail: Object.keys(changes).join(',') });
    return row(saved);
  }

  // Moves an entry inside `parentId` (null for the top level), to be at `index` among what's
  // already there. Answers with the whole Directory, since two lists of siblings change.
  async move(id: string, parentId: string | null, index: number, me: User, caller: Caller) {
    const entry = await this.find(id);
    // walking up from the new parent must never reach the entry itself
    for (let at = parentId; at; ) {
      if (at === id) throw new BadRequestException({ code: 'into_itself' });
      at = (await this.find(at)).parentId;
    }

    await this.prisma.$transaction(async (tx) => {
      const siblings = await tx.directoryEntry.findMany({
        where: { parentId, id: { not: id } },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      });
      const order = siblings.map((sibling) => sibling.id);
      order.splice(Math.min(Math.max(index, 0), order.length), 0, id);
      await tx.directoryEntry.update({ where: { id }, data: { parentId } });
      for (const [position, siblingId] of order.entries()) {
        await tx.directoryEntry.update({ where: { id: siblingId }, data: { position } });
      }
      // close the gap it left behind
      if (entry.parentId !== parentId) await this.renumber(tx, entry.parentId);
    });
    await this.auth.record('DIRECTORY_MOVED', me.id, caller, { targetId: id, detail: entry.name });
    return this.list();
  }

  async remove(id: string, me: User, caller: Caller) {
    const entry = await this.find(id);
    if (await this.prisma.directoryEntry.count({ where: { parentId: id } })) throw new ConflictException({ code: 'not_empty' });
    await this.prisma.$transaction(async (tx) => {
      await tx.directoryEntry.delete({ where: { id } });
      await this.renumber(tx, entry.parentId);
    });
    await this.auth.record('DIRECTORY_DELETED', me.id, caller, { targetId: id, detail: entry.name });
  }

  // numbers what's inside a parent 0, 1, 2… in its current order
  private async renumber(tx: Pick<PrismaService, 'directoryEntry'>, parentId: string | null) {
    const siblings = await tx.directoryEntry.findMany({
      where: { parentId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, position: true },
    });
    for (const [position, sibling] of siblings.entries()) {
      if (sibling.position !== position) await tx.directoryEntry.update({ where: { id: sibling.id }, data: { position } });
    }
  }

  private async find(id: string): Promise<DirectoryEntry> {
    const entry = await this.prisma.directoryEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException({ code: 'not_found' });
    return entry;
  }
}
