import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

/** Validate and coerce req.body against a Zod schema. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}
