import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

/** Aggregate dashboard analytics — computed in the database, not by loading rows. */
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);

    const [total, ready, jobs, rendersCompleted, durationSum, grouped, recentVideos, recentRenders] =
      await Promise.all([
        prisma.video.count({ where: { userId } }),
        prisma.video.count({ where: { userId, status: 'READY' } }),
        prisma.exportJob.count({ where: { userId } }),
        prisma.exportJob.count({ where: { userId, status: 'READY' } }),
        prisma.video.aggregate({ where: { userId, status: 'READY' }, _sum: { durationSec: true } }),
        prisma.video.groupBy({ by: ['templateKey'], where: { userId }, _count: { _all: true } }),
        // Only the last 14 days of rows are needed for the timeline chart.
        prisma.video.findMany({
          where: { userId, createdAt: { gte: since } },
          select: { createdAt: true },
          take: 5000,
        }),
        prisma.exportJob.findMany({
          where: { userId, status: 'READY', finishedAt: { gte: since } },
          select: { finishedAt: true },
          take: 5000,
        }),
      ]);

    const byTemplate: Record<string, number> = {};
    for (const g of grouped) byTemplate[g.templateKey] = g._count._all;

    // Build a 14-day timeline from the bounded recent sets — all real events.
    const days: { date: string; count: number; rendered: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        count: recentVideos.filter((v) => v.createdAt.toISOString().slice(0, 10) === key).length,
        rendered: recentRenders.filter((j) => j.finishedAt?.toISOString().slice(0, 10) === key).length,
      });
    }

    res.json({
      totals: {
        videos: total,
        ready,
        exports: jobs,
        rendersCompleted,
        minutesRendered: +(((durationSum._sum.durationSec ?? 0) / 60).toFixed(1)),
      },
      byTemplate,
      timeline: days,
    });
  })
);

export default router;
