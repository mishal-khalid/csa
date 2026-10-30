import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

// What someone signs in with: their email address or their username. Anything with an @ is treated
// as an email, everything else as a username. Both are compared lowercased, after Unicode
// normalisation, so look-alike forms of the same text match the same account.

export const USERNAME = /^[a-z0-9](?:[a-z0-9._-]{1,28})[a-z0-9]$/;
const email = z.email().max(254);

export type Identifier = { kind: 'email'; value: string } | { kind: 'username'; value: string };

export function normalise(raw: string): string {
  return raw.normalize('NFKC').trim().toLowerCase();
}

// the identifier, or null if it isn't a well-formed email or username
export function classify(raw: string): Identifier | null {
  const value = normalise(raw);
  if (value.includes('@')) return email.safeParse(value).success ? { kind: 'email', value } : null;
  return USERNAME.test(value) ? { kind: 'username', value } : null;
}

// Parses a request body against a schema; anything malformed is a plain 400.
export function parse<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) throw new BadRequestException({ code: 'invalid' });
  return result.data;
}

export const identifierBody = z.object({ identifier: z.string().min(1).max(254) }).strict();

export const loginBody = z
  .object({
    identifier: z.string().min(1).max(254),
    // capped so a huge password can't tie up the server hashing it
    password: z.string().min(1).max(256),
  })
  .strict();

export const humanBody = z.object({ token: z.string().min(1).max(4096) }).strict();
