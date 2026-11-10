import { Router, type Response } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { GymExercise, GymSetLog } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { asyncHandler, badRequest, notFound, unauthorized } from '../utils/http.js';
import { validateBody } from '../middleware/validate.js';
import { requireGym } from '../middleware/gym.js';
import { signGymToken } from '../utils/jwt.js';
import { cancelRestPush, getVapidKeys, pushToMember, scheduleRestPush } from '../services/push.service.js';

const router = Router();

const PLAN_KEYS = ['A', 'B'] as const;
const MAX_IMAGE_BYTES = 1_500_000;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

const me = (res: Response) => res.locals.memberId as string;

const memberDto = (m: { id: string; name: string; emoji: string; color: string }) => ({
  id: m.id,
  name: m.name,
  emoji: m.emoji,
  color: m.color,
});

/**
 * Photo URLs are signed per image+version instead of carrying the login
 * token (URLs end up in proxy/request logs; a leaked signature only reveals
 * that one machine photo).
 */
const imageSig = (id: string, version: number) =>
  createHmac('sha256', env.jwtSecret).update(`gym-img:${id}:${version}`).digest('base64url').slice(0, 32);

const exerciseDto = (e: GymExercise) => ({
  id: e.id,
  name: e.name,
  sets: e.sets,
  repsMin: e.repsMin,
  repsMax: e.repsMax,
  notes: e.notes,
  position: e.position,
  hasImage: !!e.image,
  imageVersion: e.imageVersion,
  imageKey: e.image ? imageSig(e.id, e.imageVersion) : null,
});

/** Programs A and B always exist — created lazily on first use. */
async function ensurePlans() {
  for (const key of PLAN_KEYS) {
    await prisma.gymPlan.upsert({ where: { key }, update: {}, create: { key, name: `אימון ${key}` } });
  }
}

/* ─────────────── Accounts (public) ─────────────── */

const pinSchema = z.string().regex(/^\d{4,8}$/, 'קוד אישי: 4–8 ספרות');

/** Names for the sign-in screen (no personal data). */
router.get(
  '/roster',
  asyncHandler(async (_req, res) => {
    const members = await prisma.gymMember.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ members: members.map((m) => ({ ...memberDto(m), hasPin: !!m.pinHash })) });
  })
);

router.post(
  '/auth/register',
  validateBody(
    z.object({
      code: z.string().min(1).max(200),
      name: z.string().trim().min(1).max(30),
      pin: pinSchema,
      emoji: z.string().max(8).optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const b = req.body as { code: string; name: string; pin: string; emoji?: string; color?: string };
    if (!safeEqual(b.code, env.gymPassword)) throw unauthorized('קוד ההצטרפות שגוי');
    if (await prisma.gymMember.findUnique({ where: { name: b.name } })) throw badRequest('השם הזה כבר תפוס');
    const member = await prisma.gymMember.create({
      data: {
        name: b.name,
        pinHash: await bcrypt.hash(b.pin, 10),
        ...(b.emoji ? { emoji: b.emoji } : {}),
        ...(b.color ? { color: b.color } : {}),
      },
    });
    res.status(201).json({ token: signGymToken(member.id), member: memberDto(member) });
  })
);

router.post(
  '/auth/login',
  validateBody(z.object({ memberId: z.string().min(1), pin: pinSchema, code: z.string().max(200).optional() })),
  asyncHandler(async (req, res) => {
    const b = req.body as { memberId: string; pin: string; code?: string };
    const member = await prisma.gymMember.findUnique({ where: { id: b.memberId } });
    if (!member) throw unauthorized('משתמש לא נמצא');
    if (!member.pinHash) {
      // Account from the first version of the app, without a PIN yet: claiming
      // it requires the group code, then the chosen PIN becomes theirs.
      if (!b.code || !safeEqual(b.code, env.gymPassword)) throw unauthorized('להגדרת קוד אישי צריך גם את קוד ההצטרפות');
      await prisma.gymMember.update({ where: { id: member.id }, data: { pinHash: await bcrypt.hash(b.pin, 10) } });
    } else if (!(await bcrypt.compare(b.pin, member.pinHash))) {
      throw unauthorized('קוד אישי שגוי');
    }
    res.json({ token: signGymToken(member.id), member: memberDto(member) });
  })
);

/* ─────────────── Everything below: signed-in member ─────────────── */

/** Machine photo. <img> can't send headers, so access is by signed URL. */
router.get(
  '/exercises/:id/image',
  asyncHandler(async (req, res) => {
    const e = await prisma.gymExercise.findUnique({
      where: { id: req.params.id },
      select: { image: true, imageType: true, imageVersion: true },
    });
    const key = typeof req.query.k === 'string' ? req.query.k : '';
    if (!e?.image || !safeEqual(key, imageSig(req.params.id, e.imageVersion))) throw notFound('No image');
    res.setHeader('Content-Type', e.imageType ?? 'image/jpeg');
    // URLs carry ?v=<version>, so a new photo always gets a new URL.
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.send(Buffer.from(e.image));
  })
);

router.use(requireGym);

router.get(
  '/me',
  asyncHandler(async (_req, res) => {
    const m = await prisma.gymMember.findUniqueOrThrow({ where: { id: me(res) } });
    res.json({ member: memberDto(m) });
  })
);

router.get(
  '/members',
  asyncHandler(async (_req, res) => {
    const members = await prisma.gymMember.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ members: members.map(memberDto) });
  })
);

