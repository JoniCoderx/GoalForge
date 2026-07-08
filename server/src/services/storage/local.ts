import { promises as fs } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import type { StorageDriver } from './types.js';

/**
 * Local filesystem storage. Files live under <root> and are served at
 * /storage/<key> by the Express static handler.
 */
export class LocalStorageDriver implements StorageDriver {
  readonly name = 'local';
  private root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  resolvePath(key: string): string {
    return join(this.root, key);
  }

  publicUrl(key: string): string {
    return `/storage/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  async ensureDir(prefix: string): Promise<string> {
    const dir = join(this.root, prefix);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  async save(key: string, data: Buffer): Promise<string> {
    const path = this.resolvePath(key);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, data);
    return this.publicUrl(key);
  }

  async remove(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolvePath(key));
    } catch {
      /* ignore missing files */
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(key));
      return true;
    } catch {
      return false;
    }
  }
}
