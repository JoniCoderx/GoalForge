import type { NextFunction, Request, Response } from 'express';
import { verifyGymToken } from '../utils/jwt.js';
import { unauthorized } from '../utils/http.js';

/** Gate for the friends' gym tracker (/gym): requires the group-password token. */
export function requireGym(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers['x-gym-token'];
  const token = typeof header === 'string' ? header : Array.isArray(header) ? header[0] : null;
  if (!token || !verifyGymToken(token)) return next(unauthorized('Gym access denied'));
  next();
}
