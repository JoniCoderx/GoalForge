import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { TEMPLATE_SEEDS } from '../src/data/templates.js';
import { PROMPT_SEEDS } from '../src/data/prompts.js';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@goalforge.ai';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'goalforge123';

async function main() {
  console.log('🌱 Seeding GoalForge AI…');

  // Templates
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
  console.log(`  ✓ ${TEMPLATE_SEEDS.length} templates`);

  // Prompts
  for (const p of PROMPT_SEEDS) {
    await prisma.prompt.upsert({
      where: { key: p.key },
      update: { name: p.name, description: p.description, category: p.category, content: p.content },
      create: { ...p, isSystem: true },
    });
  }
  console.log(`  ✓ ${PROMPT_SEEDS.length} prompts`);

  // Admin user
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL.toLowerCase() },
    update: { role: 'ADMIN' },
    create: {
      email: ADMIN_EMAIL.toLowerCase(),
      name: 'GoalForge Admin',
      passwordHash,
      role: 'ADMIN',
      avatarColor: '#22c55e',
    },
  });
  await prisma.brandSettings.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });
  console.log(`  ✓ admin user (${ADMIN_EMAIL} / ${ADMIN_PASSWORD})`);

  // Demo user
  const demoHash = await bcrypt.hash('demo1234', 10);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@goalforge.ai' },
    update: {},
    create: {
      email: 'demo@goalforge.ai',
      name: 'Demo Creator',
      passwordHash: demoHash,
      role: 'USER',
      avatarColor: '#0ea5e9',
    },
  });
  await prisma.brandSettings.upsert({
    where: { userId: demo.id },
    update: {},
    create: { userId: demo.id },
  });
  console.log('  ✓ demo user (demo@goalforge.ai / demo1234)');

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
