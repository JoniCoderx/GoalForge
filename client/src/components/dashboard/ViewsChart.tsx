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
import { formatNumber } from '@/lib/utils';

export interface ViewsPoint {
  date: string;
  Views: number;
}

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

export default function ViewsChart({ data }: { data: ViewsPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
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
  );
}
