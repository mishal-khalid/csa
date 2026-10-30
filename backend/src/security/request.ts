import type { Request } from 'express';
import { config } from '../config.js';

// The caller's IP address, for rate limits and the sign-in record. On Vercel it comes from the
// x-real-ip header, which Vercel's edge sets itself (a caller can't forge it). Elsewhere, such as
// locally, it's the connection's own address, since any header could be made up.
export function clientIp(req: Request): string {
  if (config.onVercel) {
    const header = req.headers['x-real-ip'];
    if (typeof header === 'string' && header) return header;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

export function userAgent(req: Request): string | undefined {
  return req.headers['user-agent']?.slice(0, 512);
}

// Runs a task but answers no sooner than `ms`, so how long a reply takes says nothing about the
// answer (e.g. whether an account exists, or whether its password was checked).
export async function atLeast<T>(ms: number, task: Promise<T>): Promise<T> {
  const [result] = await Promise.allSettled([task, new Promise((resolve) => setTimeout(resolve, ms))]);
  if (result.status === 'rejected') throw result.reason;
  return result.value;
}
