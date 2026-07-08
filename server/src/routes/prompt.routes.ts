import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, notFound } from '../utils/http.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const prompts = await prisma.prompt.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ prompts });
  })
);

const updateSchema = z.object({
  content: z.string().min(1).max(4000),
});

/**
 * System prompts are global (shared across all users), so only admins may edit
 * them — otherwise one user's change would alter everyone's AI generations.
 */
router.put(
  '/:key',
  requireAdmin,
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    const prompt = await prisma.prompt.findUnique({ where: { key: req.params.key } });
    if (!prompt) throw notFound('Prompt not found');
    const updated = await prisma.prompt.update({
      where: { key: req.params.key },
      data: { content: (req.body as z.infer<typeof updateSchema>).content },
    });
    res.json({ prompt: updated });
  })
);

export default router;
