import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import {
  Film,
  CheckCircle2,
  Eye,
  Flame,
  Sparkles,
  LayoutTemplate,
  Palette,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { StatCard } from '@/components/dashboard/StatCard';
import { VideoCard } from '@/components/dashboard/VideoCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatNumber } from '@/lib/utils';

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-ink-900/90 px-3 py-2 text-xs shadow-card backdrop-blur-xl">
      <p className="mb-1 font-medium text-slate-300">{label}</p>
      {payload.map((p) => (
        <p key={String(p.name)} className="flex items-center gap-2 text-white">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}</span>
          <span className="font-semibold">{formatNumber(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function Overview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.name?.split(' ')[0] || 'there';

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: api.analytics.overview,
  });
  const { data: videosData, isLoading: loadingVideos } = useQuery({
    queryKey: ['videos'],
    queryFn: () => api.videos.list(),
  });

  const totals = overview?.totals;
  const videos = useMemo(() => videosData?.videos ?? [], [videosData]);

  const recent = useMemo(
    () =>
      [...videos]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 8),
    [videos]
  );

  const chartData = useMemo(
    () =>
      (overview?.timeline ?? []).slice(-14).map((d) => ({
        date: dayLabel(d.date),
        Views: d.views,
      })),
    [overview]
  );

  const hasChart = chartData.some((d) => d.Views > 0);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="text-sm text-slate-400">Welcome back</p>
        <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
          Hey {firstName}, let&apos;s <span className="gradient-text">forge</span> something viral.
        </h1>
      </motion.div>

      {/* Metrics */}
      {loadingOverview ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total videos"
            value={totals?.videos ?? 0}
            icon={<Film className="h-5 w-5" />}
            accent="brand"
            delay={0}
          />
          <StatCard
            label="Ready to post"
            value={totals?.ready ?? 0}
            icon={<CheckCircle2 className="h-5 w-5" />}
            accent="sky"
            delay={0.05}
          />
          <StatCard
            label="Total views"
            value={totals?.views ?? 0}
            icon={<Eye className="h-5 w-5" />}
            accent="violet"
            delay={0.1}
          />
          <StatCard
            label="Engagement rate"
            value={totals?.engagementRate ?? 0}
            suffix="%"
            icon={<Flame className="h-5 w-5" />}
            accent="amber"
            delay={0.15}
            hint="Simulated placeholder metric"
          />
        </div>
      )}

      {/* Chart + Quick actions */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display font-semibold text-white">Views this fortnight</h2>
              <p className="text-xs text-slate-500">Last 14 days · simulated engagement</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/10 text-brand-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          {loadingOverview ? (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          ) : hasChart ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="ovViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(v) => formatNumber(Number(v))}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <Area
                  type="monotone"
                  dataKey="Views"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#ovViews)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#22c55e' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-[240px] place-items-center text-center text-sm text-slate-500">
              No view data yet — export a video to start tracking.
            </div>
          )}
        </div>

        <div className="card flex flex-col p-5">
          <h2 className="mb-4 font-display font-semibold text-white">Quick actions</h2>
          <div className="flex flex-col gap-3">
            <QuickAction
              to="/app/create"
              icon={<Sparkles className="h-5 w-5" />}
              title="Create content"
              subtitle="Forge a new football short"
            />
            <QuickAction
              to="/app/templates"
              icon={<LayoutTemplate className="h-5 w-5" />}
              title="Browse templates"
              subtitle="Pick a proven format"
            />
            <QuickAction
              to="/app/brand"
              icon={<Palette className="h-5 w-5" />}
              title="Brand kit"
              subtitle="Colors, fonts & watermark"
            />
          </div>
        </div>
      </div>

      {/* Recent videos */}
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-white">Recent videos</h2>
          {recent.length > 0 && (
            <Link to="/app/videos" className="text-sm text-brand-400 hover:text-brand-300">
              View all
            </Link>
          )}
        </div>
        {loadingVideos ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<Film className="h-7 w-7" />}
            title="No videos yet"
            description="Your forged football shorts will show up here. Create your first one to get started."
            action={
              <Button onClick={() => navigate('/app/create')}>
                <Sparkles className="h-4 w-4" /> Create your first video
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((v, i) => (
              <VideoCard key={v.id} video={v} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-all hover:border-brand-500/40 hover:bg-brand-500/5"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-400">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-white">{title}</p>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-400" />
    </Link>
  );
}
