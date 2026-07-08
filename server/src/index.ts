import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

async function main() {
  const app = createApp();

  // Verify DB connectivity early with a clear error if misconfigured.
  try {
    await prisma.$queryRaw`SELECT 1`;
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

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close();
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
