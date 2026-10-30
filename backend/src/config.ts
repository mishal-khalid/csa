import 'dotenv/config';
import { z } from 'zod';

// The backend's settings, from the environment (.env locally, the project's settings on Vercel).
// It refuses to start if any are missing or malformed, rather than running half-protected.
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  // the only site allowed to call the API, e.g. https://portal.agee.pro
  PORTAL_ORIGIN: z.url(),
  TURNSTILE_SECRET_KEY: z.string().min(1),
  // signs the bot-check cookie
  HUMAN_SECRET: z.string().min(32),
  // encrypts the passwords User Management can show: 32 random bytes, base64
  PASSWORD_KEY: z.base64().refine((key) => Buffer.from(key, 'base64').length === 32, 'must be 32 bytes'),
  PORT: z.coerce.number().int().default(3300),
  // set by Vercel on its servers
  VERCEL: z.string().optional(),
});

const env = schema.parse(process.env);

export const config = {
  databaseUrl: env.DATABASE_URL,
  portalOrigin: env.PORTAL_ORIGIN.replace(/\/$/, ''),
  turnstileSecret: env.TURNSTILE_SECRET_KEY,
  humanSecret: env.HUMAN_SECRET,
  passwordKey: Buffer.from(env.PASSWORD_KEY, 'base64'),
  port: env.PORT,
  onVercel: Boolean(env.VERCEL),
};
