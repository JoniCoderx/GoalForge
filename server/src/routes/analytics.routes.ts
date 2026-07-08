import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

/** Aggregate dashboard analytics (placeholders + real counts). */
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const [videos, ready, jobs] = await Promise.all([
      prisma.video.findMany({ where: { userId } }),
      prisma.video.count({ where: { userId, status: 'READY' } }),
      prisma.exportJob.count({ where: { userId } }),
    ]);

    const totalViews = videos.reduce((a, v) => a + v.views, 0);
    const totalLikes = videos.reduce((a, v) => a + v.likes, 0);
    const totalShares = videos.reduce((a, v) => a + v.shares, 0);

    // Group counts by template for the chart.
    const byTemplate: Record<string, number> = {};
    for (const v of videos) byTemplate[v.templateKey] = (byTemplate[v.templateKey] ?? 0) + 1;

    // Build a 14-day timeline of created videos.
    const days: { date: string; count: number; views: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const dayVideos = videos.filter((v) => v.createdAt.toISOString().slice(0, 10) === key);
      days.push({
        date: key,
        count: dayVideos.length,
        views: dayVideos.reduce((a, v) => a + v.views, 0),
      });
    }

    const engagementRate = totalViews > 0 ? +(((totalLikes + totalShares) / totalViews) * 100).toFixed(1) : 0;

    res.json({
      totals: {
        videos: videos.length,
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
