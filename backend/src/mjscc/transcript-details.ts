import { z } from 'zod';
import { nameKey } from './config.js';
import { students } from './content.js';

// The files a transcript is drawn with, as scripts/mjscc-transcripts.ts loads them from a folder
// outside git into the transcript_files table (the repository is public, so none of them is in it).
// The app draws the PDF in the browser with them (see mjscc/lib/transcript.js).
export const transcriptFiles = {
  // who's who: see transcriptDetails
  'details.json': 'application/json',
  // the template's gold crest at the top, the platoon's round stamp and the In-Charge's signature
  'crest.png': 'image/png',
  'stamp.png': 'image/png',
  'signature.png': 'image/png',
  // The Bismillah at the top: the template's is the letter "c" in A_Bismillah, which browsers refuse
  // as a web font, so it's that letter drawn as a picture of its whole line (its advance wide, its
  // ascent and descent high).
  'bismillah.png': 'image/png',
  // MV Typewriter, for the title and the student's name
  'title.ttf': 'font/ttf',
  'title-bold.ttf': 'font/ttf',
} as const;

export type TranscriptFileName = keyof typeof transcriptFiles;

export const isTranscriptFile = (name: string): name is TranscriptFileName => Object.hasOwn(transcriptFiles, name);

// details.json: each student's rank and full name, under the name the app knows them by, and the
// evaluating instructors as a transcript lists them (rank, full name and any title), in the order it
// lists them, under the name they sign in with. One of them is the Platoon In-Charge, whose signature
// is on the transcripts and who alone can export them.
export const transcriptDetails = z
  .object({
    students: z
      .array(z.object({ student: z.string(), rank: z.string().trim().min(1), name: z.string().trim().min(1) }).strict())
      .refine((list) => list.length === students.length && students.every((s, i) => list[i].student === s), {
        message: `must be the ${students.length} students, in order: ${students.join(', ')}`,
      }),
    instructors: z
      .array(z.object({ name: z.string().trim().min(1), line: z.string().trim().min(1), inCharge: z.boolean().optional() }).strict())
      .min(1)
      .refine((list) => list.filter((i) => i.inCharge).length === 1, { message: 'must have exactly one inCharge' })
      .refine((list) => new Set(list.map((i) => nameKey(i.name))).size === list.length, { message: 'has the same name twice' }),
  })
  .strict();

export type TranscriptDetails = z.infer<typeof transcriptDetails>;
