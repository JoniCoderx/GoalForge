import { lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Film,
  Clock3,
  LayoutTemplate,
  Rocket,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api, describeApiError } from '@/lib/api';
import type { Template } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

// Defer the recharts bundle so metric cards paint before the chart chunk loads.
const AnalyticsCharts = lazy(() => import('@/components/dashboard/AnalyticsCharts'));

const PALETTE = ['#22c55e', '#0ea5e9', '#a855f7', '#f59e0b', '#f43f5e'];

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function Analytics() {
  const navigate = useNavigate();

  const {
    data: overview,
    isLoading: loadingOverview,
    isError: overviewError,
    error: overviewErr,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: api.analytics.overview,
  });
  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: api.templates.list,
  });

  const templateMap = useMemo(() => {
    const map: Record<string, Template> = {};
    for (const t of templatesData?.templates ?? []) map[t.key] = t;
    return map;
  }, [templatesData]);

  const totals = overview?.totals;

  const timeline = useMemo(
    () =>
      (overview?.timeline ?? []).slice(-14).map((d) => ({
        date: dayLabel(d.date),
        Rendered: d.rendered,
        Created: d.count,
      })),
    [overview]
  );

  const templateData = useMemo(() => {
    const entries = Object.entries(overview?.byTemplate ?? {});
    return entries
      .map(([key, count], i) => {
        const t = templateMap[key];
        return {
          key,
          name: t?.name ?? key,
          icon: t?.icon ?? '⚽',
          count,
          color: PALETTE[i % PALETTE.length],
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [overview, templateMap]);

  const isEmpty = !loadingOverview && !overviewError && (totals?.videos ?? 0) === 0;

  if (loadingOverview) {
    return (
      <div>
        <PageHeader icon={<BarChart3 className="h-5 w-5" />} title="Analytics" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-[300px] w-full rounded-2xl" />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[280px] w-full rounded-2xl" />
          <Skeleton className="h-[280px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (overviewError) {
    return (
      <div>
        <PageHeader
          icon={<BarChart3 className="h-5 w-5" />}
          title="Analytics"
          subtitle="Your content production at a glance."
        />
        <EmptyState
          icon={<AlertTriangle className="h-7 w-7" />}
          title="Couldn't load analytics"
          description={describeApiError(overviewErr)}
          action={<Button onClick={() => refetchOverview()}>Retry</Button>}
        />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div>
        <PageHeader
          icon={<BarChart3 className="h-5 w-5" />}
          title="Analytics"
          subtitle="Your content production at a glance."
        />
        <EmptyState
          icon={<BarChart3 className="h-7 w-7" />}
          title="No analytics yet"
          description="Once you create and export videos, your performance metrics will appear here."
          action={<Button onClick={() => navigate('/app/create')}>Create your first video</Button>}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={<BarChart3 className="h-5 w-5" />}
        title="Analytics"
        subtitle="Your content production at a glance — videos, renders and content mix."
      />

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total videos" value={totals?.videos ?? 0} icon={<Film className="h-5 w-5" />} accent="sky" delay={0} />
        <StatCard label="Ready to post" value={totals?.ready ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} accent="brand" delay={0.05} />
        <StatCard label="Exports queued" value={totals?.exports ?? 0} icon={<Rocket className="h-5 w-5" />} accent="violet" delay={0.1} />
        <StatCard
          label="Renders completed"
          value={totals?.rendersCompleted ?? 0}
          icon={<Rocket className="h-5 w-5" />}
          accent="brand"
          delay={0.15}
        />
        <StatCard
          label="Minutes of content"
          value={totals?.minutesRendered ?? 0}
          icon={<Clock3 className="h-5 w-5" />}
          accent="amber"
          delay={0.2}
        />
        <StatCard
          label="Templates used"
          value={Object.keys(overview?.byTemplate ?? {}).length}
          icon={<LayoutTemplate className="h-5 w-5" />}
          accent="rose"
          delay={0.25}
        />
      </div>

      <Suspense
        fallback={
          <>
            <Skeleton className="mt-6 h-[300px] w-full rounded-2xl" />
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-[280px] w-full rounded-2xl" />
              <Skeleton className="h-[280px] w-full rounded-2xl" />
            </div>
          </>
        }
      >
        <AnalyticsCharts timeline={timeline} templateData={templateData} />
      </Suspense>
    </div>
  );
}
