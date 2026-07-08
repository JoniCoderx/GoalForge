/** Storage abstraction so we can swap local disk for S3/GCS later. */
export interface StorageDriver {
  readonly name: string;
  /** Absolute filesystem path for a stored key (used by the render pipeline). */
  resolvePath(key: string): string;
  /** Ensure a namespace/folder exists. */
  ensureDir(prefix: string): Promise<string>;
  /** Persist a buffer and return the public URL path. */
  save(key: string, data: Buffer): Promise<string>;
  /** Delete a stored object (best-effort). */
  remove(key: string): Promise<void>;
  /** Public URL path for a stored key (served by the app). */
  publicUrl(key: string): string;
  exists(key: string): Promise<boolean>;
}
