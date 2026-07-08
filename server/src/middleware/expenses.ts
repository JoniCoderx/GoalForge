import type { NextFunction, Request, Response } from 'express';
import { verifyExpensesToken } from '../utils/jwt.js';
import { unauthorized } from '../utils/http.js';

/**
 * Gate for the internal expense tracker (/expenses). Requires a valid token
 * obtained by entering the expenses password — independent of user auth, so
 * the page and its APIs are never exposed without the password.
 */
export function requireExpenses(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers['x-expenses-token'];
  const token = typeof header === 'string' ? header : Array.isArray(header) ? header[0] : null;
  if (!token || !verifyExpensesToken(token)) {
    return next(unauthorized('Expense tracker access denied'));
  }
  next();
}
