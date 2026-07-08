import { spawn } from 'node:child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

export const ffmpegPath: string = ffmpegInstaller?.path || 'ffmpeg';

export interface RunOptions {
  onProgress?: (seconds: number) => void;
}

/** Parse ffmpeg's `time=HH:MM:SS.ms` progress markers from stderr. */
function parseTime(chunk: string): number | null {
  const m = chunk.match(/time=(\d+):(\d+):(\d+\.\d+)/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export function runFfmpeg(args: string[], options: RunOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      if (stderr.length > 20000) stderr = stderr.slice(-20000);
      if (options.onProgress) {
        const t = parseTime(text);
        if (t !== null) options.onProgress(t);
      }
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}\n${stderr.slice(-1500)}`));
    });
  });
}

/** Convert #rrggbb to ffmpeg 0xrrggbb, tolerating missing/invalid input. */
export function toFfColor(hex: string, fallback = '0x22c55e'): string {
  const clean = (hex || '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `0x${clean}`;
  return fallback;
}
