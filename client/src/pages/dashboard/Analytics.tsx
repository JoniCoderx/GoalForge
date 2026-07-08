import { lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Eye,
  Heart,
  Share2,
  Flame,
  Rocket,
  CheckCircle2,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
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
        Views: d.views,
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
          subtitle="Track how your football shorts are performing."
        />
        <EmptyState
          icon={<AlertTriangle className="h-7 w-7" />}
          title="Couldn't load analytics"
          description="Something went wrong fetching your performance metrics. Please try again."
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
          subtitle="Track how your football shorts are performing."
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
        subtitle="Track how your football shorts are performing across platforms."
      />

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total views" value={totals?.views ?? 0} icon={<Eye className="h-5 w-5" />} accent="sky" delay={0} />
        <StatCard label="Likes" value={totals?.likes ?? 0} icon={<Heart className="h-5 w-5" />} accent="rose" delay={0.05} />
        <StatCard label="Shares" value={totals?.shares ?? 0} icon={<Share2 className="h-5 w-5" />} accent="violet" delay={0.1} />
        <StatCard
          label="Engagement rate"
          value={totals?.engagementRate ?? 0}
          suffix="%"
          icon={<Flame className="h-5 w-5" />}
          accent="amber"
          delay={0.15}
        />
        <StatCard label="Exports" value={totals?.exports ?? 0} icon={<Rocket className="h-5 w-5" />} accent="brand" delay={0.2} />
        <StatCard label="Ready to post" value={totals?.ready ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} accent="brand" delay={0.25} />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Info className="h-3.5 w-3.5" />
        Views, likes, shares and engagement are simulated placeholders for demo purposes.
      </p>

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
