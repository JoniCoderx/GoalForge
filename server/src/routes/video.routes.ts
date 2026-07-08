import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, badRequest, notFound } from '../utils/http.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { generateContent } from '../services/content.service.js';
import { enqueueRender } from '../services/render.service.js';
import { serializeVideo } from '../utils/serialize.js';
import { env } from '../config/env.js';
import { storage } from '../services/storage/index.js';
import { recordActivity } from '../services/activity.service.js';
import type { Scene } from '../types/content.js';

const router = Router();
router.use(requireAuth);

const sceneSchema = z.object({
  index: z.number().int(),
  heading: z.string(),
  narration: z.string(),
  caption: z.string(),
  durationSec: z.number(),
  stat: z.string().optional(),
});

const contentSchema = z.object({
  templateKey: z.string().min(1),
  topic: z.string().max(160).optional(),
  title: z.string().max(140).optional(),
  hook: z.string().max(200).optional(),
  script: z.string().optional(),
  scenes: z.array(sceneSchema).optional(),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  tiktokDescription: z.string().optional(),
  instagramDescription: z.string().optional(),
  youtubeDescription: z.string().optional(),
  thumbnailText: z.string().optional(),
  cta: z.string().optional(),
});

/** List the current user's videos, optionally filtered by status. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    const videos = await prisma.video.findMany({
      where: { userId: req.user!.sub, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    res.json({ videos: videos.map(serializeVideo) });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const video = await prisma.video.findFirst({ where: { id: req.params.id, userId: req.user!.sub } });
    if (!video) throw notFound('Video not found');
    res.json({ video: serializeVideo(video) });
  })
);

/**
 * One-click generate: build the full content package for a template and persist
 * it as a DRAFT video ready to edit and export.
 */
router.post(
  '/generate',
  validateBody(z.object({
    templateKey: z.string().min(1),
    topic: z.string().max(160).optional(),
    tone: z.string().max(60).optional(),
    audience: z.string().max(120).optional(),
    autoExport: z.boolean().optional(),
  })),
  asyncHandler(async (req, res) => {
    const { templateKey, topic, tone, audience, autoExport } = req.body as {
      templateKey: string;
      topic?: string;
      tone?: string;
      audience?: string;
      autoExport?: boolean;
    };
    const template = await prisma.template.findUnique({ where: { key: templateKey } });
    if (!template) throw notFound('Template not found');

    const director = (await prisma.prompt.findUnique({ where: { key: 'system.director' } }))?.content;
    const { content, source } = await generateContent(template, { topic, tone, audience, directorPrompt: director });

    const video = await prisma.video.create({
      data: {
        userId: req.user!.sub,
        title: content.title,
        topic: content.topic,
        templateKey: template.key,
        status: 'DRAFT',
        hook: content.hook,
        script: content.script,
        scenes: JSON.stringify(content.scenes),
        caption: content.caption,
        hashtags: JSON.stringify(content.hashtags),
        tiktokDescription: content.tiktokDescription,
        instagramDescription: content.instagramDescription,
        youtubeDescription: content.youtubeDescription,
        thumbnailText: content.thumbnailText,
        cta: content.cta,
        width: env.video.width,
        height: env.video.height,
        fps: env.video.fps,
      },
    });

    void recordActivity('generate', `Generated "${video.title}"`, req.user!.sub, { templateKey: template.key });
    let jobId: string | undefined;
    if (autoExport) jobId = await enqueueRender(video.id, req.user!.sub);

    res.status(201).json({ video: serializeVideo(video), source, jobId });
  })
);

