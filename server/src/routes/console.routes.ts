import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { asyncHandler, badRequest, notFound, unauthorized } from '../utils/http.js';
import { validateBody } from '../middleware/validate.js';
import { requireConsole } from '../middleware/console.js';
import { signConsoleToken } from '../utils/jwt.js';
import { recordActivity } from '../services/activity.service.js';

const router = Router();

/* ─────────────── Auth (password gate) ─────────────── */

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

router.post(
  '/auth',
  validateBody(z.object({ password: z.string().min(1).max(200) })),
  asyncHandler(async (req, res) => {
    const { password } = req.body as { password: string };
    if (!safeEqual(password, env.superadminPassword)) {
      throw unauthorized('Incorrect console password');
    }
    res.json({ token: signConsoleToken() });
  })
);

// Everything below requires a valid console token.
router.use(requireConsole);

router.get('/session', (_req, res) => res.json({ ok: true }));

/* ─────────────── Serialization ─────────────── */

function serializeUser(u: any) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarColor: u.avatarColor,
    plan: u.plan,
    status: u.status,
    premiumUntil: u.premiumUntil,
    usageResetAt: u.usageResetAt,
    lastActivityAt: u.lastActivityAt,
    createdAt: u.createdAt,
    videos: u._count?.videos ?? 0,
    exports: u._count?.exportJobs ?? 0,
  };
}

/* ─────────────── Metrics ─────────────── */

router.get(
  '/metrics',
  asyncHandler(async (_req, res) => {
    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);
    const now = new Date();

    const [totalUsers, activeUsers, bannedUsers, premiumUsers, totalVideos, rendered, totalExports, recentUsers, recentJobs] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'active' } }),
        prisma.user.count({ where: { status: 'banned' } }),
        prisma.user.count({ where: { OR: [{ plan: { not: 'free' } }, { premiumUntil: { gt: now } }] } }),
        prisma.video.count(),
        prisma.video.count({ where: { status: 'READY' } }),
        prisma.exportJob.count(),
        prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true }, take: 5000 }),
        prisma.exportJob.findMany({
          where: { status: 'READY', finishedAt: { gte: since } },
          select: { finishedAt: true },
          take: 5000,
        }),
      ]);

    const days: { date: string; signups: number; renders: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        signups: recentUsers.filter((u) => u.createdAt.toISOString().slice(0, 10) === key).length,
        renders: recentJobs.filter((j) => j.finishedAt && j.finishedAt.toISOString().slice(0, 10) === key).length,
      });
    }

    res.json({
      totals: { totalUsers, activeUsers, premiumUsers, bannedUsers, totalVideos, rendered, totalExports },
      timeline: days,
    });
  })
);

/* ─────────────── Users ─────────────── */

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const plan = typeof req.query.plan === 'string' ? req.query.plan : '';

    const where: any = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;
    if (search) {
      where.OR = [{ email: { contains: search.toLowerCase() } }, { name: { contains: search } }];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { _count: { select: { videos: true, exportJobs: true } } },
    });
    res.json({ users: users.map(serializeUser) });
  })
);

router.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { videos: true, exportJobs: true } } },
    });
    if (!user) throw notFound('User not found');
    const [activity, videos, failed] = await Promise.all([
      prisma.activity.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 25 }),
      prisma.video.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, status: true, templateKey: true, createdAt: true },
      }),
      prisma.video.count({ where: { userId: user.id, status: 'FAILED' } }),
    ]);
    res.json({ user: serializeUser(user), activity, videos, failedRenders: failed });
  })
);

const patchSchema = z.object({
  action: z.enum(['ban', 'unban', 'grantPremium', 'removePremium', 'resetLimits']).optional(),
  plan: z.enum(['free', 'creator', 'studio']).optional(),
  status: z.enum(['active', 'trial', 'expired', 'banned']).optional(),
  premiumDays: z.number().int().min(1).max(3650).optional(),
});

