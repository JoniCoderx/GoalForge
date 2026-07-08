import { Play } from 'lucide-react';
import type { Video } from '@/lib/types';

/** Vertical 9:16 thumbnail with graceful gradient fallback. */
export function VideoThumb({ video, className = '' }: { video: Video; className?: string }) {
  return (
    <div
      className={`relative aspect-[9/16] w-full overflow-hidden rounded-xl border border-white/10 bg-ink-800 ${className}`}
    >
      {video.thumbnailPath ? (
        <img
          src={video.thumbnailPath}
          alt={video.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-mesh p-4 text-center">
          <span className="font-display text-2xl font-bold uppercase leading-tight text-white/90">
            {video.thumbnailText || video.title.slice(0, 20)}
          </span>
        </div>
      )}
      {video.status === 'READY' && video.videoPath && (
        <div className="absolute inset-0 grid place-items-center bg-ink-950/20 opacity-0 transition-opacity hover:opacity-100">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-ink-950">
            <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
          </span>
        </div>
      )}
    </div>
  );
}