/* ─────────────── Lock-screen notifications (Web Push) ─────────────── */

router.get(
  '/push/key',
  asyncHandler(async (_req, res) => {
    res.json({ publicKey: (await getVapidKeys()).publicKey });
  })
);

router.post(
  '/push/subscribe',
  validateBody(
    z.object({
      endpoint: z.string().url().max(1000),
      keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
    })
  ),
  asyncHandler(async (req, res) => {
    const { endpoint, keys } = req.body as { endpoint: string; keys: { p256dh: string; auth: string } };
    if (!/^https:\/\//.test(endpoint)) throw badRequest('Invalid endpoint');
    await prisma.gymPushSub.upsert({
      where: { endpoint },
      update: { memberId: me(res), p256dh: keys.p256dh, auth: keys.auth },
      create: { endpoint, memberId: me(res), p256dh: keys.p256dh, auth: keys.auth },
    });
    res.json({ ok: true });
  })
);

router.post(
  '/push/unsubscribe',
  validateBody(z.object({ endpoint: z.string().max(1000) })),
  asyncHandler(async (req, res) => {
    await prisma.gymPushSub.deleteMany({ where: { endpoint: req.body.endpoint, memberId: me(res) } });
    res.json({ ok: true });
  })
);

router.post(
  '/push/test',
  asyncHandler(async (_req, res) => {
    const sent = await pushToMember(me(res), { title: 'GYM·LOG', body: 'ההתראות עובדות 💪', tag: 'test', url: '/gym' });
    res.json({ sent });
  })
);

/** Ping this member's phones when the rest period ends. */
router.post(
  '/push/rest',
  validateBody(z.object({ seconds: z.number().int().min(5).max(900), body: z.string().max(120).optional() })),
  asyncHandler(async (req, res) => {
    const { seconds, body } = req.body as { seconds: number; body?: string };
    scheduleRestPush(me(res), seconds, body || 'יאללה, לסט הבא 💪');
    res.json({ ok: true });
  })
);

router.delete('/push/rest', (_req, res) => {
  cancelRestPush(me(res));
  res.json({ ok: true });
});

/* ─────────────── Shared programs A / B ─────────────── */

async function loadPlans() {
  await ensurePlans();
  const plans = await prisma.gymPlan.findMany({
    orderBy: { key: 'asc' },
    include: { exercises: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
  });
  return plans.map((p) => ({ key: p.key, name: p.name, exercises: p.exercises.map(exerciseDto) }));
}

const planKeyOf = (raw: string) => {
  const key = raw.toUpperCase();
  if (!(PLAN_KEYS as readonly string[]).includes(key)) throw notFound('Plan not found');
  return key;
};

router.get(
  '/plans',
  asyncHandler(async (_req, res) => {
    res.json({ plans: await loadPlans() });
  })
);

router.patch(
  '/plans/:key',
  validateBody(z.object({ name: z.string().trim().min(1).max(40) })),
  asyncHandler(async (req, res) => {
    await ensurePlans();
    await prisma.gymPlan.update({ where: { key: planKeyOf(req.params.key) }, data: { name: req.body.name } });
    res.json({ plans: await loadPlans() });
  })
);

const exerciseBody = z
  .object({
    name: z.string().trim().min(1).max(60),
    sets: z.number().int().min(1).max(12),
    repsMin: z.number().int().min(1).max(100),
    repsMax: z.number().int().min(1).max(100),
    notes: z.string().max(400).optional(),
  })
  .refine((b) => b.repsMax >= b.repsMin, { message: 'טווח החזרות לא תקין', path: ['repsMax'] });

router.post(
  '/plans/:key/exercises',
  validateBody(exerciseBody),
  asyncHandler(async (req, res) => {
    await ensurePlans();
    const plan = await prisma.gymPlan.findUniqueOrThrow({ where: { key: planKeyOf(req.params.key) } });
    const last = await prisma.gymExercise.findFirst({ where: { planId: plan.id }, orderBy: { position: 'desc' } });
    const b = req.body as z.infer<typeof exerciseBody>;
    const exercise = await prisma.gymExercise.create({
      data: { ...b, notes: b.notes ?? '', planId: plan.id, position: (last?.position ?? -1) + 1 },
    });
    res.status(201).json({ exercise: exerciseDto(exercise) });
  })
);

router.patch(
  '/exercises/:id',
  validateBody(exerciseBody),
  asyncHandler(async (req, res) => {
    const e = await prisma.gymExercise.findUnique({ where: { id: req.params.id } });
    if (!e) throw notFound('Exercise not found');
    const b = req.body as z.infer<typeof exerciseBody>;
    const exercise = await prisma.gymExercise.update({ where: { id: e.id }, data: { ...b, notes: b.notes ?? '' } });
    res.json({ exercise: exerciseDto(exercise) });
  })
);

router.delete(
  '/exercises/:id',
  asyncHandler(async (req, res) => {
    const e = await prisma.gymExercise.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!e) throw notFound('Exercise not found');
    // Logged sets keep their snapshotted name (exerciseId becomes null).
    await prisma.gymExercise.delete({ where: { id: e.id } });
    res.json({ ok: true });
  })
);

router.post(
  '/plans/:key/order',
  validateBody(z.object({ ids: z.array(z.string()).max(200) })),
  asyncHandler(async (req, res) => {
    const plan = await prisma.gymPlan.findUniqueOrThrow({ where: { key: planKeyOf(req.params.key) } });
    const ids = req.body.ids as string[];
    const owned = await prisma.gymExercise.findMany({ where: { planId: plan.id }, select: { id: true } });
    const ownedIds = new Set(owned.map((o) => o.id));
    if (ids.length !== ownedIds.size || ids.some((id) => !ownedIds.has(id))) throw badRequest('Order does not match the plan');
    await prisma.$transaction(ids.map((id, i) => prisma.gymExercise.update({ where: { id }, data: { position: i } })));
    res.json({ plans: await loadPlans() });
  })
);

router.put(
  '/exercises/:id/image',
  validateBody(z.object({ data: z.string().min(1), type: z.string() })),
  asyncHandler(async (req, res) => {
    const { data, type } = req.body as { data: string; type: string };
    if (!IMAGE_TYPES.includes(type)) throw badRequest('סוג תמונה לא נתמך');
    const bytes = Buffer.from(data, 'base64');
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) throw badRequest('התמונה גדולה מדי');
    const e = await prisma.gymExercise.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!e) throw notFound('Exercise not found');
    const exercise = await prisma.gymExercise.update({
      where: { id: e.id },
      data: { image: bytes, imageType: type, imageVersion: { increment: 1 } },
    });
    res.json({ exercise: exerciseDto(exercise) });
  })
);

