import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { renderVideo } from './video.service.js';
import { recordActivity } from './activity.service.js';
import { parseJson } from '../utils/http.js';
import type { Scene } from '../types/content.js';

/**
 * A tiny in-process, sequential render queue. FFmpeg is CPU heavy, so jobs run
 * one at a time. The architecture (ExportJob rows + a worker loop) mirrors what
 * a real background worker / queue would do, so it can be swapped for BullMQ
 * or a dedicated worker service later without touching callers.
 */
const queue: string[] = [];
let running = false;

/**
 * On boot, reconcile jobs left mid-flight by a previous process. Any job still
 * QUEUED/RENDERING (and its video) is marked FAILED so the UI never shows a
 * render that will never complete. Safe to call on every startup.
 */
export async function recoverOrphanedJobs(): Promise<void> {
  const orphaned = await prisma.exportJob.findMany({
    where: { status: { in: ['QUEUED', 'RENDERING'] } },
    select: { id: true, videoId: true },
  });
  if (orphaned.length === 0) return;
  const message = 'Render interrupted by a server restart. Please export again.';
  await prisma.exportJob.updateMany({
    where: { id: { in: orphaned.map((j) => j.id) } },
    data: { status: 'FAILED', error: message, finishedAt: new Date() },
  });
  await prisma.video.updateMany({
    where: { id: { in: orphaned.map((j) => j.videoId) }, status: { in: ['QUEUED', 'RENDERING'] } },
    data: { status: 'FAILED', error: message },
  });
  logger.warn(`Recovered ${orphaned.length} orphaned render job(s) on startup`);
}

export async function enqueueRender(videoId: string, userId: string): Promise<string> {
  const job = await prisma.exportJob.create({
    data: { videoId, userId, status: 'QUEUED', progress: 0, stage: 'queued' },
  });
  await prisma.video.update({ where: { id: videoId }, data: { status: 'QUEUED' } });
  queue.push(job.id);
  void tick();
  return job.id;
}

async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    while (queue.length > 0) {
      const jobId = queue.shift()!;
      // Never let one job's failure (incl. transient DB errors) reject the loop
      // and surface as an unhandled rejection — isolate each job.
      try {
        await processJob(jobId);
      } catch (err) {
        logger.error('Render job crashed', {
          jobId,
          message: err instanceof Error ? err.message : String(err),
        });
        await prisma.exportJob
          .update({ where: { id: jobId }, data: { status: 'FAILED', error: 'Render failed unexpectedly', finishedAt: new Date() } })
          .catch(() => undefined);
      }
    }
  } finally {
    running = false;
  }
}

async function processJob(jobId: string): Promise<void> {
  const job = await prisma.exportJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  const video = await prisma.video.findUnique({ where: { id: job.videoId } });
  if (!video) {
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: 'Video not found', finishedAt: new Date() },
    });
    return;
  }

  const brand =
    (await prisma.brandSettings.findUnique({ where: { userId: video.userId } })) ??
    (await prisma.brandSettings.create({ data: { userId: video.userId } }));

  try {
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'RENDERING', stage: 'rendering', startedAt: new Date(), progress: 2 },
    });
    await prisma.video.update({ where: { id: video.id }, data: { status: 'RENDERING', error: null } });

    let lastPersist = 0;
    const result = await renderVideo(
      {
        videoId: video.id,
        scenes: parseJson<Scene[]>(video.scenes, []),
        thumbnailText: video.thumbnailText,
        title: video.title,
        brand: {
          primaryColor: brand.primaryColor,
          secondaryColor: brand.secondaryColor,
          accentColor: brand.accentColor,
          backgroundColor: brand.backgroundColor,
          fontFamily: brand.fontFamily,
          watermarkText: brand.watermarkText,
          watermarkEnabled: brand.watermarkEnabled,
        },
        width: video.width,
        height: video.height,
        fps: video.fps,
      },
      (percent, stage) => {
        const now = Date.now();
        if (now - lastPersist > 700 || percent >= 99) {
          lastPersist = now;
          void prisma.exportJob
            .update({ where: { id: jobId }, data: { progress: percent, stage } })
            .catch(() => undefined);
        }
      }
    );

    await prisma.video.update({
      where: { id: video.id },
      data: {
        status: 'READY',
        videoPath: result.videoUrl,
        thumbnailPath: result.thumbnailUrl,
        durationSec: result.durationSec,
        error: null,
      },
    });
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'READY', progress: 100, stage: 'done', finishedAt: new Date() },
    });
    logger.info(`Rendered video ${video.id}`, { duration: result.durationSec });
    void logger.record('info', `Video rendered: ${video.title}`, { videoId: video.id }, video.userId);
    void recordActivity('render', `Rendered "${video.title}"`, video.userId, { videoId: video.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Render failed for ${video.id}`, { message });
    await prisma.video.update({ where: { id: video.id }, data: { status: 'FAILED', error: message } });
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: message, finishedAt: new Date() },
    });
    void logger.record('error', `Render failed: ${message}`, { videoId: video.id }, video.userId);
    void recordActivity('error', `Render failed for "${video.title}"`, video.userId, { message });
  }
}

export function queueDepth(): number {
  return queue.length + (running ? 1 : 0);
}
