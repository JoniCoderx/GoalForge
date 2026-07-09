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
import expensesRoutes from './expenses.routes.js';
import { openaiStatus } from '../services/openai.service.js';

const router = Router();

// Deploy fingerprint: Render injects RENDER_GIT_COMMIT, so /api/health shows
// exactly which commit is live — a stale deploy is visible at a glance.
const bootedAt = new Date().toISOString();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'goalforge-api',
    time: new Date().toISOString(),
    commit: (process.env.RENDER_GIT_COMMIT ?? 'unknown').slice(0, 7),
    bootedAt,
    ai: openaiStatus(),
  });
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
router.use('/expenses', expensesRoutes);

export default router;