router.delete(
  '/exercises/:id/image',
  asyncHandler(async (req, res) => {
    const e = await prisma.gymExercise.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!e) throw notFound('Exercise not found');
    const exercise = await prisma.gymExercise.update({
      where: { id: e.id },
      data: { image: null, imageType: null, imageVersion: { increment: 1 } },
    });
    res.json({ exercise: exerciseDto(exercise) });
  })
);

/* ─────────────── Workouts (personal) ─────────────── */

const setDto = (s: GymSetLog) => ({ weight: s.weight, reps: s.reps, done: s.done });
const counts = (s: GymSetLog) => s.done || (s.weight != null && s.reps != null);

async function mySession(res: Response, id: string) {
  const session = await prisma.gymSession.findUnique({ where: { id } });
  if (!session || session.memberId !== me(res)) throw notFound('Workout not found');
  return session;
}

/** This member's sets for an exercise from their most recent *finished* workout. */
async function previousFor(memberId: string, exerciseId: string, excludeSessionId: string) {
  const hit = await prisma.gymSetLog.findFirst({
    where: { exerciseId, sessionId: { not: excludeSessionId }, session: { memberId, endedAt: { not: null } } },
    orderBy: { session: { startedAt: 'desc' } },
    select: { sessionId: true, session: { select: { startedAt: true } } },
  });
  if (!hit) return null;
  const logs = await prisma.gymSetLog.findMany({
    where: { sessionId: hit.sessionId, exerciseId },
    orderBy: { setIndex: 'asc' },
  });
  const sets = logs.filter(counts).map(setDto);
  return sets.length ? { date: hit.session.startedAt, sets } : null;
}

