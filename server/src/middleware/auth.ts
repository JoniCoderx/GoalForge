import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type JwtPayload } from '../utils/jwt.js';
import { forbidden, unauthorized } from '../utils/http.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.token;
  return cookieToken ?? null;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next(unauthorized('Authentication required'));
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'ADMIN') return next(forbidden('Admin access required'));
  next();
}
