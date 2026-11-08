import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { asyncHandler, badRequest, notFound, unauthorized } from '../utils/http.js';
import { validateBody } from '../middleware/validate.js';
import { requireGym } from '../middleware/gym.js';
import { signGymToken } from '../utils/jwt.js';

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
/** A forgotten timer must not log a 3-day workout — cap any single session. */
const MAX_SESSION_MIN = 300;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

router.post(
  '/auth',
  validateBody(z.object({ password: z.string().min(1).max(200) })),
  asyncHandler(async (req, res) => {
    if (!safeEqual((req.body as { password: string }).password, env.gymPassword)) {
      throw unauthorized('סיסמה שגויה');
    }
    res.json({ token: signGymToken() });
  })
);

router.use(requireGym);
router.get('/session', (_req, res) => res.json({ ok: true }));

const minutesBetween = (a: Date, b: Date) =>
  Math.min(MAX_SESSION_MIN, Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000)));

/* ─────────────── Members ─────────────── */

router.get(
  '/members',
  asyncHandler(async (_req, res) => {
    const members = await prisma.gymMember.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ members });
  })
);

router.post(
  '/members',
  validateBody(
    z.object({
      name: z.string().trim().min(1).max(40),
      emoji: z.string().max(8).optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const b = req.body as { name: string; emoji?: string; color?: string };
    const exists = await prisma.gymMember.findUnique({ where: { name: b.name } });
    if (exists) throw badRequest('כבר יש חבר עם השם הזה');
    const member = await prisma.gymMember.create({
      data: { name: b.name, ...(b.emoji ? { emoji: b.emoji } : {}), ...(b.color ? { color: b.color } : {}) },
    });
    res.status(201).json({ member });
  })
);

router.delete(
  '/members/:id',
  asyncHandler(async (req, res) => {
    const m = await prisma.gymMember.findUnique({ where: { id: req.params.id } });
    if (!m) throw notFound('Member not found');
    await prisma.gymMember.delete({ where: { id: m.id } });
    res.json({ ok: true });
  })
);

/* ─────────────── Workouts ─────────────── */

const include = { member: true } as const;

router.get(
  '/active',
  asyncHandler(async (_req, res) => {
    const workouts = await prisma.gymWorkout.findMany({
      where: { endedAt: null },
      include,
      orderBy: { startedAt: 'asc' },
    });
    res.json({ workouts });
  })
);

router.get(
  '/workouts',
  asyncHandler(async (req, res) => {
    const memberId = typeof req.query.memberId === 'string' ? req.query.memberId : undefined;
    const workouts = await prisma.gymWorkout.findMany({
      where: { endedAt: { not: null }, ...(memberId ? { memberId } : {}) },
      include,
      orderBy: { startedAt: 'desc' },
      take: 200,
    });
    res.json({ workouts });
  })
);

router.post(
  '/workouts/start',
  validateBody(z.object({ memberId: z.string().min(1), equipment: z.string().max(80).optional() })),
  asyncHandler(async (req, res) => {
    const { memberId, equipment } = req.body as { memberId: string; equipment?: string };
    const member = await prisma.gymMember.findUnique({ where: { id: memberId } });
    if (!member) throw notFound('Member not found');
    const live = await prisma.gymWorkout.findFirst({ where: { memberId, endedAt: null } });
    if (live) throw badRequest('יש כבר אימון פעיל — סיים אותו קודם');
    const workout = await prisma.gymWorkout.create({
      data: { memberId, equipment: equipment ?? '', startedAt: new Date() },
      include,
    });
    res.status(201).json({ workout });
  })
);

router.post(
  '/workouts/:id/stop',
  validateBody(z.object({ notes: z.string().max(300).optional(), equipment: z.string().max(80).optional() })),
  asyncHandler(async (req, res) => {
    const w = await prisma.gymWorkout.findUnique({ where: { id: req.params.id } });
    if (!w) throw notFound('Workout not found');
    if (w.endedAt) throw badRequest('האימון כבר הסתיים');
    const b = req.body as { notes?: string; equipment?: string };
    const endedAt = new Date();
    // An accidental start/stop (under a minute) isn't a workout — don't let
    // it inflate anyone's session count in the weekly table.
    if (endedAt.getTime() - w.startedAt.getTime() < 60_000) {
      await prisma.gymWorkout.delete({ where: { id: w.id } });
      return res.json({ workout: null, discarded: true });
    }
    const workout = await prisma.gymWorkout.update({
      where: { id: w.id },
      data: {
        endedAt,
        durationMin: minutesBetween(w.startedAt, endedAt),
        ...(b.notes !== undefined ? { notes: b.notes } : {}),
        ...(b.equipment !== undefined ? { equipment: b.equipment } : {}),
      },
      include,
    });
    res.json({ workout });
  })
);

/** Manually log a past workout (forgot to start the timer). */
router.post(
  '/workouts',
  validateBody(
    z.object({
      memberId: z.string().min(1),
      startedAt: z.coerce.date(),
      durationMin: z.number().int().min(1).max(MAX_SESSION_MIN),
      equipment: z.string().max(80).optional(),
      notes: z.string().max(300).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const b = req.body as { memberId: string; startedAt: Date; durationMin: number; equipment?: string; notes?: string };
    if (b.startedAt.getTime() > Date.now() + 60_000) throw badRequest('אי אפשר לרשום אימון בעתיד');
    const member = await prisma.gymMember.findUnique({ where: { id: b.memberId } });
    if (!member) throw notFound('Member not found');
    const workout = await prisma.gymWorkout.create({
      data: {
        memberId: b.memberId,
        startedAt: b.startedAt,
        endedAt: new Date(b.startedAt.getTime() + b.durationMin * 60000),
        durationMin: b.durationMin,
        equipment: b.equipment ?? '',
        notes: b.notes ?? '',
      },
      include,
    });
    res.status(201).json({ workout });
  })
);

router.delete(
  '/workouts/:id',
  asyncHandler(async (req, res) => {
    const w = await prisma.gymWorkout.findUnique({ where: { id: req.params.id } });
    if (!w) throw notFound('Workout not found');
    await prisma.gymWorkout.delete({ where: { id: w.id } });
    res.json({ ok: true });
  })
);

/* ─────────────── Weekly table ─────────────── */

/**
 * Per-member stats for the 7 days starting at `start` (the client sends its
 * local week start, so "this week" matches the friends' timezone).
 */
router.get(
  '/week',
  asyncHandler(async (req, res) => {
    const start = new Date(String(req.query.start ?? ''));
    if (Number.isNaN(start.getTime())) throw badRequest('Invalid week start');
    const end = new Date(start.getTime() + 7 * DAY_MS);
    // Client's timezone offset (Date#getTimezoneOffset, minutes) so "a day"
    // for streaks means the friends' local calendar day, not UTC.
    const tz = Math.max(-840, Math.min(840, Number(req.query.tz) || 0));
    const dayKey = (d: Date) => Math.floor((d.getTime() - tz * 60000) / DAY_MS);

    const [members, workouts, recent] = await Promise.all([
      prisma.gymMember.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.gymWorkout.findMany({
        where: { endedAt: { not: null }, startedAt: { gte: start, lt: end } },
        select: { memberId: true, startedAt: true, durationMin: true },
      }),
      prisma.gymWorkout.findMany({
        where: { endedAt: { not: null }, startedAt: { gte: new Date(Date.now() - 90 * DAY_MS) } },
        select: { memberId: true, startedAt: true },
      }),
    ]);

    /** Consecutive training days ending today (or yesterday — today isn't over yet). */
    const today = dayKey(new Date());
    const streakOf = (memberId: string) => {
      const days = new Set(recent.filter((w) => w.memberId === memberId).map((w) => dayKey(w.startedAt)));
      let d = days.has(today) ? today : today - 1;
      let streak = 0;
      while (days.has(d)) {
        streak++;
        d--;
      }
      return streak;
    };

    const rows = members.map((m) => {
      const mine = workouts.filter((w) => w.memberId === m.id);
      const daily = Array.from({ length: 7 }, () => 0);
      for (const w of mine) {
        const idx = Math.floor((w.startedAt.getTime() - start.getTime()) / DAY_MS);
        if (idx >= 0 && idx < 7) daily[idx] += w.durationMin;
      }
      return {
        member: m,
        sessions: mine.length,
        minutes: mine.reduce((a, w) => a + w.durationMin, 0),
        activeDays: daily.filter((d) => d > 0).length,
        streak: streakOf(m.id),
        daily,
      };
    });
    rows.sort((a, b) => b.minutes - a.minutes || b.sessions - a.sessions);

    res.json({
      start: start.toISOString(),
      end: end.toISOString(),
      rows,
      totals: {
        sessions: workouts.length,
        minutes: workouts.reduce((a, w) => a + w.durationMin, 0),
      },
    });
  })
);

export default router;
