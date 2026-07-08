import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../utils/http.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

async function ensureBrand(userId: string) {
  return (
    (await prisma.brandSettings.findUnique({ where: { userId } })) ??
    (await prisma.brandSettings.create({ data: { userId } }))
  );
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const brand = await ensureBrand(req.user!.sub);
    res.json({ brand });
  })
);

const hex = z.string().regex(/^#([0-9a-fA-F]{6})$/, 'Must be a hex colour like #22c55e');

const updateSchema = z.object({
  brandName: z.string().min(1).max(60).optional(),
  primaryColor: hex.optional(),
  secondaryColor: hex.optional(),
  accentColor: hex.optional(),
  backgroundColor: hex.optional(),
  fontFamily: z.enum(['BigShoulders', 'Arsenal', 'BigShouldersRegular']).optional(),
  watermarkText: z.string().max(40).optional(),
  watermarkEnabled: z.boolean().optional(),
  ctaText: z.string().max(160).optional(),
  logoPath: z.string().max(500).nullable().optional(),
  outroPath: z.string().max(500).nullable().optional(),
});

router.put(
  '/',
  validateBody(updateSchema),
  asyncHandler(async (req, res) => {
    await ensureBrand(req.user!.sub);
    const brand = await prisma.brandSettings.update({
      where: { userId: req.user!.sub },
      data: req.body as z.infer<typeof updateSchema>,
    });
    res.json({ brand });
  })
);

export default router;
