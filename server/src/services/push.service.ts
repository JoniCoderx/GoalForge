import webpush from 'web-push';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

let vapid: Promise<{ publicKey: string; privateKey: string }> | null = null;

/** VAPID keys: created once, stored in the DB, cached in memory. */
export function getVapidKeys() {
  vapid ??= (async () => {
    const existing = await prisma.gymPushKey.findUnique({ where: { id: 'vapid' } });
    if (existing) return existing;
    const keys = webpush.generateVAPIDKeys();
    try {
      return await prisma.gymPushKey.create({ data: { id: 'vapid', ...keys } });
    } catch {
      // Another instance created it first — use theirs.
      return prisma.gymPushKey.findUniqueOrThrow({ where: { id: 'vapid' } });
    }
  })().catch((err) => {
    vapid = null;
    throw err;
  });
  return vapid;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

/** Send to every phone of a member; prune subscriptions the browser revoked. */
export async function pushToMember(memberId: string, payload: PushPayload): Promise<number> {
  const [keys, subs] = await Promise.all([getVapidKeys(), prisma.gymPushSub.findMany({ where: { memberId } })]);
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          {
            vapidDetails: { subject: 'mailto:noreply@goalforge.top', publicKey: keys.publicKey, privateKey: keys.privateKey },
            TTL: 120,
            urgency: 'high',
            topic: payload.tag?.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || undefined,
          }
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.gymPushSub.delete({ where: { id: s.id } }).catch(() => undefined);
        } else {
          logger.warn('Push send failed', { status, message: err instanceof Error ? err.message : String(err) });
        }
      }
    })
  );
  return sent;
}

/* ─────────────── Rest-timer notifications ─────────────── */

const restTimers = new Map<string, NodeJS.Timeout>();

/** Notify the member's phones when their rest ends (replaces any pending one). */
export function scheduleRestPush(memberId: string, seconds: number, body: string) {
  cancelRestPush(memberId);
  const t = setTimeout(() => {
    restTimers.delete(memberId);
    void pushToMember(memberId, { title: '⏱️ המנוחה נגמרה', body, tag: 'rest', url: '/gym' }).catch(() => undefined);
  }, seconds * 1000);
  t.unref();
  restTimers.set(memberId, t);
}

export function cancelRestPush(memberId: string) {
  const t = restTimers.get(memberId);
  if (t) clearTimeout(t);
  restTimers.delete(memberId);
}
