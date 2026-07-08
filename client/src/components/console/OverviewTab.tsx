import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { Users, UserCheck, Crown, Ban, Video as VideoIcon, Film, Rocket } from 'lucide-react';
import { consoleApi } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { StatCard } from '@/components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from './shared';

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

export function OverviewTab() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['console-metrics'],
    queryFn: consoleApi.metrics,
  });

  const timeline = useMemo(
    () =>
      (data?.timeline ?? []).slice(-14).map((d) => ({
        date: dayLabel(d.date),
        Signups: d.signups,
        Renders: d.renders,
      })),
    [data]
  );

  if (isLoading) {
    return (
      <div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-[320px] w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState label="Could not load console metrics." onRetry={() => refetch()} />;
  }

  const t = data.totals;
  const hasTimeline = timeline.some((d) => d.Signups > 0 || d.Renders > 0);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total users" value={t.totalUsers} icon={<Users className="h-5 w-5" />} accent="violet" delay={0} />
        <StatCard label="Active users" value={t.activeUsers} icon={<UserCheck className="h-5 w-5" />} accent="brand" delay={0.04} />
        <StatCard label="Premium users" value={t.premiumUsers} icon={<Crown className="h-5 w-5" />} accent="amber" delay={0.08} />
        <StatCard label="Banned users" value={t.bannedUsers} icon={<Ban className="h-5 w-5" />} accent="rose" delay={0.12} />
        <StatCard label="Total videos" value={t.totalVideos} icon={<VideoIcon className="h-5 w-5" />} accent="sky" delay={0.16} />
        <StatCard label="Rendered" value={t.rendered} icon={<Film className="h-5 w-5" />} accent="brand" delay={0.2} />
        <StatCard label="Total exports" value={t.totalExports} icon={<Rocket className="h-5 w-5" />} accent="violet" delay={0.24} />
      </div>

      <div className="mt-6 card p-5">
        <div className="mb-4">
          <h2 className="font-display font-semibold text-white">Signups & renders</h2>
          <p className="text-xs text-slate-500">Last 14 days</p>
        </div>
        {hasTimeline ? (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="cSignups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cRenders" x1="0" y1="0" x2="0" y2="1">
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
              <Legend
                iconType="circle"
                formatter={(value) => <span className="text-xs text-slate-400">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="Signups"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#cSignups)"
                dot={false}
                activeDot={{ r: 4, fill: '#22c55e' }}
              />
              <Area
                type="monotone"
                dataKey="Renders"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#cRenders)"
                dot={false}
                activeDot={{ r: 4, fill: '#0ea5e9' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-[320px] place-items-center text-sm text-slate-500">No activity in this period.</div>
        )}
      </div>
    </div>
  );
}
