import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Film } from 'lucide-react';
import type { Video } from '@/lib/types';
import { StatusBadge } from '@/components/ui/Badge';
import { VideoThumb } from './VideoThumb';
import { formatDuration, formatRelative } from '@/lib/utils';

export function VideoCard({ video, index = 0 }: { video: Video; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Link
        to={`/app/videos/${video.id}`}
        className="card group block overflow-hidden p-3 transition-all hover:border-white/20 hover:shadow-glow"
      >
        <div className="relative">
          <VideoThumb video={video} />
          <div className="absolute left-2 top-2">
            <StatusBadge status={video.status} />
          </div>
          {video.durationSec > 0 && (
            <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-ink-950/80 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
              <Clock className="h-3 w-3" /> {formatDuration(video.durationSec)}
            </span>
          )}
        </div>
        <div className="p-2">
          <h3 className="line-clamp-1 font-medium text-white transition-colors group-hover:text-brand-300">
            {video.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">{formatRelative(video.createdAt)}</p>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Film className="h-3.5 w-3.5" /> {video.width}×{video.height}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {video.fps} fps
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
