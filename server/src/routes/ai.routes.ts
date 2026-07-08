import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, badRequest, notFound } from '../utils/http.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { generateContent } from '../services/content.service.js';
import { openaiStatus } from '../services/openai.service.js';

const router = Router();

const generateSchema = z.object({
  templateKey: z.string().min(1),
  topic: z.string().max(160).optional(),
  tone: z.string().max(60).optional(),
  audience: z.string().max(120).optional(),
});

router.get('/status', requireAuth, (_req, res) => {
  res.json(openaiStatus());
});

/** Generate a full content package (preview only — does not persist). */
router.post(
  '/generate',
  requireAuth,
  validateBody(generateSchema),
  asyncHandler(async (req, res) => {
    const { templateKey, topic, tone, audience } = req.body as z.infer<typeof generateSchema>;
    const template = await prisma.template.findUnique({ where: { key: templateKey } });
    if (!template) throw notFound('Template not found');

    const director = (await prisma.prompt.findUnique({ where: { key: 'system.director' } }))?.content;
    const { content, source } = await generateContent(template, {
      topic,
      tone,
      audience,
      directorPrompt: director,
    });
    res.json({ content, source, template });
  })
);

const regenSchema = z.object({
  templateKey: z.string().min(1),
  topic: z.string().max(160),
  field: z.enum(['hook', 'caption', 'title', 'cta', 'thumbnailText', 'hashtags']),
});

/** Regenerate a single field. */
router.post(
  '/regenerate',
  requireAuth,
  validateBody(regenSchema),
  asyncHandler(async (req, res) => {
    const { templateKey, topic, field } = req.body as z.infer<typeof regenSchema>;
    const template = await prisma.template.findUnique({ where: { key: templateKey } });
    if (!template) throw badRequest('Template not found');
    const { content } = await generateContent(template, { topic });
    res.json({ field, value: content[field] });
  })
);

export default router;
