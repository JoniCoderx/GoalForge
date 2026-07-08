import { prisma } from '../lib/prisma.js';

export type ActivityType = 'signup' | 'login' | 'generate' | 'export' | 'render' | 'error' | 'event';

/**
 * Record a user activity event and bump the user's lastActivityAt. Best-effort:
 * never throws into the request path.
 */
export async function recordActivity(
  type: ActivityType,
  message: string,
  userId?: string | null,
  meta: Record<string, unknown> = {}
): Promise<void> {
  try {
    await prisma.activity.create({
      data: { type, message, userId: userId ?? null, meta: JSON.stringify(meta) },
    });
    if (userId) {
      await prisma.user.update({ where: { id: userId }, data: { lastActivityAt: new Date() } }).catch(() => undefined);
    }
  } catch {
    /* never break the request path on telemetry */
  }
}
