import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Production build config. Test config lives in vitest.config.ts so this file
// depends only on runtime/build packages (no dev-only vitest import), which
// keeps `vite build` working even when dev dependencies are omitted.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/storage': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        // Function form: an object form also pulls shared tiny deps (e.g. clsx,
        // used by recharts AND the app shell) into the named chunk, which made
        // every page preload the whole charts bundle.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // Tiny helpers shared by the app shell AND recharts — own chunk so
          // they never drag a heavy chunk along.
          if (/node_modules\/(clsx|tailwind-merge|react-is)\//.test(id)) return 'utils';
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|@remix-run\/router)\//.test(id)) return 'react';
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion';
          // gsap is only used on the landing page.
          if (id.includes('/node_modules/gsap/')) return 'gsap';
          if (/node_modules\/(recharts|recharts-scale|victory-vendor|d3-[^/]+|internmap|decimal\.js-light|lodash|react-smooth|eventemitter3|fast-equals|tiny-invariant)\//.test(id)) return 'charts';
          if (id.includes('/node_modules/@tanstack/')) return 'query';
          return undefined;
        },
      },
    },
  },
});
