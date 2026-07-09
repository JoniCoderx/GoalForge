import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { LayoutTemplate, Layers, ArrowRight, AlertTriangle } from 'lucide-react';
import { api, describeApiError } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

export default function Templates() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['templates'], queryFn: api.templates.list });
  const templates = data?.templates ?? [];

  return (
    <div>
      <PageHeader
        icon={<LayoutTemplate className="h-5 w-5" />}
        title="Templates"
        subtitle="One-click content types — each forges a complete, platform-ready football short in seconds."
      />

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-4">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={<AlertTriangle className="h-7 w-7" />}
          title="Couldn't load templates"
          description={describeApiError(error)}
        />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate className="h-7 w-7" />}
          title="No templates yet"
          description="Content templates will appear here once they're available on your workspace."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t, i) => (
            <motion.div
              key={t.key}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              className="group card relative flex flex-col overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]"
            >
              {/* Ambient glow on hover */}
              <div
                className={cn(
                  'pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-25',
                  t.gradient
                )}
              />

              <div className="relative flex items-start justify-between gap-3">
                <div
                  className={cn(
                    'grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-3xl shadow-lg transition-transform duration-300 group-hover:scale-105',
                    t.gradient
                  )}
                >
                  {t.icon}
                </div>
                <span className="chip border border-white/10 bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
                  {t.category}
                </span>
              </div>

              <h3 className="relative mt-4 font-display text-lg font-semibold text-white">{t.name}</h3>
              <p className="relative mt-1.5 line-clamp-3 flex-1 text-sm text-slate-400">{t.description}</p>

              <div className="relative mt-4 flex items-center gap-1.5 text-xs text-slate-500">
                <Layers className="h-3.5 w-3.5" />
                {t.sceneCount} scenes
              </div>

              <Button
                className="relative mt-5 w-full justify-center"
                onClick={() => navigate(`/app/create?template=${encodeURIComponent(t.key)}`)}
              >
                Use template <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
