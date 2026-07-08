import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load server/.env (works from both src and dist).
dotenv.config({ path: resolve(__dirname, '../../.env') });
dotenv.config(); // fallback to cwd

function str(key: string, fallback: string): string {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
}

function int(key: string, fallback: number): number {
  const v = process.env[key];
  const n = v ? Number.parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  nodeEnv: str('NODE_ENV', 'development'),
  isProd: str('NODE_ENV', 'development') === 'production',
  port: int('PORT', 4000),
  clientUrl: str('CLIENT_URL', 'http://localhost:5173'),

  jwtSecret: str('JWT_SECRET', 'goalforge-dev-secret-change-me'),
  jwtExpiresIn: str('JWT_EXPIRES_IN', '7d'),

  databaseUrl: str('DATABASE_URL', 'file:./dev.db'),

  openaiApiKey: str('OPENAI_API_KEY', ''),
  openaiModel: str('OPENAI_MODEL', 'gpt-4o-mini'),

  storageDriver: str('STORAGE_DRIVER', 'local'),
  storageLocalDir: str('STORAGE_LOCAL_DIR', 'storage'),

  video: {
    width: int('VIDEO_WIDTH', 1080),
    height: int('VIDEO_HEIGHT', 1920),
    fps: int('VIDEO_FPS', 60),
  },

  admin: {
    email: str('ADMIN_EMAIL', 'admin@goalforge.ai'),
    password: str('ADMIN_PASSWORD', 'goalforge123'),
  },
};

export const hasOpenAI = env.openaiApiKey.trim().length > 0;
