// Empties the MJSCC evaluation's tables: every instructor (with their sessions, scores and notes),
// the command draw and the sign-in counts. The two-phone test (mjscc/e2e) runs it before and after.
// It only touches a database on this machine, unless it's run with --live (npm run
// supabase:mjscc-reset), which empties the real evaluation on Supabase, so Saturday starts clean.
import 'dotenv/config';
import pg from 'pg';

const live = process.argv.includes('--live');
const url = process.env.MJSCC_DIRECT_URL ?? process.env.MJSCC_DATABASE_URL;
if (!url) throw new Error('MJSCC_DATABASE_URL is not set');
const host = new URL(url).hostname;
const local = ['127.0.0.1', 'localhost', '::1'].includes(host);
if (!local && !live) throw new Error(`refusing to empty a database that isn't local (${host}) without --live`);

// node-postgres doesn't know Prisma's "schema" setting; every table is named in full below anyway
const client = new pg.Client({ connectionString: url.replace(/[?&]schema=mjscc/, '') });
await client.connect();
await client.query('delete from mjscc.instructors; delete from mjscc.command_draws; delete from mjscc.rate_limits;');
const { rows } = await client.query(
  'select (select count(*) from mjscc.instructors) + (select count(*) from mjscc.scores) + (select count(*) from mjscc.command_draws) as "left"',
);
await client.end();
console.log(`${local ? 'Local' : 'Live'} MJSCC evaluation emptied (${rows[0].left} rows left).`);
