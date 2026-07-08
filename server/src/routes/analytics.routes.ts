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

    const [total, ready, jobs, sums, grouped, recent] = await Promise.all([
      prisma.video.count({ where: { userId } }),
      prisma.video.count({ where: { userId, status: 'READY' } }),
      prisma.exportJob.count({ where: { userId } }),
      prisma.video.aggregate({ where: { userId }, _sum: { views: true, likes: true, shares: true } }),
      prisma.video.groupBy({ by: ['templateKey'], where: { userId }, _count: { _all: true } }),
      // Only the last 14 days of rows are needed for the timeline chart.
      prisma.video.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { createdAt: true, views: true },
        take: 5000,
      }),
    ]);

    const totalViews = sums._sum.views ?? 0;
    const totalLikes = sums._sum.likes ?? 0;
    const totalShares = sums._sum.shares ?? 0;

    const byTemplate: Record<string, number> = {};
    for (const g of grouped) byTemplate[g.templateKey] = g._count._all;

    // Build a 14-day timeline from the bounded recent set.
    const days: { date: string; count: number; views: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayVideos = recent.filter((v) => v.createdAt.toISOString().slice(0, 10) === key);
      days.push({
        date: key,
        count: dayVideos.length,
        views: dayVideos.reduce((a, v) => a + v.views, 0),
      });
    }

    const engagementRate = totalViews > 0 ? +(((totalLikes + totalShares) / totalViews) * 100).toFixed(1) : 0;

    res.json({
      totals: {
        videos: total,
        ready,
        exports: jobs,
        views: totalViews,
        likes: totalLikes,
        shares: totalShares,
        engagementRate,
      },
      byTemplate,
      timeline: days,
    });
  })
);

export default router;
