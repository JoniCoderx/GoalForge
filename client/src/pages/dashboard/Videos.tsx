import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Film, Plus, Search, X } from 'lucide-react';
import { api, describeApiError } from '@/lib/api';
import type { VideoStatus } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { VideoCard } from '@/components/dashboard/VideoCard';
import { cn, STATUS_META } from '@/lib/utils';

const STATUS_FILTERS: Array<VideoStatus | 'ALL'> = [
  'ALL',
  'DRAFT',
  'QUEUED',
  'RENDERING',
  'READY',
  'FAILED',
];

export default function Videos() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['videos'],
    queryFn: () => api.videos.list(),
  });

  const [status, setStatus] = useState<VideoStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const videos = useMemo(() => data?.videos ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return videos.filter((v) => {
      if (status !== 'ALL' && v.status !== status) return false;
      if (!q) return true;
      return v.title.toLowerCase().includes(q) || v.topic.toLowerCase().includes(q);
    });
  }, [videos, status, search]);

  return (
    <div>
      <PageHeader
        icon={<Film className="h-5 w-5" />}
        title="Videos"
        subtitle="Your full library of forged football shorts."
        actions={
          <Link to="/app/create">
            <Button>
              <Plus className="h-4 w-4" /> Create
            </Button>
          </Link>
        }
      />

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => {
            const label = s === 'ALL' ? 'All' : STATUS_META[s]?.label ?? s;
            const active = status === s;
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  'chip border transition-all',
                  active
                    ? 'border-brand-500/50 bg-brand-500/15 text-brand-200'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                )}
              >
                {s !== 'ALL' && (
                  <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_META[s]?.dot)} />
                )}
                {label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or topic…"
            className="input py-2.5 pl-9 pr-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<Film className="h-7 w-7" />}
          title="Couldn't load videos"
          description={describeApiError(error)}
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Film className="h-7 w-7" />}
          title={videos.length === 0 ? 'No videos yet' : 'No matches'}
          description={
            videos.length === 0
              ? 'Forge your first football short and it will show up right here.'
              : 'Try a different status filter or search term.'
          }
          action={
            videos.length === 0 ? (
              <Link to="/app/create">
                <Button>
                  <Plus className="h-4 w-4" /> Create your first video
                </Button>
              </Link>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setStatus('ALL');
                  setSearch('');
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            layout
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filtered.map((v, i) => (
              <VideoCard key={v.id} video={v} index={i} />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