const STALE_MS = 8 * 60 * 60 * 1000;

/**
 * A workout nobody finished (forgot to tap "finish") must not stay "in
 * progress" for days. After 8 hours it is closed at the time of its last
 * logged set — or deleted if nothing was logged.
 */
async function closeStaleSessions(memberId: string) {
  const stale = await prisma.gymSession.findMany({
    where: { memberId, endedAt: null, startedAt: { lt: new Date(Date.now() - STALE_MS) } },
    include: { sets: true },
  });
  for (const s of stale) {
    const real = s.sets.filter(counts);
    if (real.length === 0) {
      await prisma.gymSession.delete({ where: { id: s.id } });
      continue;
    }
    const last = Math.max(...real.map((x) => x.updatedAt.getTime()));
    await prisma.gymSetLog.deleteMany({ where: { sessionId: s.id, done: false, OR: [{ weight: null }, { reps: null }] } });
    await prisma.gymSession.update({ where: { id: s.id }, data: { endedAt: new Date(Math.max(last, s.startedAt.getTime() + 60_000)) } });
  }
}

router.get(
  '/sessions/active',
  asyncHandler(async (_req, res) => {
    await closeStaleSessions(me(res));
    const session = await prisma.gymSession.findFirst({
      where: { memberId: me(res), endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    res.json({ session });
  })
);

router.post(
  '/sessions',
  validateBody(z.object({ planKey: z.string() })),
  asyncHandler(async (req, res) => {
    const key = planKeyOf(req.body.planKey);
    await closeStaleSessions(me(res));
    const active = await prisma.gymSession.findFirst({ where: { memberId: me(res), endedAt: null } });
    if (active) return res.json({ session: active, resumed: true });
    await ensurePlans();
    const plan = await prisma.gymPlan.findUniqueOrThrow({ where: { key } });
    const session = await prisma.gymSession.create({ data: { memberId: me(res), planKey: key, planName: plan.name } });
    res.status(201).json({ session, resumed: false });
  })
);

/**
 * Full workout view. In progress: the program's current exercises (plus any
 * already-logged ones that were since removed), each with this member's sets
 * and their previous performance. Finished: exactly what was logged.
 */
router.get(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    const session = await mySession(res, req.params.id);
    const logs = await prisma.gymSetLog.findMany({
      where: { sessionId: session.id },
      orderBy: [{ exerciseOrder: 'asc' }, { setIndex: 'asc' }],
    });

    type Item = {
      key: string;
      exercise: ReturnType<typeof exerciseDto> | null;
      name: string;
      sets: ReturnType<typeof setDto>[];
      previous: Awaited<ReturnType<typeof previousFor>>;
    };
    const items: Item[] = [];
    const byKey = new Map<string, GymSetLog[]>();
    for (const l of logs) {
      const k = l.exerciseId ?? `name:${l.exerciseName}`;
      byKey.set(k, [...(byKey.get(k) ?? []), l]);
    }

    if (!session.endedAt) {
      const plan = await prisma.gymPlan.findUnique({
        where: { key: session.planKey },
        include: { exercises: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
      });
      for (const e of plan?.exercises ?? []) {
        items.push({
          key: e.id,
          exercise: exerciseDto(e),
          name: e.name,
          sets: (byKey.get(e.id) ?? []).map(setDto),
          previous: await previousFor(session.memberId, e.id, session.id),
        });
        byKey.delete(e.id);
      }
    }
    for (const [k, ls] of byKey) {
      const ex = ls[0].exerciseId ? await prisma.gymExercise.findUnique({ where: { id: ls[0].exerciseId } }) : null;
      items.push({ key: k, exercise: ex ? exerciseDto(ex) : null, name: ls[0].exerciseName, sets: ls.map(setDto), previous: null });
    }

    res.json({ session, items });
  })
);

router.put(
  '/sessions/:id/exercises/:exerciseId',
  validateBody(
    z.object({
      sets: z
        .array(
          z.object({
            weight: z.number().min(0).max(1000).nullable(),
            reps: z.number().int().min(0).max(1000).nullable(),
            done: z.boolean(),
          })
        )
        .max(30),
    })
  ),
  asyncHandler(async (req, res) => {
    const session = await mySession(res, req.params.id);
    const exercise = await prisma.gymExercise.findUnique({ where: { id: req.params.exerciseId } });
    if (!exercise) throw notFound('Exercise not found');
    const sets = req.body.sets as { weight: number | null; reps: number | null; done: boolean }[];
    // Replace this exercise's sets atomically — autosave sends the full list.
    await prisma.$transaction([
      prisma.gymSetLog.deleteMany({ where: { sessionId: session.id, exerciseId: exercise.id } }),
      prisma.gymSetLog.createMany({
        data: sets.map((s, i) => ({
          sessionId: session.id,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          exerciseOrder: exercise.position,
          setIndex: i,
          weight: s.weight,
          reps: s.reps,
          done: s.done,
        })),
      }),
    ]);
    res.json({ ok: true, savedAt: new Date().toISOString() });
  })
);

router.post(
  '/sessions/:id/finish',
  asyncHandler(async (req, res) => {
    const session = await mySession(res, req.params.id);
    if (session.endedAt) return res.json({ session, discarded: false });
    const logged = await prisma.gymSetLog.findMany({ where: { sessionId: session.id } });
    if (!logged.some(counts)) {
      // Nothing was actually recorded — don't leave an empty workout in history.
      await prisma.gymSession.delete({ where: { id: session.id } });
      return res.json({ session: null, discarded: true });
    }
    await prisma.gymSetLog.deleteMany({ where: { sessionId: session.id, done: false, OR: [{ weight: null }, { reps: null }] } });
    const done = await prisma.gymSession.update({ where: { id: session.id }, data: { endedAt: new Date() } });
    res.json({ session: done, discarded: false });
  })
);

router.delete(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    const session = await mySession(res, req.params.id);
    await prisma.gymSession.delete({ where: { id: session.id } });
    res.json({ ok: true });
  })
);

