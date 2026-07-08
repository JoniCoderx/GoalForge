import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { storageRoot } from './services/storage/index.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = resolve(__dirname, '..');
const clientDist = resolve(serverRoot, '../client/dist');

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      // Enable a real CSP in production (the built SPA has no inline scripts).
      contentSecurityPolicy: env.isProd
        ? {
            useDefaults: true,
            directives: {
              'default-src': ["'self'"],
              'script-src': ["'self'"],
              // framer-motion sets inline style attributes; Tailwind is static.
              'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
              'img-src': ["'self'", 'data:', 'blob:'],
              'media-src': ["'self'", 'blob:'],
              'connect-src': ["'self'"],
              'object-src': ["'none'"],
              'frame-ancestors': ["'self'"],
            },
          }
        : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      // In production, reflect only same-origin / allow-listed origins (never
      // reflect arbitrary origins while credentials are enabled).
      origin: env.isProd
        ? (origin, cb) => {
            if (!origin || env.allowedOrigins.includes(origin)) return cb(null, true);
            return cb(null, false);
          }
        : env.clientUrl,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  if (!env.isProd) app.use(morgan('dev'));

  const jsonMessage = (error: string) => ({ error });

  // Strict limiter to blunt credential stuffing / brute force on auth.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.isProd ? 12 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: jsonMessage('Too many attempts. Please try again in a few minutes.'),
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/console/auth', authLimiter);
  app.use('/api/expenses/auth', authLimiter);

  // Tighter limiter on cost-bearing AI generation endpoints.
  const aiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: env.isProd ? 40 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: jsonMessage('You are generating too quickly. Please slow down.'),
  });
  app.use('/api/ai', aiLimiter);
  app.use('/api/videos/generate', aiLimiter);

  // Broad abuse limiter for ANONYMOUS traffic only. Authenticated requests are
  // exempt: the dashboard legitimately polls status endpoints (export queue,
  // render progress) every couple of seconds, and throttling logged-in users
  // is what caused "Couldn't load…" cards. Logged-in users are already
  // accountable, and their expensive actions (auth, AI generation) keep the
  // strict limiters above. This makes dashboard polling impossible to 429.
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.isProd ? 1000 : 20000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) =>
      Boolean(req.headers.authorization || req.headers['x-console-token'] || req.headers['x-expenses-token']),
    message: jsonMessage('Too many requests. Please try again later.'),
  });
  app.use('/api', limiter);

  // Serve generated media.
  app.use(
    '/storage',
    express.static(storageRoot, {
      maxAge: '1d',
      setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
    })
  );

  app.use('/api', apiRoutes);

  // In production, serve the built client and let the SPA handle routing.
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: '1h', index: false }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/storage')) return next();
      res.sendFile(join(clientDist, 'index.html'));
    });
  }

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