router.patch(
  '/users/:id',
  validateBody(patchSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw notFound('User not found');
    const b = req.body as z.infer<typeof patchSchema>;

    const data: any = {};
    let note = 'updated';
    switch (b.action) {
      case 'ban':
        data.status = 'banned';
        note = 'banned';
        break;
      case 'unban':
        data.status = 'active';
        note = 'unbanned';
        break;
      case 'grantPremium': {
        const days = b.premiumDays ?? 30;
        const until = new Date();
        until.setDate(until.getDate() + days);
        data.premiumUntil = until;
        data.plan = 'studio';
        data.status = 'active';
        note = `granted premium (${days}d)`;
        break;
      }
      case 'removePremium':
        data.premiumUntil = null;
        data.plan = 'free';
        note = 'premium removed';
        break;
      case 'resetLimits':
        data.usageResetAt = new Date();
        note = 'limits reset';
        break;
      default:
        break;
    }
    if (b.plan) {
      data.plan = b.plan;
      note = `plan → ${b.plan}`;
    }
    if (b.status) {
      data.status = b.status;
      note = `status → ${b.status}`;
    }
    if (Object.keys(data).length === 0) throw badRequest('No changes provided');

    const updated = await prisma.user.update({
      where: { id: user.id },
      include: { _count: { select: { videos: true, exportJobs: true } } },
      data,
    });
    void recordActivity('event', `Admin: ${note} for ${user.email}`, user.id, { by: 'console' });
    res.json({ user: serializeUser(updated) });
  })
);

/* ─────────────── Activity feed ─────────────── */

router.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const type = typeof req.query.type === 'string' && req.query.type ? req.query.type : undefined;
    const activity = await prisma.activity.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { email: true, name: true, avatarColor: true } } },
    });
    res.json({ activity });
  })
);

/* ─────────────── Coupons ─────────────── */

router.get(
  '/coupons',
  asyncHandler(async (_req, res) => {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
    res.json({ coupons });
  })
);

const couponSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, 'Use letters, numbers, - or _ only'),
  discountPercent: z.number().int().min(1).max(100),
  maxUses: z.number().int().min(1).max(1_000_000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  note: z.string().max(200).optional(),
  active: z.boolean().optional(),
});

router.post(
  '/coupons',
  validateBody(couponSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof couponSchema>;
    const code = b.code.toUpperCase();
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) throw badRequest('A coupon with that code already exists');
    const coupon = await prisma.coupon.create({
      data: {
        code,
        discountPercent: b.discountPercent,
        maxUses: b.maxUses ?? null,
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
        note: b.note ?? '',
        active: b.active ?? true,
      },
    });
    res.status(201).json({ coupon });
  })
);

const couponUpdateSchema = couponSchema.partial().omit({ code: true });

router.patch(
  '/coupons/:id',
  validateBody(couponUpdateSchema),
  asyncHandler(async (req, res) => {
    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!coupon) throw notFound('Coupon not found');
    const b = req.body as z.infer<typeof couponUpdateSchema>;
    const coupon2 = await prisma.coupon.update({
      where: { id: coupon.id },
      data: {
        ...(b.discountPercent !== undefined ? { discountPercent: b.discountPercent } : {}),
        ...(b.maxUses !== undefined ? { maxUses: b.maxUses } : {}),
        ...(b.expiresAt !== undefined ? { expiresAt: b.expiresAt ? new Date(b.expiresAt) : null } : {}),
        ...(b.note !== undefined ? { note: b.note } : {}),
        ...(b.active !== undefined ? { active: b.active } : {}),
      },
    });
    res.json({ coupon: coupon2 });
  })
);

router.delete(
  '/coupons/:id',
  asyncHandler(async (req, res) => {
    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!coupon) throw notFound('Coupon not found');
    await prisma.coupon.delete({ where: { id: coupon.id } });
    res.json({ ok: true });
  })
);

export default router;
