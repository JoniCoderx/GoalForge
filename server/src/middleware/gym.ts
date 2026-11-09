import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyGymToken } from '../utils/jwt.js';
import { unauthorized } from '../utils/http.js';

/** Read the gym token from the request header (never from the URL). */
export function gymTokenFrom(req: Request): string | null {
  const header = req.headers['x-gym-token'];
  return typeof header === 'string' && header ? header : null;
}

/** Requires a signed-in gym member; exposes their id as `res.locals.memberId`. */
export function requireGym(req: Request, res: Response, next: NextFunction) {
  const token = gymTokenFrom(req);
  const memberId = token ? verifyGymToken(token) : null;
  if (!memberId) return next(unauthorized('יש להתחבר מחדש'));
  prisma.gymMember
    .findUnique({ where: { id: memberId }, select: { id: true } })
    .then((m) => {
      if (!m) return next(unauthorized('המשתמש לא קיים יותר'));
      res.locals.memberId = m.id;
      next();
    })
    .catch(next);
}
