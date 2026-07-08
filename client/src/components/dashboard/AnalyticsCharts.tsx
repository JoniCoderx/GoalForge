import { useState } from 'react';
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
import { formatNumber } from '@/lib/utils';

export interface TimelinePoint {
  date: string;
  Views: number;
  Created: number;
}

export interface TemplateDatum {
  key: string;
  name: string;
  icon: string;
  count: number;
  color: string;
}

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

export default function AnalyticsCharts({
  timeline,
  templateData,
}: {
  timeline: TimelinePoint[];
  templateData: TemplateDatum[];
}) {
  const [series, setSeries] = useState<'views' | 'created'>('views');

  const hasTimeline = timeline.some((d) => d.Views > 0 || d.Created > 0);
  const hasTemplates = templateData.length > 0;

  return (
    <>
      {/* Timeline */}
      <div className="mt-6 card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-white">Activity over time</h2>
            <p className="text-xs text-slate-500">Last 14 days</p>
          </div>
          <div className="flex rounded-lg border border-white/10 bg-white/[0.02] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSeries('views')}
              className={
                'rounded-md px-3 py-1.5 font-medium transition ' +
                (series === 'views' ? 'bg-brand-500/15 text-brand-300' : 'text-slate-400 hover:text-white')
              }
            >
              Views
            </button>
            <button
              type="button"
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
    </>
  );
}
