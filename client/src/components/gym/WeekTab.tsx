import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { DAY_LABELS, addDays, fmtMinutes, gymApi, weekStart } from '@/lib/gym';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar, Empty, Panel, SectionTitle, Stat } from './shared';

const MEDALS = ['🥇', '🥈', '🥉'];

export function WeekTab() {
  const [offset, setOffset] = useState(0);
  const start = useMemo(() => addDays(weekStart(), offset * 7), [offset]);
  const end = addDays(start, 6);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['gym', 'week', start.toISOString()],
    queryFn: () => gymApi.week(start),
    refetchInterval: 15000,
  });

  const rows = data?.rows ?? [];
  const max = Math.max(1, ...rows.flatMap((r) => r.daily));
  const todayIdx = offset === 0 ? new Date().getDay() : -1;
  const range = `${start.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })} – ${end.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}`;
  const leader = rows.find((r) => r.minutes > 0);

  return (
    <div className="space-y-6">
      <Panel>
        <SectionTitle
          title={offset === 0 ? 'השבוע' : offset === -1 ? 'שבוע שעבר' : 'שבוע'}
          subtitle={range}
          action={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setOffset(offset - 1)} aria-label="שבוע קודם">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" disabled={offset >= 0} onClick={() => setOffset(offset + 1)} aria-label="שבוע הבא">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {offset !== 0 && (
                <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
                  היום
                </Button>
              )}
            </div>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="אימונים השבוע" value={data?.totals.sessions ?? '—'} />
          <Stat label="זמן אימון כולל" value={data ? fmtMinutes(data.totals.minutes) : '—'} accent="#0ea5e9" />
          <Stat label="מוביל/ה השבוע" value={leader ? `${leader.member.emoji} ${leader.member.name}` : '—'} accent="#f59e0b" />
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0 sm:p-0">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-6">
            <Empty icon="⚠️" title="לא הצלחנו לטעון את הטבלה" text="בדקו את החיבור ונסו שוב." action={<Button onClick={() => refetch()}>נסו שוב</Button>} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6">
            <Empty icon="📋" title="אין עדיין חברים" text="הוסיפו חברים בלשונית ׳חברים׳." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="px-4 py-3 text-start font-medium">#</th>
                  <th className="px-2 py-3 text-start font-medium">חבר/ה</th>
                  {DAY_LABELS.map((d, i) => (
                    <th key={d} className={cn('px-1 py-3 text-center font-medium', i === todayIdx && 'text-brand-300')}>
                      {d}
                    </th>
                  ))}
                  <th className="px-2 py-3 text-center font-medium">אימונים</th>
                  <th className="px-4 py-3 text-end font-medium">סה״כ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.member.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-lg">{r.minutes > 0 ? MEDALS[i] ?? <span className="text-sm text-slate-500">{i + 1}</span> : <span className="text-sm text-slate-600">—</span>}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar member={r.member} size="sm" />
                        <span className="font-semibold text-white">{r.member.name}</span>
                      </div>
                    </td>
                    {r.daily.map((m, d) => (
                      <td key={d} className="px-1 py-3">
                        <div
                          title={m ? fmtMinutes(m) : 'ללא אימון'}
                          className={cn(
                            'mx-auto grid h-9 w-9 place-items-center rounded-lg text-[11px] font-semibold tabular-nums',
                            m ? 'text-white' : 'bg-white/[0.03] text-transparent',
                            d === todayIdx && 'ring-1 ring-brand-400/40'
                          )}
                          style={m ? { background: `${r.member.color}${Math.round(40 + (m / max) * 160).toString(16).padStart(2, '0')}` } : undefined}
                        >
                          {m || '·'}
                        </div>
                      </td>
                    ))}
                    <td className="px-2 py-3 text-center font-semibold tabular-nums text-white">{r.sessions}</td>
                    <td className="px-4 py-3 text-end font-semibold tabular-nums text-white">{fmtMinutes(r.minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 pb-4 pt-2 text-xs text-slate-500">המספרים בתאים = דקות אימון באותו יום</p>
          </div>
        )}
      </Panel>
    </div>
  );
}
