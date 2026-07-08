import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { TEMPLATE_SEEDS } from '../data/templates.js';
import { PROMPT_SEEDS } from '../data/prompts.js';

/**
 * Idempotent startup seeding so a fresh production database (Render/Postgres)
 * is immediately usable after `prisma db push` — no manual seed step required.
 * Safe to run on every boot: everything is an upsert.
 */
export async function bootstrap(): Promise<void> {
  try {
    // Core content templates — required for the app to generate anything.
    for (const t of TEMPLATE_SEEDS) {
      await prisma.template.upsert({
        where: { key: t.key },
        update: {
          name: t.name,
          description: t.description,
          category: t.category,
          icon: t.icon,
          gradient: t.gradient,
          accentColor: t.accentColor,
          sceneCount: t.sceneCount,
          promptTemplate: t.promptTemplate,
        },
        create: { ...t, isSystem: true },
      });
    }

    // System prompts that drive the AI pipeline.
    for (const p of PROMPT_SEEDS) {
      await prisma.prompt.upsert({
        where: { key: p.key },
        update: {}, // don't clobber user edits on restart
        create: { ...p, isSystem: true },
      });
    }

    // Default expense categories for the internal tracker.
    const DEFAULT_CATEGORIES = [
      'Development', 'Design', 'Marketing', 'Ads', 'Software / SaaS', 'Hosting',
      'Domain', 'Legal', 'Accounting', 'Team / Contractors', 'Travel', 'Office', 'Other',
    ];
    for (const name of DEFAULT_CATEGORIES) {
      await prisma.expenseCategory.upsert({
        where: { name },
        update: {},
        create: { name, isDefault: true },
      });
    }

    // Optionally provision an admin account when explicit credentials are set.
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
      const email = adminEmail.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        const admin = await prisma.user.create({
          data: { email, name: 'GoalForge Admin', passwordHash, role: 'ADMIN', avatarColor: '#22c55e' },
        });
        await prisma.brandSettings.create({ data: { userId: admin.id } });
        logger.info('Bootstrapped admin user', { email });
      }
    }

    logger.info('Bootstrap complete', { templates: TEMPLATE_SEEDS.length, prompts: PROMPT_SEEDS.length });
  } catch (err) {
    logger.error('Bootstrap failed (continuing)', {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
