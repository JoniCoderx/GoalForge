import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import {
  BarChart3,
  Eye,
  Heart,
  Share2,
  Flame,
  Rocket,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Template } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatNumber } from '@/lib/utils';

const PALETTE = ['#22c55e', '#0ea5e9', '#a855f7', '#f59e0b', '#f43f5e'];

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs shadow-card backdrop-blur-xl"
      style={{ background: 'rgba(10,17,32,0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12 }}
    >
      {label && <p className="mb-1 font-medium text-slate-300">{label}</p>}
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

const tooltipStyle = {
  background: 'rgba(10,17,32,0.9)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#fff',
} as const;

export default function Analytics() {
  const navigate = useNavigate();
  const [series, setSeries] = useState<'views' | 'created'>('views');

  const { data: overview, isLoading: loadingOverview } = useQuery({
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

  const hasTimeline = timeline.some((d) => d.Views > 0 || d.Created > 0);
  const hasTemplates = templateData.length > 0;
  const isEmpty = !loadingOverview && (totals?.videos ?? 0) === 0;

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

      {/* Timeline */}
      <div className="mt-6 card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-white">Activity over time</h2>
            <p className="text-xs text-slate-500">Last 14 days</p>
          </div>
          <div className="flex rounded-lg border border-white/10 bg-white/[0.02] p-0.5 text-xs">
            <button
              onClick={() => setSeries('views')}
              className={
                'rounded-md px-3 py-1.5 font-medium transition ' +
                (series === 'views' ? 'bg-brand-500/15 text-brand-300' : 'text-slate-400 hover:text-white')
              }
            >
              Views
            </button>
            <button
              onClick={() => setSeries('created')}
              className={
                'rounded-md px-3 py-1.5 font-medium transition ' +
                (series === 'created' ? 'bg-sky-500/15 text-accent-sky' : 'text-slate-400 hover:text-white')
              }
            >
              Videos created
            </button>
          </div>
        </div>
        {hasTimeline ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="anViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="anCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
                allowDecimals={false}
                tickFormatter={(v) => formatNumber(Number(v))}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
              {series === 'views' ? (
                <Area
                  type="monotone"
                  dataKey="Views"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#anViews)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#22c55e' }}
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey="Created"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fill="url(#anCreated)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#0ea5e9' }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-[300px] place-items-center text-sm text-slate-500">No activity in this period.</div>
        )}
      </div>

      {/* By template: bar + donut */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-display font-semibold text-white">Videos by template</h2>
          {hasTemplates ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={templateData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="icon"
                  tick={{ fill: '#94a3b8', fontSize: 16 }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, p) => (p && p[0] ? String(p[0].payload.name) : '')}
                  formatter={(v: number) => [formatNumber(v), 'Videos']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {templateData.map((d) => (
                    <Cell key={d.key} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-[280px] place-items-center text-sm text-slate-500">No template data yet.</div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-display font-semibold text-white">Content mix</h2>
          {hasTemplates ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={templateData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={100}
                  paddingAngle={2}
                  stroke="rgba(10,17,32,0.9)"
                  strokeWidth={2}
                >
                  {templateData.map((d) => (
                    <Cell key={d.key} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n) => [formatNumber(v), String(n)]}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-[280px] place-items-center text-sm text-slate-500">No template data yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
