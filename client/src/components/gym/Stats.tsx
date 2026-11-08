import { lazy, Suspense, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { fmtKg, gym, relativeDay, type GymMember } from '@/lib/gym';
import { cn } from '@/lib/utils';
import { Avatar, Card, Empty, SectionLabel } from './shared';

const ProgressChart = lazy(() => import('./ProgressChart'));

export function Stats({ me }: { me: GymMember }) {
  const { data: ov } = useQuery({ queryKey: ['gym', 'overview'], queryFn: gym.overview });
  const { data: st, isLoading } = useQuery({ queryKey: ['gym', 'stats'], queryFn: gym.stats });
  const [picked, setPicked] = useState<string | null>(null);

  const rows = ov?.members ?? [];
  const mine = rows.find((r) => r.member.id === me.id);
  const exercises = st?.exercises ?? [];
  const current = exercises.find((e) => e.key === picked) ?? exercises[0];

  const chart = useMemo(
    () =>
      (current?.series ?? []).map((p) => ({
        label: new Date(p.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }),
        weight: p.weight,
        reps: p.reps,
      })),
    [current]
  );
  const first = current?.series[0];
  const last = current?.series[current.series.length - 1];
  const gain = first && last ? last.weight - first.weight : 0;
  const maxOf = (k: 'week' | 'month' | 'total' | 'perWeek') => Math.max(1, ...rows.map((r) => r[k]));

  return (
    <div>
      <h1 className="mb-4 text-[34px] font-black">התקדמות</h1>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'סה״כ אימונים', value: mine?.total ?? 0 },
          { label: 'בממוצע בשבוע', value: mine?.perWeek ?? 0, hint: '8 שבועות אחרונים' },
          { label: 'השבוע', value: mine?.week ?? 0 },
          { label: 'החודש', value: mine?.month ?? 0 },
        ].map((t) => (
          <Card key={t.label}>
            <p className="text-[34px] font-black leading-none tabular-nums">{t.value}</p>
            <p className="mt-1.5 text-[14px] text-white/55">{t.label}</p>
            {t.hint && <p className="text-[11px] text-white/30">{t.hint}</p>}
          </Card>
        ))}
      </div>

      {/* Per-exercise progress */}
      <SectionLabel>התקדמות בתרגילים</SectionLabel>
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-[24px] bg-white/[0.04]" />
      ) : exercises.length === 0 ? (
        <Card>
          <Empty icon="📈" title="עוד אין נתונים" text="אחרי כמה אימונים יופיעו כאן גרפים ושיאים אישיים." />
        </Card>
      ) : (
        <>
          <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden">
            {exercises.map((e) => (
              <button
                key={e.key}
                type="button"
                onClick={() => setPicked(e.key)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-[15px] font-bold',
                  current?.key === e.key ? 'bg-[#d4ff3a] text-black' : 'bg-white/[0.07] text-white/70'
                )}
              >
                {e.name}
              </button>
            ))}
          </div>
          {current && (
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] text-white/45">משקל עבודה אחרון</p>
                  <p className="text-[32px] font-black leading-tight tabular-nums">
                    {last ? fmtKg(last.weight) : '–'} <span className="text-lg text-white/50">ק״ג</span>
                  </p>
                </div>
                {current.series.length > 1 && gain !== 0 && (
                  <span className={cn('rounded-full px-3 py-1 text-[14px] font-bold', gain > 0 ? 'bg-[#d4ff3a]/15 text-[#d4ff3a]' : 'bg-white/[0.07] text-white/60')} dir="ltr">
                    {gain > 0 ? '+' : ''}
                    {fmtKg(gain)} kg
                  </span>
                )}
              </div>
              {chart.length > 1 ? (
                <Suspense fallback={<div className="h-[220px]" />}>
                  <div className="mt-2" dir="ltr">
                    <ProgressChart data={chart} />
                  </div>
                </Suspense>
              ) : (
                <p className="py-8 text-center text-[14px] text-white/40">הגרף יופיע מהאימון השני בתרגיל הזה</p>
              )}
            </Card>
          )}

          <SectionLabel>שיאים אישיים</SectionLabel>
          <Card className="divide-y divide-white/[0.06] p-0">
            {exercises.map((e) =>
              e.pr ? (
                <div key={e.key} className="flex items-center gap-3 px-4 py-3">
                  <Trophy className="h-5 w-5 shrink-0 text-amber-300" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{e.name}</span>
                  <span className="text-end">
                    <span className="block font-black tabular-nums" dir="ltr">
                      {fmtKg(e.pr.weight)}kg × {e.pr.reps}
                    </span>
                    <span className="block text-[12px] text-white/40">{relativeDay(e.pr.date)}</span>
                  </span>
                </div>
              ) : null
            )}
          </Card>
        </>
      )}

      {/* Compare attendance */}
      {rows.length > 1 && (
        <>
          <SectionLabel>מי מגיע יותר? 🏆</SectionLabel>
          <Card className="space-y-5">
            {(
              [
                ['week', 'השבוע'],
                ['month', 'החודש'],
                ['perWeek', 'ממוצע שבועי'],
                ['total', 'סה״כ'],
              ] as const
            ).map(([k, label]) => (
              <div key={k}>
                <p className="mb-2 text-[14px] font-bold text-white/55">{label}</p>
                <div className="space-y-2">
                  {rows.map((r) => (
                    <div key={r.member.id} className="flex items-center gap-2.5">
                      <Avatar member={r.member} size={28} />
                      <div className="h-7 flex-1 overflow-hidden rounded-lg bg-white/[0.05]">
                        <div className="flex h-full items-center rounded-lg px-2 text-[13px] font-black text-black transition-all" style={{ width: `${Math.max(10, (r[k] / maxOf(k)) * 100)}%`, background: r.member.color }}>
                          {r[k]}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-center text-[12px] text-white/35">משווים רק כמות והגעה — המשקלים של כל אחד נשארים אישיים.</p>
          </Card>
        </>
      )}
    </div>
  );
}
