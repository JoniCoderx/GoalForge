import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/http.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  // Body-parser errors (malformed JSON, payload too large) — return clean 4xx
  // instead of a 500, and don't log them as unhandled server errors.
  const parseErr = err as { type?: string; status?: number; statusCode?: number };
  if (parseErr?.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in (err as object))) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (parseErr?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  const clientStatus = parseErr?.status ?? parseErr?.statusCode;
  if (typeof clientStatus === 'number' && clientStatus >= 400 && clientStatus < 500) {
    return res.status(clientStatus).json({ error: err instanceof Error ? err.message : 'Bad request' });
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  logger.error(`Unhandled error on ${req.method} ${req.path}`, { message });
  void logger.record('error', `Unhandled error: ${message}`, { path: req.path, method: req.method });

  res.status(500).json({ error: 'Internal server error' });
}
