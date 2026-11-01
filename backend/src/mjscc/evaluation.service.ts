import { randomInt } from 'node:crypto';
import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Instructor } from '../generated/mjscc/client.js';
import { answerImages } from './answer-images.js';
import { mjsccConfig, nameKey } from './config.js';
import { commands, COMMANDS_PER_STUDENT, drill, students, theory } from './content.js';
import { MjsccPrisma } from './prisma.service.js';
import { average, evaluate, parts, type ItemScore, type PartName } from './scoring.js';

const conflict = (code: string, extra: object = {}) => new HttpException({ code, ...extra }, HttpStatus.CONFLICT);

// what an app sees of an instructor
export const view = (instructor: Instructor) => ({ name: instructor.name, finished: Boolean(instructor.finishedAt) });

// k different numbers from 1 to n, at random
function pick(n: number, k: number): number[] {
  const chosen = new Set<number>();
  while (chosen.size < k) chosen.add(randomInt(1, n + 1));
  return [...chosen];
}

// The user expects at least two of the listed instructors on the day (2026-11-01), so the results
// wait for at least two to finish.
const MIN_FINISHED = 2;

@Injectable()
export class EvaluationService {
  constructor(private readonly db: MjsccPrisma) {}

  // The listed instructor a typed name is (null if it's no one on the list), made the first time
  // they sign in, under the name as the list writes it. Two phones signing in as someone new at the
  // same moment can race to make them; the loser finds the winner's.
  async instructorNamed(typed: string): Promise<Instructor | null> {
    const key = nameKey(typed);
    const name = mjsccConfig!.instructors.find((listed) => nameKey(listed) === key);
    if (!name) return null;
    const args = { where: { nameKey: key }, create: { name, nameKey: key }, update: { name } };
    return this.db.instructor.upsert(args).catch(() => this.db.instructor.upsert(args));
  }

  // Everything the app shows (only to signed-in instructors, as the syllabus asks): the students
  // with their three commands, the theory questions with their answers, the drill and the scales.
  async content() {
    const draws = await this.draws();
    return {
      students: students.map((name, i) => ({ number: i + 1, name, commands: draws.get(i + 1)!.map((c) => commands[c - 1]) })),
      theory: theory.map((t, i) => ({ number: i + 1, ...t })),
      drill,
      parts,
    };
  }

  // Each student's three commands, drawn the first time anyone asks. All the rows go in as one
  // statement that skips clashes, so if two phones draw at the same moment, one draw stands whole.
  private async draws(): Promise<Map<number, number[]>> {
    const read = () => this.db.commandDraw.findMany({ orderBy: [{ student: 'asc' }, { position: 'asc' }] });
    let rows = await read();
    if (rows.length < students.length * COMMANDS_PER_STUDENT) {
      const data = students.flatMap((_, s) =>
        pick(commands.length, COMMANDS_PER_STUDENT).map((command, p) => ({ student: s + 1, position: p + 1, command })),
      );
      await this.db.commandDraw.createMany({ data, skipDuplicates: true });
      rows = await read();
    }
    const draws = new Map<number, number[]>();
    for (const row of rows) draws.set(row.student, [...(draws.get(row.student) ?? []), row.command]);
    return draws;
  }

  answerImage(question: number): Buffer | null {
    const png = answerImages[question];
    return png ? Buffer.from(png, 'base64') : null;
  }

  // the instructor's own scores and inspection notes
  async mine(instructor: Instructor) {
    const where = { instructorId: instructor.id };
    const [scores, notes] = await Promise.all([this.db.score.findMany({ where }), this.db.inspectionNote.findMany({ where })]);
    return {
      scores: scores.map(({ student, part, item, value }) => ({ student, part, item, value })),
      notes: notes.map(({ student, text }) => ({ student, text })),
    };
  }

  // Once the results are out nobody scores any more: not the instructors who finished, and not someone
  // on the list who comes late (whose first score would otherwise hide everyone's results again).
  private async assertCanScore(instructor: Instructor) {
    if (instructor.finishedAt) throw conflict('finished');
    if ((await this.standings()).open) throw conflict('results_open');
  }

  async score(instructor: Instructor, input: { student: number; part: PartName; item: number; value: number }) {
    const { items, top } = parts[input.part];
    if (input.item > items || input.value > top) throw new BadRequestException({ code: 'invalid' });
    await this.assertCanScore(instructor);
    const key = { instructorId: instructor.id, student: input.student, part: input.part, item: input.item };
    await this.db.score.upsert({
      where: { instructorId_student_part_item: key },
      create: { ...key, value: input.value },
      update: { value: input.value },
    });
  }

