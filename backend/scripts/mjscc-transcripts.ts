// Loads what MJSCC transcripts are drawn with into the evaluation's database: the files listed in
// src/mjscc/transcript-details.ts, from a folder outside git (backend/.mjscc-transcripts unless
// another is given), since the repository is public and these include the stamp, the In-Charge's
// signature and everyone's full name. It replaces whatever was loaded before, and only touches a
// database on this machine unless it's run with --live (npm run supabase:mjscc-transcripts).
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';
import { transcriptDetails, transcriptFiles } from '../src/mjscc/transcript-details.js';

const live = process.argv.includes('--live');
const folder = process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? '.mjscc-transcripts';
const url = process.env.MJSCC_DIRECT_URL ?? process.env.MJSCC_DATABASE_URL;
if (!url) throw new Error('MJSCC_DATABASE_URL is not set');
const host = new URL(url).hostname;
const local = ['127.0.0.1', 'localhost', '::1'].includes(host);
if (!local && !live) throw new Error(`refusing to load into a database that isn't local (${host}) without --live`);

const files = await Promise.all(
  Object.entries(transcriptFiles).map(async ([name, type]) => ({ name, type, data: await readFile(join(folder, name)) })),
);
// details.json must make sense before anything is replaced
const details = transcriptDetails.safeParse(JSON.parse(files.find((f) => f.name === 'details.json')!.data.toString('utf8')));
if (!details.success) throw new Error(`details.json: ${details.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);

// node-postgres doesn't know Prisma's "schema" setting; the table is named in full below anyway
const client = new pg.Client({ connectionString: url.replace(/[?&]schema=mjscc/, '') });
await client.connect();
try {
  await client.query('begin');
  await client.query('delete from mjscc.transcript_files');
  for (const { name, type, data } of files) {
    await client.query('insert into mjscc.transcript_files (name, type, data, updated_at) values ($1, $2, $3, now())', [name, type, data]);
  }
  await client.query('commit');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
const kb = Math.round(files.reduce((sum, f) => sum + f.data.length, 0) / 1024);
console.log(`${local ? 'Local' : 'Live'} MJSCC transcripts: ${files.length} files loaded (${kb} KB) from ${folder}.`);
