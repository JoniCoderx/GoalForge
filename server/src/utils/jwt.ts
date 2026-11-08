import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

/** Console (owner-only) session token, obtained by entering the console password. */
export function signConsoleToken(): string {
  return jwt.sign({ scope: 'console' }, env.jwtSecret, { expiresIn: '12h' });
}

export function verifyConsoleToken(token: string): boolean {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { scope?: string };
    return payload.scope === 'console';
  } catch {
    return false;
  }
}

/** Expense-tracker session token, obtained by entering the expenses password. */
export function signExpensesToken(): string {
  return jwt.sign({ scope: 'expenses' }, env.jwtSecret, { expiresIn: '12h' });
}

export function verifyExpensesToken(token: string): boolean {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { scope?: string };
    return payload.scope === 'expenses';
  } catch {
    return false;
  }
}

/** Gym app personal session: identifies which member is signed in. */
export function signGymToken(memberId: string): string {
  return jwt.sign({ scope: 'gym', sub: memberId }, env.jwtSecret, { expiresIn: '180d' });
}

/** Returns the signed-in member id, or null for an invalid/expired token. */
export function verifyGymToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { scope?: string; sub?: string };
    return payload.scope === 'gym' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
