import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { env } from '../../config/env.js';
import { LocalStorageDriver } from './local.js';
import type { StorageDriver } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Storage root resolves relative to the server package root regardless of cwd.
const serverRoot = resolve(__dirname, '../../..');
const storageRoot = resolve(serverRoot, env.storageLocalDir);

function createStorage(): StorageDriver {
  switch (env.storageDriver) {
    case 'local':
    default:
      return new LocalStorageDriver(storageRoot);
    // Future: case 's3': return new S3StorageDriver(...);
  }
}

export const storage = createStorage();
export { storageRoot };
export type { StorageDriver } from './types.js';
