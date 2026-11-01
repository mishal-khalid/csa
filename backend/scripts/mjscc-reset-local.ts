// Empties the MJSCC evaluation's tables in the local test database: every instructor (with their
// sessions, scores and notes), the command draw and the sign-in counts. The two-phone test
// (mjscc/e2e) runs it before and after. It refuses any database that isn't on this machine.
import 'dotenv/config';
import pg from 'pg';

const url = process.env.MJSCC_DATABASE_URL;
if (!url) throw new Error('MJSCC_DATABASE_URL is not set');
const host = new URL(url).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) throw new Error(`refusing to empty a database that isn't local (${host})`);

// node-postgres doesn't know Prisma's "schema" setting; every table is named in full below anyway
const client = new pg.Client({ connectionString: url.replace(/[?&]schema=mjscc/, '') });
await client.connect();
await client.query('delete from mjscc.instructors; delete from mjscc.command_draws; delete from mjscc.rate_limits;');
await client.end();
console.log('Local MJSCC evaluation emptied.');
