import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Test-only config (dev dependency `vitest`). Kept separate from vite.config.ts
// so the production build never imports vitest.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  })
);