router.get(
  '/history',
  asyncHandler(async (_req, res) => {
    const sessions = await prisma.gymSession.findMany({
      where: { memberId: me(res), endedAt: { not: null } },
      orderBy: { startedAt: 'desc' },
      take: 200,
      include: { sets: true },
    });
    res.json({
      sessions: sessions.map((s) => {
        const done = s.sets.filter(counts);
        return {
          id: s.id,
          planKey: s.planKey,
          planName: s.planName,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          exercises: new Set(done.map((x) => x.exerciseId ?? x.exerciseName)).size,
          sets: done.length,
          volume: Math.round(done.reduce((a, x) => a + (x.weight ?? 0) * (x.reps ?? 0), 0)),
        };
      }),
    });
  })
);

/* ─────────────── Calendar & stats ─────────────── */

/** Who trained when (everyone) — dates and program only, no performance data. */
router.get(
  '/calendar',
  asyncHandler(async (req, res) => {
    const from = new Date(String(req.query.from ?? ''));
    const to = new Date(String(req.query.to ?? ''));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw badRequest('Invalid range');
    const sessions = await prisma.gymSession.findMany({
      where: { endedAt: { not: null }, startedAt: { gte: from, lt: to } },
      select: { memberId: true, startedAt: true, planKey: true },
      orderBy: { startedAt: 'asc' },
    });
    res.json({ sessions });
  })
);

