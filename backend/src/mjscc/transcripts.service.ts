import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import type { Instructor } from '../generated/mjscc/client.js';
import { nameKey } from './config.js';
import { EvaluationService } from './evaluation.service.js';
import { MjsccPrisma } from './prisma.service.js';
import { transcriptDetails, type TranscriptDetails, type TranscriptFileName } from './transcript-details.js';

// Transcripts: one PDF per student, which the app draws in the browser (so the Thaana comes out as the
// phone shapes it) from what this hands over. Only the Platoon In-Charge, whose signature is on them,
// can export them, and only once the results are out; until transcript-details are loaded (see
// scripts/mjscc-transcripts.ts) there's nothing to export.
@Injectable()
export class TranscriptsService {
  constructor(
    private readonly db: MjsccPrisma,
    private readonly evaluation: EvaluationService,
  ) {}

  private async details(): Promise<TranscriptDetails | null> {
    const row = await this.db.transcriptFile.findUnique({ where: { name: 'details.json' } });
    return row ? transcriptDetails.parse(JSON.parse(Buffer.from(row.data).toString('utf8'))) : null;
  }

  // whether this instructor is the one who exports (the app shows the button by this)
  async canExport(me: Instructor): Promise<boolean> {
    const details = await this.details();
    return Boolean(details?.instructors.some((i) => i.inCharge && nameKey(i.name) === me.nameKey));
  }

  private async assertCanExport(me: Instructor): Promise<{ details: TranscriptDetails; results: Awaited<ReturnType<EvaluationService['results']>> }> {
    const details = await this.details();
    if (!details) throw new NotFoundException({ code: 'not_set_up' });
    if (!details.instructors.some((i) => i.inCharge && nameKey(i.name) === me.nameKey)) throw new ForbiddenException({ code: 'not_in_charge' });
    const results = await this.evaluation.results(me);
    if (!results.open) throw new HttpException({ code: 'results_not_out' }, HttpStatus.CONFLICT);
    return { details, results };
  }

  // What goes on a student's transcript: their rank and full name, the instructors' average in each
  // part and overall, what the instructors noted at the inspection, and the instructors who scored, as
  // details.json writes them and in its order.
  async transcript(me: Instructor, student: number) {
    const { details, results } = await this.assertCanExport(me);
    const s = results.students[student - 1];
    if (!s.instructors || !s.average) throw new HttpException({ code: 'results_not_out' }, HttpStatus.CONFLICT);
    const listed = details.instructors.filter((d) => s.instructors!.some((i) => nameKey(i.name) === nameKey(d.name)));
    const part = ({ points, max, percent }: { points: number; max: number; percent: number }) => ({ points, max, percent });
    return {
      student: { number: student, short: s.name, rank: details.students[student - 1].rank, name: details.students[student - 1].name },
      marks: {
        theory: part(s.average.theory),
        drill: part(s.average.drill),
        commanding: part(s.average.commanding),
        inspection: part(s.average.inspection),
        final: s.average.final,
      },
      issues: listed.flatMap((d) => s.instructors!.find((i) => nameKey(i.name) === nameKey(d.name))?.note ?? []),
      instructors: listed.map((d) => d.line),
    };
  }

  async file(me: Instructor, name: TranscriptFileName) {
    await this.assertCanExport(me);
    const row = await this.db.transcriptFile.findUnique({ where: { name } });
    if (!row) throw new NotFoundException({ code: 'not_found' });
    return { type: row.type, data: Buffer.from(row.data) };
  }
}
