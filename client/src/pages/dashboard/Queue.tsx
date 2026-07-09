import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Loader2, ListVideo, Cpu, CheckCircle2, Rocket } from 'lucide-react';
import { api, describeApiError } from '@/lib/api';
import type { ExportJob } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { VideoThumb } from '@/components/dashboard/VideoThumb';

const ACTIVE = new Set(['QUEUED', 'RENDERING']);

export default function Queue() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['queue'],
    queryFn: api.exports.queue,
    // Poll only while there is something rendering; go idle when the queue is
    // empty so we don't hammer the API (and trip rate limits) doing nothing.
    refetchInterval: (query) => {
      const jobs = query.state.data?.jobs ?? [];
      return jobs.length > 0 ? 2500 : false;
    },
    refetchIntervalInBackground: false,
  });

  const jobs = data?.jobs ?? [];
  const depth = data?.depth ?? 0;
  const active = jobs.filter((j) => ACTIVE.has(j.status));

  // When the queue drains to empty, refresh dependent views (videos become
  // READY) and report the real outcome — a drained queue can also mean a job
  // failed, and celebrating a failure would hide it from the user.
  const prevDepth = useRef<number | null>(null);
  useEffect(() => {
    if (data === undefined) return;
    if (prevDepth.current !== null && prevDepth.current > 0 && depth === 0) {
      qc.invalidateQueries({ queryKey: ['videos'] });
      api.exports
        .history()
        .then(({ jobs: recent }) => {
          const cutoff = Date.now() - 5 * 60 * 1000;
          const failed = recent.filter(
            (j) => j.status === 'FAILED' && j.finishedAt && new Date(j.finishedAt).getTime() > cutoff
          );
          if (failed.length > 0) {
            toast.error(
              failed.length === 1
                ? 'An export failed — open the video for details.'
                : `${failed.length} exports failed — open the videos for details.`
            );
          } else {
            toast.success('Queue finished — all exports rendered 🎉');
          }
        })
        .catch(() => toast.success('Queue finished'));
    }
    prevDepth.current = depth;
  }, [depth, data, qc]);

  const subtitle =
    active.length === 0
      ? 'Nothing rendering right now.'
      : `${active.length} export${active.length === 1 ? '' : 's'} processing…`;

  return (
    <div>
      <PageHeader
        icon={<ListVideo className="h-5 w-5" />}
        title="Export Queue"
        subtitle={subtitle}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<ListVideo className="h-7 w-7" />}
          title="Couldn't load the queue"
          description={describeApiError(error)}
        />
      ) : active.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-7 w-7" />}
          title="Queue is clear"
          description="No exports are rendering. Forge a new short and send it to the queue to watch it render live."
          action={
            <Link to="/app/create">
              <Button>
                <Rocket className="h-4 w-4" /> Create content
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {active.map((job) => (
              <QueueRow key={job.id} job={job} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
        <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
        <p>
          Exports render <span className="text-slate-200">one at a time</span> — FFmpeg is
          CPU-bound, so we process the queue sequentially to keep every render fast and sharp.
        </p>
      </div>
    </div>
  );
}

function QueueRow({ job }: { job: ExportJob }) {
  const video = job.video;
  const pct = Math.max(0, Math.min(100, Math.round(job.progress)));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="card flex items-center gap-4 p-4"
    >
      <div className="w-16 shrink-0">
        {video ? (
          <Link to={`/app/videos/${job.videoId}`} className="block">
            <VideoThumb video={video} />
          </Link>
        ) : (
          <div className="aspect-[9/16] w-full rounded-xl border border-white/10 bg-ink-800" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-display font-semibold text-white">
            {video?.title ?? 'Untitled export'}
          </h3>
          <StatusBadge status={job.status} />
        </div>

        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
          <Loader2 className="h-3 w-3 animate-spin text-brand-400" />
          {job.stage || 'Preparing…'}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <Progress value={pct} className="flex-1" />
          <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-slate-300">
            {pct}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}
