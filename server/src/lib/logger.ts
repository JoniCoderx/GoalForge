import { prisma } from './prisma.js';

type Level = 'info' | 'warn' | 'error';

const colors: Record<Level, string> = {
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};
const reset = '\x1b[0m';

function stamp(level: Level, message: string, context?: unknown) {
  const time = new Date().toISOString();
  const ctx = context ? ` ${JSON.stringify(context)}` : '';
  const line = `${colors[level]}[${level.toUpperCase()}]${reset} ${time} ${message}${ctx}`;
  // Route warn/error to stderr so log processors and alerting pick them up.
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

/** Persist a log line to the database (best-effort) and echo to stdout. */
async function persist(level: Level, message: string, context?: Record<string, unknown>, userId?: string) {
  stamp(level, message, context);
  try {
    await prisma.log.create({
      data: {
        level,
        message,
        context: JSON.stringify(context ?? {}),
        userId: userId ?? null,
      },
    });
  } catch {
    // Never let logging break the request path.
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => stamp('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => stamp('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => stamp('error', message, context),
  record: persist,
};
