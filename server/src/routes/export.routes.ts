import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, notFound } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { queueDepth } from '../services/render.service.js';
import { serializeVideo } from '../utils/serialize.js';

const router = Router();
router.use(requireAuth);

function serializeJob(job: any) {
  return {
    id: job.id,
    videoId: job.videoId,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    error: job.error,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    createdAt: job.createdAt,
    video: job.video ? serializeVideo(job.video) : undefined,
  };
}

/** The live export queue (active + queued jobs). */
router.get(
  '/queue',
  asyncHandler(async (req, res) => {
    const jobs = await prisma.exportJob.findMany({
      where: { userId: req.user!.sub, status: { in: ['QUEUED', 'RENDERING'] } },
      orderBy: { createdAt: 'asc' },
      include: { video: true },
    });
    res.json({ jobs: jobs.map(serializeJob), depth: queueDepth() });
  })
);

/** Full export history (most recent first). */
router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const jobs = await prisma.exportJob.findMany({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { video: true },
    });
    res.json({ jobs: jobs.map(serializeJob) });
  })
);

/** Poll a single job's progress. */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const job = await prisma.exportJob.findFirst({
      where: { id: req.params.id, userId: req.user!.sub },
      include: { video: true },
    });
    if (!job) throw notFound('Export job not found');
    res.json({ job: serializeJob(job) });
  })
);

export default router;
