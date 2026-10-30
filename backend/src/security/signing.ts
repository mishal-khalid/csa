import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

// Signed values for the cookies the API hands the browser (besides the session, e.g. the fingerprint
// account picker), so they can't be forged or edited. `purpose` keeps a value signed for one cookie from
// being accepted as another.

function signature(purpose: string, payload: string): string {
  return createHmac('sha256', config.cookieSecret).update(`${purpose}:${payload}`).digest('base64url');
}

export function signed(purpose: string, payload: string): string {
  return `${payload}.${signature(purpose, payload)}`;
}

// the payload, or null if the value wasn't signed by us for this purpose
export function unsigned(purpose: string, value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 512) return null;
  const cut = value.lastIndexOf('.');
  if (cut < 0) return null;
  const payload = value.slice(0, cut);
  const given = Buffer.from(value.slice(cut + 1));
  const expected = Buffer.from(signature(purpose, payload));
  return given.length === expected.length && timingSafeEqual(given, expected) ? payload : null;
}
