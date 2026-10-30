// Development only: creates (or resets) a test account in the local test database, with the
// password in DEV_TEST_PASSWORD from .env. Refuses to run against anything but a database on this
// machine, so it can never touch Supabase.
//
//   npm run db:seed-dev

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../src/auth/passwords.js';
import { seal } from '../src/auth/sealed.js';
import { config } from '../src/config.js';

const host = new URL(config.databaseUrl).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
  console.error('Refusing: DATABASE_URL is not a local database.');
  process.exit(1);
}
const password = process.env.DEV_TEST_PASSWORD;
if (!password || password.length < MIN_PASSWORD_LENGTH) {
  console.error(`Set DEV_TEST_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters) in .env first.`);
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
const account = { email: 'test.user@example.com', username: 'test.user', name: 'Test User' };
const passwordHash = await hashPassword(password);
const user = await prisma.user.upsert({
  where: { email: account.email },
  create: { ...account, passwordHash },
  update: { passwordHash, failedLogins: 0, lockedUntil: null, active: true },
});
await prisma.user.update({ where: { id: user.id }, data: { passwordSealed: seal(password, user.id) } });
console.log(`Test account ready: ${account.username} / ${account.email}`);
await prisma.$disconnect();
