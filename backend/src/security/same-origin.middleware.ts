import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

// Cross-site request forgery protection, on top of the strict same-site cookies: anything that
// changes something (every method but GET, HEAD and OPTIONS) must come from the portal itself and
// be JSON, which a form on another site can't send.
export function sameOrigin(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const fromPortal = req.headers.origin === config.portalOrigin;
  const isJson = req.headers['content-type']?.split(';')[0].trim() === 'application/json';
  if (fromPortal && isJson) return next();
  res.status(403).json({ code: 'forbidden' });
}
