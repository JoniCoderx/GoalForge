import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface ProgressPoint {
  label: string;
  weight: number;
  reps: number;
}

export default function ProgressChart({ data }: { data: ProgressPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickLine={false} axisLine={false} reversed />
        <YAxis orientation="right" width={34} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#1a1c20', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, direction: 'rtl' }}
          labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
          formatter={(v: number, _n, p) => [`${v} ק״ג × ${(p.payload as ProgressPoint).reps}`, 'הסט הכבד']}
        />
        <Line type="monotone" dataKey="weight" stroke="#d4ff3a" strokeWidth={3} dot={{ r: 4, fill: '#d4ff3a', strokeWidth: 0 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
