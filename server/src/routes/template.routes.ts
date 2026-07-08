import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, notFound } from '../utils/http.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const templates = await prisma.template.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ templates });
  })
);

router.get(
  '/:key',
  asyncHandler(async (req, res) => {
    const template = await prisma.template.findUnique({ where: { key: req.params.key } });
    if (!template) throw notFound('Template not found');
    res.json({ template });
  })
);

export default router;