/** Create a video from an already-generated/edited content package. */
router.post(
  '/',
  validateBody(contentSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof contentSchema>;
    const template = await prisma.template.findUnique({ where: { key: body.templateKey } });
    if (!template) throw badRequest('Template not found');
    const scenes: Scene[] = body.scenes ?? [];

    const video = await prisma.video.create({
      data: {
        userId: req.user!.sub,
        title: body.title ?? `${template.name}`,
        topic: body.topic ?? '',
        templateKey: template.key,
        status: 'DRAFT',
        hook: body.hook ?? '',
        script: body.script ?? scenes.map((s) => s.narration).join(' '),
        scenes: JSON.stringify(scenes),
        caption: body.caption ?? '',
        hashtags: JSON.stringify(body.hashtags ?? []),
        tiktokDescription: body.tiktokDescription ?? '',
        instagramDescription: body.instagramDescription ?? '',
        youtubeDescription: body.youtubeDescription ?? '',
        thumbnailText: body.thumbnailText ?? '',
        cta: body.cta ?? '',
        width: env.video.width,
        height: env.video.height,
        fps: env.video.fps,
      },
    });
    res.status(201).json({ video: serializeVideo(video) });
  })
);

const updateSchema = contentSchema.partial().extend({
  title: z.string().max(140).optional(),
});

/** Update editable fields of a draft/video. */
router.patch(
  '/:id',
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.video.findFirst({ where: { id: req.params.id, userId: req.user!.sub } });
    if (!existing) throw notFound('Video not found');
    const b = req.body as z.infer<typeof updateSchema>;

    const video = await prisma.video.update({
      where: { id: existing.id },
      data: {
        ...(b.title !== undefined ? { title: b.title } : {}),
        ...(b.topic !== undefined ? { topic: b.topic } : {}),
        ...(b.hook !== undefined ? { hook: b.hook } : {}),
        ...(b.script !== undefined ? { script: b.script } : {}),
        ...(b.scenes !== undefined ? { scenes: JSON.stringify(b.scenes) } : {}),
        ...(b.caption !== undefined ? { caption: b.caption } : {}),
        ...(b.hashtags !== undefined ? { hashtags: JSON.stringify(b.hashtags) } : {}),
        ...(b.tiktokDescription !== undefined ? { tiktokDescription: b.tiktokDescription } : {}),
        ...(b.instagramDescription !== undefined ? { instagramDescription: b.instagramDescription } : {}),
        ...(b.youtubeDescription !== undefined ? { youtubeDescription: b.youtubeDescription } : {}),
        ...(b.thumbnailText !== undefined ? { thumbnailText: b.thumbnailText } : {}),
        ...(b.cta !== undefined ? { cta: b.cta } : {}),
      },
    });
    res.json({ video: serializeVideo(video) });
  })
);

/** Queue a render/export for a video. */
router.post(
  '/:id/export',
  asyncHandler(async (req, res) => {
    const video = await prisma.video.findFirst({ where: { id: req.params.id, userId: req.user!.sub } });
    if (!video) throw notFound('Video not found');
    if (video.status === 'RENDERING' || video.status === 'QUEUED') {
      throw badRequest('This video is already in the export queue');
    }
    const jobId = await enqueueRender(video.id, req.user!.sub);
    void recordActivity('export', `Queued export for "${video.title}"`, req.user!.sub);
    res.status(202).json({ jobId, status: 'QUEUED' });
  })
);

/** Placeholder analytics interaction (simulated engagement). */
router.post(
  '/:id/engagement',
  asyncHandler(async (req, res) => {
    const video = await prisma.video.findFirst({ where: { id: req.params.id, userId: req.user!.sub } });
    if (!video) throw notFound('Video not found');
    const updated = await prisma.video.update({
      where: { id: video.id },
      data: {
        views: video.views + Math.floor(Math.random() * 500),
        likes: video.likes + Math.floor(Math.random() * 80),
        shares: video.shares + Math.floor(Math.random() * 20),
      },
    });
    res.json({ video: serializeVideo(updated) });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const video = await prisma.video.findFirst({ where: { id: req.params.id, userId: req.user!.sub } });
    if (!video) throw notFound('Video not found');
    await prisma.video.delete({ where: { id: video.id } });
    await storage.remove(`videos/${video.id}/reel.mp4`);
    await storage.remove(`videos/${video.id}/thumb.jpg`);
    res.json({ ok: true });
  })
);

export default router;
