import { hash, verify, type Algorithm } from '@node-rs/argon2';

// Passwords are stored as argon2id hashes, at OWASP's recommended minimum cost (19 MiB, 2 passes).
// (Algorithm is a const enum the build can't import; 2 is its Argon2id.)
const options = { algorithm: 2 as Algorithm, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

// the shortest password the staff tool accepts for a new account
export const MIN_PASSWORD_LENGTH = 10;

export function hashPassword(password: string): Promise<string> {
  return hash(password, options);
}

export async function checkPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}

// When there's no account to check a password against, one is checked against this throwaway hash
// anyway, so a login for a missing account takes as long as one for a real account.
let dummy: Promise<string> | undefined;
export async function checkAgainstNothing(password: string): Promise<void> {
  dummy ??= hashPassword('not a real password, only here to spend the same time');
  await checkPassword(await dummy, password);
}
