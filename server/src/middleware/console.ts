import type { NextFunction, Request, Response } from 'express';
import { verifyConsoleToken } from '../utils/jwt.js';
import { unauthorized } from '../utils/http.js';

/**
 * Gate for the private owner console (/users). Requires a valid console token
 * obtained by entering the console password — independent of normal user auth,
 * so no regular (or even ADMIN) user session can reach these endpoints.
 */
export function requireConsole(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers['x-console-token'];
  const token = typeof header === 'string' ? header : Array.isArray(header) ? header[0] : null;
  if (!token || !verifyConsoleToken(token)) {
    return next(unauthorized('Console access denied'));
  }
  next();
}
