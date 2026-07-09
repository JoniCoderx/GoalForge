import { promises as fs } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { storage } from './storage/index.js';
import { runFfmpeg, toFfColor } from './ffmpeg.js';
import type { Scene } from '../types/content.js';

function hexToRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  const c = (hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(c)) return fallback;
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

/**
 * Build a premium animated radial-glow gradient as a low-res geq source
 * scaled up smoothly. Works on older ffmpeg builds (no `gradients` filter).
 */
function gradientSource(
  width: number,
  height: number,
  base: [number, number, number],
  glow: [number, number, number],
  total: number,
  fps: number,
  outLabel: string
): string {
  // Animated glow centre drifts gently; tight, dimmed falloff keeps the
  // background dark and cinematic so captions stay legible.
  const cx = `(0.5*W+0.14*W*sin(T*0.5))`;
  const cy = `(0.34*H+0.10*H*cos(T*0.42))`;
  const f = `pow(1-clip(hypot(X-${cx}\\,Y-${cy})/(0.62*H)\\,0\\,1)\\,1.6)*0.72`;
  const chan = (b: number, g: number) => `${b}+(${g}-${b})*(${f})`;
  // geq evaluates an interpreted expression per pixel per channel, which
  // dominates render CPU at 60 fps. The glow drifts so slowly that computing
  // it at 10 fps and duplicating frames up to the output rate is visually
  // identical — and ~6x cheaper, which matters on small production instances.
  const srcFps = Math.min(fps, 10);
  // Only duplicate frames when actually upsampling — on this ffmpeg build,
  // `fps=` swallows a single-frame stream (thumbnails) and exits 0 with an
  // empty output.
  const dup = fps > srcFps ? `,fps=${fps}` : '';
  return (
    `color=c=black:s=72x128:r=${srcFps}:d=${total},format=rgb24,geq=` +
    `r='${chan(base[0], glow[0])}':g='${chan(base[1], glow[1])}':b='${chan(base[2], glow[2])}',` +
    `scale=${width}:${height}:flags=bilinear,format=yuv420p${dup}[${outLabel}]`
  );
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = resolve(__dirname, '../../assets/fonts');

const FONTS: Record<string, string> = {
  BigShoulders: join(FONT_DIR, 'BigShoulders-Bold.ttf'),
  BigShouldersRegular: join(FONT_DIR, 'BigShoulders-Regular.ttf'),
  Arsenal: join(FONT_DIR, 'ArsenalSC-Regular.ttf'),
  Bold: join(FONT_DIR, 'BigShoulders-Bold.ttf'),
};

function fontFor(family: string): string {
  return FONTS[family] || FONTS.BigShoulders;
}

export interface RenderInput {
  videoId: string;
  scenes: Scene[];
  thumbnailText: string;
  title: string;
  brand: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    fontFamily: string;
    watermarkText: string;
    watermarkEnabled: boolean;
  };
  width?: number;
  height?: number;
  fps?: number;
}

export interface RenderResult {
  videoKey: string;
  videoUrl: string;
  thumbnailKey: string;
  thumbnailUrl: string;
  durationSec: number;
}

/** Wrap text to a max character width, returning newline-joined lines. */
function wrap(text: string, maxChars: number): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines.join('\n');
}

async function writeTextFile(dir: string, name: string, content: string): Promise<string> {
  const path = join(dir, name);
  await fs.writeFile(path, content, 'utf8');
  return path;
}

/** Fade alpha expression: 0.25s in, 0.25s out, inside [start,end]. */
function fadeAlpha(start: number, end: number): string {
  const fi = start + 0.25;
  const fo = end - 0.25;
  return `if(lt(t,${fi.toFixed(2)}),(t-${start.toFixed(2)})/0.25,if(gt(t,${fo.toFixed(2)}),(${end.toFixed(2)}-t)/0.25,1))`;
}

