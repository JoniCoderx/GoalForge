// Rewrites the Prisma datasource provider based on the environment so the
// same schema serves SQLite locally and PostgreSQL in production.
// Usage: node scripts/set-db-provider.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, '../prisma/schema.prisma');

const url = process.env.DATABASE_URL || '';
const explicit = (process.env.DATABASE_PROVIDER || '').toLowerCase();

let provider = 'sqlite';
if (explicit === 'postgresql' || explicit === 'postgres') {
  provider = 'postgresql';
} else if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
  provider = 'postgresql';
} else if (url.startsWith('file:') || explicit === 'sqlite') {
  provider = 'sqlite';
}

const schema = readFileSync(schemaPath, 'utf8');
const updated = schema.replace(
  /datasource db \{\s*provider = "\w+"/,
  `datasource db {\n  provider = "${provider}"`
);

if (schema !== updated) {
  writeFileSync(schemaPath, updated);
  console.log(`[prisma] datasource provider set to "${provider}"`);
} else {
  console.log(`[prisma] datasource provider already "${provider}"`);
}
