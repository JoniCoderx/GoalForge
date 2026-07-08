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