/** A gentle vertical drift so captions "pop" upward as they appear. */
function driftY(base: number, start: number): string {
  return `${base}-40*max(0\\,1-(t-${start.toFixed(2)})/0.35)`;
}

/**
 * Render a vertical short from generated scenes using a single ffmpeg
 * filtergraph: animated gradient background, brand accent bar, per-scene
 * animated captions with fades, a live progress bar, and a watermark.
 */
export async function renderVideo(
  input: RenderInput,
  onProgress?: (percent: number, stage: string) => void
): Promise<RenderResult> {
  const width = input.width ?? env.video.width;
  const height = input.height ?? env.video.height;
  const fps = input.fps ?? env.video.fps;
  const font = fontFor(input.brand.fontFamily);
  const regular = FONTS.BigShouldersRegular;

  const accent = toFfColor(input.brand.accentColor, '0x22c55e');
  const baseRgb = hexToRgb(input.brand.backgroundColor, [5, 9, 20]);
  const glowRgb = hexToRgb(input.brand.primaryColor, [34, 197, 94]);

  const scenes = input.scenes.length ? input.scenes : [{ index: 0, heading: 'GoalForge', narration: 'GoalForge AI', caption: 'GoalForge', durationSec: 3 } as Scene];

  // Compute scene timing.
  let cursor = 0;
  const timed = scenes.map((s) => {
    const start = cursor;
    const dur = Math.max(2.2, Math.min(6.5, s.durationSec || 3));
    cursor += dur;
    return { ...s, start, end: cursor };
  });
  const total = Math.max(4, +cursor.toFixed(2));

  // Working dir for temp textfiles.
  await storage.ensureDir('tmp');
  const workDir = join(storage.resolvePath('tmp'), input.videoId);
  await fs.mkdir(workDir, { recursive: true });

  onProgress?.(4, 'preparing');

  // Build filtergraph.
  const parts: string[] = [];
  parts.push(gradientSource(width, height, baseRgb, glowRgb, total, fps, 'bg0'));
  // Brand accent bars top and bottom.
  parts.push(`[bg0]drawbox=x=0:y=0:w=${width}:h=18:color=${accent}@0.95:t=fill[bg2]`);
  parts.push(`[bg2]drawbox=x=0:y=${height - 44}:w=${width}:h=18:color=${accent}@0.55:t=fill[bg3]`);

  let label = 'bg3';
  let idx = 0;

  for (const s of timed) {
    const headingFile = await writeTextFile(workDir, `h${s.index}.txt`, wrap(s.heading.toUpperCase(), 16));
    const captionFile = await writeTextFile(workDir, `c${s.index}.txt`, wrap(s.caption, 15));
    const alpha = fadeAlpha(s.start, s.end);
    const enable = `between(t,${s.start.toFixed(2)},${s.end.toFixed(2)})`;

    // Heading — top third, bold, accent.
    const outH = `s${idx++}`;
    parts.push(
      `[${label}]drawtext=fontfile='${font}':textfile='${headingFile}':fontsize=110:fontcolor=white:borderw=6:bordercolor=black@0.55:line_spacing=6:x=(w-text_w)/2:y=${driftY(340, s.start)}:enable='${enable}':alpha='${alpha}'[${outH}]`
    );
    label = outH;

    // Caption — centre, boxed accent.
    const outC = `s${idx++}`;
    parts.push(
      `[${label}]drawtext=fontfile='${font}':textfile='${captionFile}':fontsize=132:fontcolor=white:box=1:boxcolor=${accent}@0.88:boxborderw=40:line_spacing=10:x=(w-text_w)/2:y=(h-text_h)/2:enable='${enable}':alpha='${alpha}'[${outC}]`
    );
    label = outC;

    // Optional stat chip.
    if (s.stat) {
      const statFile = await writeTextFile(workDir, `st${s.index}.txt`, s.stat.toUpperCase());
      const outS = `s${idx++}`;
      parts.push(
        `[${label}]drawtext=fontfile='${regular}':textfile='${statFile}':fontsize=64:fontcolor=black:box=1:boxcolor=white@0.92:boxborderw=22:x=(w-text_w)/2:y=(h/2)+220:enable='${enable}':alpha='${alpha}'[${outS}]`
      );
      label = outS;
    }
  }

  // Live progress bar.
  const outBar = `sbar`;
  parts.push(
    `[${label}]drawbox=x=0:y=${height - 26}:w='iw*min(t/${total},1)':h=10:color=${accent}:t=fill[${outBar}]`
  );
  label = outBar;

  // Watermark.
  if (input.brand.watermarkEnabled && input.brand.watermarkText) {
    const wmFile = await writeTextFile(workDir, 'wm.txt', input.brand.watermarkText);
    parts.push(
      `[${label}]drawtext=fontfile='${regular}':textfile='${wmFile}':fontsize=48:fontcolor=white@0.9:shadowcolor=black@0.7:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h-150[vout]`
    );
  } else {
    parts.push(`[${label}]null[vout]`);
  }

  const filtergraph = parts.join(';');

  await storage.ensureDir(`videos/${input.videoId}`);
  const videoKey = `videos/${input.videoId}/reel.mp4`;
  const thumbKey = `videos/${input.videoId}/thumb.jpg`;
  const videoPath = storage.resolvePath(videoKey);
  const thumbPath = storage.resolvePath(thumbKey);
  await fs.mkdir(dirname(videoPath), { recursive: true });

  onProgress?.(10, 'rendering');

  await runFfmpeg(
    [
      '-y',
      '-filter_complex', filtergraph,
      '-map', '[vout]',
      '-t', String(total),
      '-r', String(fps),
      '-c:v', 'libx264',
      '-preset', env.video.preset,
      '-crf', String(env.video.crf),
      '-profile:v', 'high',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      videoPath,
    ],
    {
      timeoutMs: env.video.timeoutMs,
      onProgress: (sec) => {
        const pct = Math.min(92, 10 + Math.round((sec / total) * 80));
        onProgress?.(pct, 'rendering');
      },
    }
  );

  onProgress?.(94, 'thumbnail');

  // Thumbnail — dedicated static frame with big thumbnail text.
  const thumbTextFile = await writeTextFile(workDir, 'thumb.txt', wrap(input.thumbnailText || input.title, 12));
  const thumbGraph = [
    gradientSource(width, height, baseRgb, glowRgb, 1, 1, 'b0'),
    `[b0]drawbox=x=0:y=0:w=${width}:h=22:color=${accent}:t=fill[b2]`,
    `[b2]drawtext=fontfile='${font}':textfile='${thumbTextFile}':fontsize=180:fontcolor=white:borderw=10:bordercolor=black@0.6:line_spacing=8:x=(w-text_w)/2:y=(h-text_h)/2[tout]`,
  ].join(';');

  await runFfmpeg(
    [
      '-y',
      '-filter_complex', thumbGraph,
      '-map', '[tout]',
      '-frames:v', '1',
      '-q:v', '3',
      thumbPath,
    ],
    { timeoutMs: 60_000 }
  );

  onProgress?.(99, 'finalizing');

  // ffmpeg can exit 0 without writing a file (e.g. a filter emitting zero
  // frames) — never report READY unless both artifacts actually exist.
  for (const [path, what] of [
    [videoPath, 'video'],
    [thumbPath, 'thumbnail'],
  ] as const) {
    const stat = await fs.stat(path).catch(() => null);
    if (!stat || stat.size === 0) {
      throw new Error(`Render produced no ${what} file. Please try exporting again.`);
    }
  }

  // Clean temp textfiles.
  await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);

  return {
    videoKey,
    videoUrl: storage.publicUrl(videoKey),
    thumbnailKey: thumbKey,
    thumbnailUrl: storage.publicUrl(thumbKey),
    durationSec: total,
  };
}
