import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Activity as ActivityIcon,
  UserPlus,
  LogIn,
  Sparkles,
  Rocket,
  Film,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { consoleApi } from '@/lib/api';
import type { ActivityItem } from '@/lib/types';
import { cn, formatRelative } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from './shared';
import { parseMeta } from './console-utils';

const TYPE_FILTERS = ['all', 'signup', 'login', 'generate', 'export', 'render', 'error'] as const;

const TYPE_META: Record<string, { icon: LucideIcon; color: string }> = {
  signup: { icon: UserPlus, color: 'text-brand-300 bg-brand-500/10' },
  login: { icon: LogIn, color: 'text-sky-300 bg-sky-500/10' },
  generate: { icon: Sparkles, color: 'text-violet-300 bg-violet-500/10' },
  export: { icon: Rocket, color: 'text-amber-300 bg-amber-500/10' },
  render: { icon: Film, color: 'text-brand-300 bg-brand-500/10' },
  error: { icon: AlertTriangle, color: 'text-rose-300 bg-rose-500/10' },
};

export function ActivityTab() {
  const [type, setType] = useState<string>('all');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['console-activity', type],
    queryFn: () => consoleApi.activity(type === 'all' ? undefined : type),
  });

  const items = data?.activity ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setType(f)}
            className={cn(
              'chip border capitalize transition',
              type === f
                ? 'border-brand-400/40 bg-brand-500/15 text-brand-200'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState label="Could not load activity." onRetry={() => refetch()} />
      ) : !items.length ? (
        <EmptyState
          icon={<ActivityIcon className="h-7 w-7" />}
          title="No activity"
          description={type === 'all' ? 'Activity events will appear here.' : `No ${type} events recorded.`}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <ActivityRow key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  const meta = TYPE_META[item.type] ?? { icon: ActivityIcon, color: 'text-slate-300 bg-white/5' };
  const Icon = meta.icon;
  const parsedMeta = parseMeta(item.meta);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      className="card p-4"
    >
      <div className="flex items-start gap-3">
        <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', meta.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-white">{item.message}</p>
            <span className="shrink-0 text-xs text-slate-500">{formatRelative(item.createdAt)}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            <span className="capitalize">{item.type}</span>
            {item.user?.email && (
              <>
                <span>·</span>
                <span className="truncate">{item.user.email}</span>
              </>
            )}
          </div>
          {parsedMeta && (
            <pre className="mt-2 overflow-x-auto rounded-lg border border-white/5 bg-black/30 p-2.5 text-[11px] leading-relaxed text-slate-400">
              {JSON.stringify(parsedMeta, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </motion.div>
  );
}
