import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { History, AlertTriangle, FolderClock } from 'lucide-react';
import { api } from '@/lib/api';
import type { ExportJob, VideoStatus } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { VideoThumb } from '@/components/dashboard/VideoThumb';
import { cn, formatRelative, formatDuration } from '@/lib/utils';

const FILTERS: { key: 'ALL' | VideoStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'READY', label: 'Ready' },
  { key: 'RENDERING', label: 'Rendering' },
  { key: 'QUEUED', label: 'Queued' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'DRAFT', label: 'Draft' },
];

function jobDuration(job: ExportJob): string {
  if (!job.startedAt || !job.finishedAt) return '—';
  const ms = new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  return formatDuration(ms / 1000);
}

export default function Exports() {
  const [filter, setFilter] = useState<'ALL' | VideoStatus>('ALL');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['exports', 'history'],
    queryFn: api.exports.history,
  });

  const jobs = useMemo(() => data?.jobs ?? [], [data]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const j of jobs) c[j.status] = (c[j.status] ?? 0) + 1;
    return c;
  }, [jobs]);

  const filtered = filter === 'ALL' ? jobs : jobs.filter((j) => j.status === filter);

  return (
    <div>
      <PageHeader
        icon={<History className="h-5 w-5" />}
        title="Export History"
        subtitle="Every render you've forged, most recent first."
      />

      {!isLoading && !isError && jobs.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const n = f.key === 'ALL' ? jobs.length : counts[f.key] ?? 0;
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'chip border transition',
                  active
                    ? 'border-brand-500/50 bg-brand-500/15 text-brand-200'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
                )}
              >
                {f.label}
                <span className="ml-1 text-[10px] tabular-nums opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-7 w-7" />}
          title="Couldn't load history"
          description="We hit a snag fetching your export history. Please try again in a moment."
        />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<FolderClock className="h-7 w-7" />}
          title="No exports yet"
          description="Render your first short and it will appear here with its status and timing."
          action={
            <Link to="/app/create" className="btn-primary text-sm">
              Create content
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderClock className="h-7 w-7" />}
          title="Nothing here"
          description="No exports match this filter. Try a different status."
        />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false} mode="popLayout">
            {filtered.map((job) => (
              <ExportRow key={job.id} job={job} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ExportRow({ job }: { job: ExportJob }) {
  const video = job.video;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="card p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Video */}
        <Link
          to={`/app/videos/${job.videoId}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div className="w-12 shrink-0">
            {video ? (
              <VideoThumb video={video} />
            ) : (
              <div className="aspect-[9/16] w-full rounded-xl border border-white/10 bg-ink-800" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-medium text-white">
              {video?.title ?? 'Untitled export'}
            </h3>
            <p className="truncate text-xs text-slate-500">{job.stage || '—'}</p>
          </div>
        </Link>

        {/* Meta columns */}
        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          <div className="w-24">
            <StatusBadge status={job.status} />
          </div>
          <div className="hidden w-16 text-right text-xs text-slate-400 sm:block">
            <span className="block text-[10px] uppercase tracking-wide text-slate-600">
              Duration
            </span>
            <span className="font-mono tabular-nums">{jobDuration(job)}</span>
          </div>
          <div className="w-20 text-right text-xs text-slate-400">
            <span className="block text-[10px] uppercase tracking-wide text-slate-600">
              Created
            </span>
            {formatRelative(job.createdAt)}
          </div>
        </div>
      </div>

      {job.status === 'FAILED' && job.error && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 break-words">{job.error}</span>
        </p>
      )}
    </motion.div>
  );
}
