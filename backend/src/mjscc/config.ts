import 'dotenv/config';
import { z } from 'zod';

// The MJSCC evaluation's settings. They're optional as a group: without MJSCC_DATABASE_URL the
// evaluation's routes aren't served at all and the API runs exactly as before. Once it's set, the
// rest must be too, or the API refuses to start (as it does for its own settings, in ../config.ts).
const schema = z.object({
  MJSCC_DATABASE_URL: z.string().min(1),
  // the only site allowed to call the evaluation's routes, e.g. https://mjscc.agee.pro
  MJSCC_ORIGIN: z.url(),
  // the code the instructors type with their name, given out on the day
  MJSCC_ACCESS_CODE: z.string().trim().min(6),
  // The evaluating instructors, comma-separated, written as their names should show. Only they can
  // sign in, and the results come out once every one of them has finished.
  MJSCC_INSTRUCTORS: z
    .string()
    .transform((list) => list.split(',').map((name) => name.normalize('NFC').replace(/\s+/g, ' ').trim()).filter(Boolean))
    .pipe(z.array(z.string().min(2).max(40)).min(1)),
});

// The key a typed name is matched on: capitals, spaces and apostrophes don't matter, so "mishal" and
// " MISH’AL " are both Mish'al.
export const nameKey = (name: string) =>
  name.normalize('NFC').replace(/['’‘`]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('en');

function load() {
  if (!process.env.MJSCC_DATABASE_URL) return null;
  const env = schema.parse(process.env);
  const keys = env.MJSCC_INSTRUCTORS.map(nameKey);
  if (new Set(keys).size !== keys.length) throw new Error('MJSCC_INSTRUCTORS names the same instructor twice');
  return {
    databaseUrl: env.MJSCC_DATABASE_URL,
    origin: env.MJSCC_ORIGIN.replace(/\/$/, ''),
    accessCode: env.MJSCC_ACCESS_CODE,
    instructors: env.MJSCC_INSTRUCTORS,
  };
}

export const mjsccConfig = load();

// whether an instructor is (still) on the list
export const isListed = (key: string) => mjsccConfig!.instructors.some((name) => nameKey(name) === key);

// whether a request is for the evaluation's routes
export const isMjsccPath = (path: string) => /^\/mjscc(\/|\?|$)/.test(path);
