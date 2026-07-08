import { Router } from 'express';
import authRoutes from './auth.routes.js';
import aiRoutes from './ai.routes.js';
import videoRoutes from './video.routes.js';
import templateRoutes from './template.routes.js';
import promptRoutes from './prompt.routes.js';
import brandRoutes from './brand.routes.js';
import exportRoutes from './export.routes.js';
import analyticsRoutes from './analytics.routes.js';
import adminRoutes from './admin.routes.js';
import consoleRoutes from './console.routes.js';
import { openaiStatus } from '../services/openai.service.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'goalforge-api', time: new Date().toISOString(), ai: openaiStatus() });
});

router.use('/auth', authRoutes);
router.use('/ai', aiRoutes);
router.use('/videos', videoRoutes);
router.use('/templates', templateRoutes);
router.use('/prompts', promptRoutes);
router.use('/brand', brandRoutes);
router.use('/exports', exportRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);
router.use('/console', consoleRoutes);

export default router;
