import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { config } from '../config.js';

// The copy of each password that User Management can show, encrypted with AES-256-GCM under
// PASSWORD_KEY. Logins never use it (they check the argon2id hash). The account's id is bound in
// as associated data, so a sealed password copied onto another account won't open.
//
// Stored as "v1.<iv>.<tag>.<ciphertext>", each part base64url.

export function seal(password: string, userId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', config.passwordKey, iv);
  cipher.setAAD(Buffer.from(userId));
  const ciphertext = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), ciphertext].map((part) => (typeof part === 'string' ? part : part.toString('base64url'))).join('.');
}

// the password, or null if it can't be opened (another key, another account, or tampered with)
export function unseal(sealed: string, userId: string): string | null {
  const [version, iv, tag, ciphertext] = sealed.split('.');
  if (version !== 'v1' || !iv || !tag || ciphertext === undefined) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', config.passwordKey, Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(userId));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