  // what the instructor wrote about a student's inspection; empty removes it
  async note(instructor: Instructor, student: number, text: string) {
    await this.assertCanScore(instructor);
    const where = { instructorId_student: { instructorId: instructor.id, student } };
    if (!text) {
      await this.db.inspectionNote.deleteMany({ where: where.instructorId_student });
      return;
    }
    await this.db.inspectionNote.upsert({ where, create: { ...where.instructorId_student, text }, update: { text } });
  }

  // Finish: only with every item of every student scored. Otherwise it answers what's missing.
  async finish(instructor: Instructor): Promise<Instructor> {
    const scored = await this.db.score.findMany({ where: { instructorId: instructor.id }, select: { student: true, part: true, item: true } });
    const have = new Set(scored.map((s) => `${s.student}:${s.part}:${s.item}`));
    const missing: { student: number; part: PartName; items: number[] }[] = [];
    for (let student = 1; student <= students.length; student++) {
      for (const [part, { items }] of Object.entries(parts) as [PartName, { items: number }][]) {
        const gaps = Array.from({ length: items }, (_, i) => i + 1).filter((item) => !have.has(`${student}:${part}:${item}`));
        if (gaps.length) missing.push({ student, part, items: gaps });
      }
    }
    if (missing.length) throw conflict('incomplete', { missing });
    return this.db.instructor.update({ where: { id: instructor.id }, data: { finishedAt: new Date() } });
  }

  // Reopen: allowed until the results are out (every instructor finished); then the numbers stay put.
  async reopen(instructor: Instructor): Promise<Instructor> {
    if ((await this.standings()).open) throw conflict('results_open');
    return this.db.instructor.update({ where: { id: instructor.id }, data: { finishedAt: null } });
  }

  // Who's evaluating: the listed instructors who have given any score, in the list's order (those who
  // didn't come never score, so they don't hold anything up). The results are out once every one of
  // them has pressed Finish, and at least two have.
  private async standings() {
    const listed = mjsccConfig!.instructors;
    const rows = await this.db.instructor.findMany({
      where: { nameKey: { in: listed.map(nameKey) }, scores: { some: {} } },
      select: { id: true, name: true, nameKey: true, finishedAt: true },
    });
    const instructors = listed.flatMap((name) => rows.filter((row) => row.nameKey === nameKey(name)));
    const finished = instructors.filter((i) => i.finishedAt).length;
    const needed = Math.min(MIN_FINISHED, listed.length);
    return { instructors, needed, open: finished >= needed && finished === instructors.length };
  }

  // The marks. Until the results are out, an instructor sees only their own; after, everyone's, per
  // instructor and per part (with each item's score and the inspection notes), and the averages.
  async results(me: Instructor) {
    const { instructors, needed, open } = await this.standings();
    const only = open ? { instructorId: { in: instructors.map((i) => i.id) } } : { instructorId: me.id };
    const [scores, notes] = await Promise.all([this.db.score.findMany({ where: only }), this.db.inspectionNote.findMany({ where: only })]);

    const scoresOf = (instructorId: string, student: number): ItemScore[] =>
      scores.filter((s) => s.instructorId === instructorId && s.student === student);
    const itemsOf = (list: ItemScore[]) =>
      Object.fromEntries(
        (Object.keys(parts) as PartName[]).map((part) => [
          part,
          Array.from({ length: parts[part].items }, (_, i) => list.find((s) => s.part === part && s.item === i + 1)?.value ?? null),
        ]),
      );
    const noteOf = (instructorId: string, student: number) =>
      notes.find((n) => n.instructorId === instructorId && n.student === student)?.text ?? null;

    return {
      open,
      // how many must finish before the results are out
      needed,
      instructors: instructors.map((i) => ({ name: i.name, finished: Boolean(i.finishedAt), me: i.id === me.id })),
      students: students.map((name, s) => {
        const number = s + 1;
        const mine = evaluate(scoresOf(me.id, number));
        if (!open) return { number, name, mine };
        const each = instructors.map((i) => {
          const list = scoresOf(i.id, number);
          return { name: i.name, me: i.id === me.id, result: evaluate(list), items: itemsOf(list), note: noteOf(i.id, number) };
        });
        return { number, name, mine, instructors: each, average: average(each.map((e) => e.result)) };
      }),
    };
  }
}
