import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, notFound } from '../utils/http.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { openaiStatus } from '../services/openai.service.js';
import { queueDepth } from '../services/render.service.js';

const router = Router();
router.use(requireAuth, requireAdmin);

/** Platform-wide stats for the admin dashboard. */
router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [users, videos, rendered, jobs, prompts, templates] = await Promise.all([
      prisma.user.count(),
      prisma.video.count(),
      prisma.video.count({ where: { status: 'READY' } }),
      prisma.exportJob.count(),
      prisma.prompt.count(),
      prisma.template.count(),
    ]);
    res.json({
      users,
      videos,
      rendered,
      jobs,
      prompts,
      templates,
      queueDepth: queueDepth(),
      openai: openaiStatus(),
    });
  })
);

router.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarColor: true,
        createdAt: true,
        _count: { select: { videos: true, exportJobs: true } },
      },
    });
    res.json({ users });
  })
);

const roleSchema = z.object({ role: z.enum(['USER', 'ADMIN']) });
router.patch(
  '/users/:id/role',
  validateBody(roleSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw notFound('User not found');
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: (req.body as z.infer<typeof roleSchema>).role },
      select: { id: true, name: true, email: true, role: true },
    });
    res.json({ user: updated });
  })
);

/** Logs feed. */
router.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const level = typeof req.query.level === 'string' ? req.query.level : undefined;
    const logs = await prisma.log.findMany({
      where: level ? { level } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ logs });
  })
);

/** Template management. */
const templateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().min(1).max(300).optional(),
  category: z.string().min(1).max(40).optional(),
  icon: z.string().max(8).optional(),
  gradient: z.string().max(80).optional(),
  accentColor: z.string().regex(/^#([0-9a-fA-F]{6})$/).optional(),
  sceneCount: z.number().int().min(3).max(10).optional(),
  promptTemplate: z.string().min(1).max(2000).optional(),
});

router.patch(
  '/templates/:key',
  validateBody(templateSchema),
  asyncHandler(async (req, res) => {
    const template = await prisma.template.findUnique({ where: { key: req.params.key } });
    if (!template) throw notFound('Template not found');
    const updated = await prisma.template.update({
      where: { key: req.params.key },
      data: req.body as z.infer<typeof templateSchema>,
    });
    res.json({ template: updated });
  })
);

/** Prompt management (create custom prompts). */
const promptSchema = z.object({
  key: z.string().min(2).max(60).regex(/^[a-z0-9._-]+$/i),
  name: z.string().min(1).max(60),
  description: z.string().max(200).default(''),
  category: z.string().max(40).default('custom'),
  content: z.string().min(1).max(4000),
});

router.post(
  '/prompts',
  validateBody(promptSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof promptSchema>;
    const prompt = await prisma.prompt.upsert({
      where: { key: body.key },
      update: { name: body.name, description: body.description, category: body.category, content: body.content },
      create: { ...body, isSystem: false },
    });
    res.status(201).json({ prompt });
  })
);

router.delete(
  '/prompts/:key',
  asyncHandler(async (req, res) => {
    const prompt = await prisma.prompt.findUnique({ where: { key: req.params.key } });
    if (!prompt) throw notFound('Prompt not found');
    if (prompt.isSystem) throw notFound('System prompts cannot be deleted');
    await prisma.prompt.delete({ where: { key: prompt.key } });
    res.json({ ok: true });
  })
);

export default router;
