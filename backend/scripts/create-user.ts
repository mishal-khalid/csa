// Creates a portal account (there's no public sign-up besides the portal's User Management). Run it
// yourself, in a terminal, so the password is only ever typed here:
//
//   npm run user:create
//
// It asks for the email, username, name and role (and, while there's no main account yet, whether
// this is it), then the password twice (hidden). The password
// must be at least 10 characters. It's also checked against known data breaches (with Have I Been
// Pwned, which only ever sees the first five characters of its SHA-1 hash): a breached password
// gets a warning, and is used only if you type "yes" to go ahead anyway.

import { createHash, randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';
import { normalise, USERNAME } from '../src/auth/identifiers.js';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../src/auth/passwords.js';
import { seal } from '../src/auth/sealed.js';
import { config } from '../src/config.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
const rl = createInterface({ input: stdin, output: stdout });

// reads a line without echoing it
async function secret(question: string): Promise<string> {
  stdout.write(question);
  const muted = rl as unknown as { _writeToOutput: (s: string) => void };
  const original = muted._writeToOutput;
  muted._writeToOutput = () => {};
  const answer = await rl.question('');
  muted._writeToOutput = original;
  stdout.write('\n');
  return answer;
}

// how many times a password appears in known breaches (k-anonymity: only a hash prefix is sent)
async function breachCount(password: string): Promise<number> {
  const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
  const reply = await fetch(`https://api.pwnedpasswords.com/range/${sha1.slice(0, 5)}`, {
    headers: { 'Add-Padding': 'true' },
  });
  if (!reply.ok) throw new Error(`breach check failed (${reply.status})`);
  for (const line of (await reply.text()).split('\n')) {
    const [suffix, count] = line.trim().split(':');
    if (suffix === sha1.slice(5)) return Number(count);
  }
  return 0;
}

async function main() {
  const email = normalise(await rl.question('Email: '));
  if (!z.email().max(254).safeParse(email).success) throw new Error('That isn’t a valid email address.');
  const username = normalise(await rl.question('Username: '));
  if (!USERNAME.test(username)) {
    throw new Error('Usernames are 3–30 characters: letters, numbers, dots, dashes and underscores, starting and ending with a letter or number.');
  }
  const name = (await rl.question('Name: ')).trim();
  if (!name) throw new Error('A name is required.');
  // the portal's main account (always an admin) is made here, once
  const noMainAccount = (await prisma.user.count({ where: { mainAccount: true } })) === 0;
  const mainAccount = noMainAccount && (await rl.question('There’s no main account yet. Make this it? [y/N]: ')).trim().toLowerCase() === 'y';
  const role = mainAccount
    ? Role.ADMIN
    : (((await rl.question(`Role (${Object.keys(Role).join(', ')}) [CITIZEN]: `)).trim().toUpperCase() || 'CITIZEN') as Role);
  if (!(role in Role)) throw new Error('Unknown role.');

  const password = await secret(`Password (at least ${MIN_PASSWORD_LENGTH} characters): `);
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  if (password.length > 256) throw new Error('The password must be at most 256 characters.');
  if ((await secret('Password again: ')) !== password) throw new Error('The passwords don’t match.');
  const breaches = await breachCount(password);
  if (breaches > 0) {
    console.warn(
      `\nWarning: that password has appeared in ${breaches.toLocaleString()} data breaches. Attackers try leaked passwords like it first, against every account they can find.`,
    );
    const answer = await rl.question('Use it anyway? Type "yes" to continue: ');
    if (answer.trim().toLowerCase() !== 'yes') throw new Error('Cancelled: no account was created.');
  }

  const id = randomUUID();
  const user = await prisma.user.create({
    data: { id, email, username, name, role, mainAccount, passwordHash: await hashPassword(password), passwordSealed: seal(password, id) },
    select: { username: true, role: true, mainAccount: true },
  });
  console.log(`Created ${user.username} (${user.role}${user.mainAccount ? ', the main account' : ''}).`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message.includes('Unique constraint') ? 'That email or username already has an account.' : message);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
    void prisma.$disconnect();
  });