const DAY_MS = 86_400_000;

/** Attendance for everyone (counts/dates only — never weights or reps). */
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const ws = new Date(String(req.query.ws ?? ''));
    const ms = new Date(String(req.query.ms ?? ''));
    if (Number.isNaN(ws.getTime()) || Number.isNaN(ms.getTime())) throw badRequest('Invalid dates');
    const [members, sessions] = await Promise.all([
      prisma.gymMember.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.gymSession.findMany({
        where: { endedAt: { not: null } },
        select: { memberId: true, startedAt: true, planKey: true },
        orderBy: { startedAt: 'desc' },
      }),
    ]);
    const eightWeeksAgo = new Date(Date.now() - 56 * DAY_MS);
    res.json({
      members: members.map((m) => {
        const mine = sessions.filter((s) => s.memberId === m.id);
        return {
          member: memberDto(m),
          total: mine.length,
          week: mine.filter((s) => s.startedAt >= ws).length,
          month: mine.filter((s) => s.startedAt >= ms).length,
          perWeek: +(mine.filter((s) => s.startedAt >= eightWeeksAgo).length / 8).toFixed(1),
          last: mine[0] ?? null,
        };
      }),
    });
  })
);

/** Personal progress: PRs and per-exercise working-weight history. */
router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const sessions = await prisma.gymSession.findMany({
      where: { memberId: me(res), endedAt: { not: null } },
      orderBy: { startedAt: 'asc' },
      include: { sets: true },
    });
    type Ex = {
      key: string;
      name: string;
      pr: { weight: number; reps: number; date: Date } | null;
      series: { date: Date; weight: number; reps: number }[];
    };
    const map = new Map<string, Ex>();
    for (const s of sessions) {
      const best = new Map<string, { name: string; weight: number; reps: number }>();
      for (const x of s.sets) {
        if (!counts(x) || x.weight == null) continue;
        const k = x.exerciseId ?? `name:${x.exerciseName}`;
        const cur = best.get(k);
        const reps = x.reps ?? 0;
        if (!cur || x.weight > cur.weight || (x.weight === cur.weight && reps > cur.reps)) {
          best.set(k, { name: x.exerciseName, weight: x.weight, reps });
        }
      }
      for (const [k, b] of best) {
        const ex = map.get(k) ?? { key: k, name: b.name, pr: null, series: [] };
        ex.name = b.name;
        ex.series.push({ date: s.startedAt, weight: b.weight, reps: b.reps });
        if (!ex.pr || b.weight > ex.pr.weight || (b.weight === ex.pr.weight && b.reps > ex.pr.reps)) {
          ex.pr = { weight: b.weight, reps: b.reps, date: s.startedAt };
        }
        map.set(k, ex);
      }
    }
    res.json({ total: sessions.length, exercises: [...map.values()].sort((a, b) => b.series.length - a.series.length) });
  })
);

export default router;
