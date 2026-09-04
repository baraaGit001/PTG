import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

/** Ensures every request carries an `x-request-id`, generating one if the caller didn't supply it. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers['x-request-id'];
  const requestId = typeof existing === 'string' && existing.length > 0 ? existing : randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
