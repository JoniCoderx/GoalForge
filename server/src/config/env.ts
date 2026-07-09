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

function list(key: string): string[] {
  const v = process.env[key];
  return v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

const DEFAULT_JWT_SECRET = 'goalforge-dev-secret-change-me';

export const env = {
  nodeEnv: str('NODE_ENV', 'development'),
  isProd: str('NODE_ENV', 'development') === 'production',
  port: int('PORT', 4000),
  clientUrl: str('CLIENT_URL', 'http://localhost:5173'),

  jwtSecret: str('JWT_SECRET', DEFAULT_JWT_SECRET),
  jwtExpiresIn: str('JWT_EXPIRES_IN', '7d'),

  // Password gate for the private owner console at /users.
  superadminPassword: str('SUPERADMIN_PASSWORD', 'ONLYME123'),

  // Password gate for the internal expense tracker at /expenses.
  expensesPassword: str('EXPENSES_PASSWORD', '123456'),

  databaseUrl: str('DATABASE_URL', 'file:./dev.db'),

  openaiApiKey: str('OPENAI_API_KEY', ''),
  openaiModel: str('OPENAI_MODEL', 'gpt-4o-mini'),

  storageDriver: str('STORAGE_DRIVER', 'local'),
  storageLocalDir: str('STORAGE_LOCAL_DIR', 'storage'),

  video: {
    width: int('VIDEO_WIDTH', 1080),
    height: int('VIDEO_HEIGHT', 1920),
    fps: int('VIDEO_FPS', 60),
    // x264 encode profile. `superfast` keeps renders fast enough for small
    // (0.5 CPU) production instances; RENDER_CRF balances the quality cost.
    preset: str('RENDER_PRESET', 'superfast'),
    crf: int('RENDER_CRF', 22),
    // Hard watchdog: a render that exceeds this is killed and marked FAILED
    // so a hung ffmpeg can never block the queue forever.
    timeoutMs: int('RENDER_TIMEOUT_MS', 10 * 60 * 1000),
  },

  // Explicit CORS allowlist for production. Defaults to CLIENT_URL; add extra
  // origins (e.g. your custom domain) via CORS_ORIGINS="https://a.com,https://b.com".
  allowedOrigins: Array.from(new Set([str('CLIENT_URL', 'http://localhost:5173'), ...list('CORS_ORIGINS')])),
};

export const hasOpenAI = env.openaiApiKey.trim().length > 0;

/**
 * Fail fast on insecure production configuration. Called at startup so the
 * server never boots in prod with a guessable JWT secret.
 */
export function assertProductionSafety(): void {
  if (!env.isProd) return;
  const errors: string[] = [];
  if (!process.env.JWT_SECRET || env.jwtSecret === DEFAULT_JWT_SECRET) {
    errors.push('JWT_SECRET must be set to a strong, unique value in production.');
  }
  if (env.jwtSecret.length < 16) {
    errors.push('JWT_SECRET is too short — use at least 16 characters (32+ recommended).');
  }
  if (errors.length) {
    throw new Error(`Insecure production configuration:\n- ${errors.join('\n- ')}`);
  }
}
