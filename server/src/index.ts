import { promisify } from 'node:util';
import { createApp } from './app.js';
import { env, assertProductionSafety } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { bootstrap } from './services/bootstrap.js';
import { recoverOrphanedJobs } from './services/render.service.js';

async function main() {
  // Fail fast on insecure production configuration (e.g. missing JWT_SECRET).
  assertProductionSafety();

  const app = createApp();

  // Verify DB connectivity early with a clear error if misconfigured.
  try {
    await prisma.$queryRaw`SELECT 1`;
    // Idempotently seed templates/prompts (and admin) so a fresh prod DB works out of the box.
    await bootstrap();
    // Fail out any renders left mid-flight by a previous restart.
    await recoverOrphanedJobs();
  } catch (err) {
    logger.error('Database connection failed', {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  const server = app.listen(env.port, () => {
    logger.info(`GoalForge API listening on port ${env.port}`, {
      env: env.nodeEnv,
      ai: env.openaiApiKey ? 'configured' : 'local-fallback',
    });
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down gracefully`);
    try {
      await promisify(server.close.bind(server))();
    } catch {
      /* already closed */
    }
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Fatal startup error', { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
