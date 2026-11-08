import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Flame } from 'lucide-react';
import { DAY_LABELS, LIME, WEEKLY_GOAL_MIN, addDays, fmtMinutes, gymApi, weekStart, type GymWeekRow } from '@/lib/gym';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar, Card, Empty, GymButton } from './shared';

const PODIUM = [
  { place: 2, medal: '🥈', h: 'h-24', tone: 'from-slate-300/25' },
  { place: 1, medal: '🥇', h: 'h-36', tone: 'from-[#d4ff3a]/35' },
  { place: 3, medal: '🥉', h: 'h-16', tone: 'from-orange-400/25' },
];

export function WeekTab({ meId }: { meId: string | null }) {
  const [offset, setOffset] = useState(0);
  const start = useMemo(() => addDays(weekStart(), offset * 7), [offset]);
  const end = addDays(start, 6);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['gym', 'week', start.toISOString()],
    queryFn: () => gymApi.week(start),
    refetchInterval: 15000,
  });

  const rows = data?.rows ?? [];
  const ranked = rows.filter((r) => r.minutes > 0);
  const todayIdx = offset === 0 ? new Date().getDay() : -1;
  const fmt = (d: Date) => d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
  const teamGoal = Math.max(1, rows.length * WEEKLY_GOAL_MIN);
  const teamPct = Math.min(1, (data?.totals.minutes ?? 0) / teamGoal);
  const title = offset === 0 ? 'השבוע' : offset === -1 ? 'שבוע שעבר' : `לפני ${-offset} שבועות`;

  return (
    <div className="space-y-6">
      {/* Header + nav */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/50" dir="ltr">
            {fmt(start)} – {fmt(end)}
          </p>
          <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {offset !== 0 && (
            <button type="button" onClick={() => setOffset(0)} className="rounded-full px-3 py-2 text-sm font-bold text-[#d4ff3a]">
              היום
            </button>
          )}
          <NavBtn label="שבוע קודם" onClick={() => setOffset(offset - 1)}>
            <ChevronRight className="h-5 w-5" />
          </NavBtn>
          <NavBtn label="שבוע הבא" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>
            <ChevronLeft className="h-5 w-5" />
          </NavBtn>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-[28px]" />
          <Skeleton className="h-40 rounded-[28px]" />
        </div>
      ) : isError ? (
        <Card>
          <Empty icon="⚠️" title="לא הצלחנו לטעון" text="בדקו את החיבור ונסו שוב." action={<GymButton onClick={() => refetch()}>נסו שוב</GymButton>} />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <Empty icon="🏆" title="אין עדיין חבר׳ה" text="הוסיפו חברים כדי להתחיל להתחרות." />
        </Card>
      ) : (
        <>
          {/* Podium */}
          <Card glow={`${LIME}55`}>
            {ranked.length === 0 ? (
              <Empty icon="🏁" title="הדירוג עוד פתוח" text="מי שמתאמן ראשון השבוע — עולה ראשון לפודיום." />
            ) : (
              <div className="flex items-end justify-center gap-3 pt-4 sm:gap-6">
                {PODIUM.map(({ place, medal, h, tone }, i) => {
                  const r = ranked[place - 1];
                  return (
                    <motion.div
                      key={place}
                      className="flex w-28 flex-col items-center sm:w-36"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.1, type: 'spring', damping: 18 }}
                    >
                      {r ? (
                        <>
                          {place === 1 && (
                            <motion.span className="mb-1 text-3xl" animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                              👑
                            </motion.span>
                          )}
                          <Avatar member={r.member} size={place === 1 ? 76 : 60} ring />
                          <p className="mt-2 max-w-full truncate text-base font-extrabold">{r.member.name}</p>
                          <p className="text-sm font-bold tabular-nums" style={{ color: place === 1 ? LIME : 'rgba(255,255,255,0.6)' }}>
                            {fmtMinutes(r.minutes)}
                          </p>
                        </>
                      ) : (
                        <div className="mb-[52px] grid h-[60px] w-[60px] place-items-center rounded-full border border-dashed border-white/15 text-white/20">?</div>
                      )}
                      <div
                        className={cn(
                          'mt-3 grid w-full place-items-start justify-center rounded-t-2xl border-x border-t border-white/10 bg-gradient-to-b to-transparent pt-2 text-3xl',
                          h,
                          tone
                        )}
                      >
                        {medal}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Team goal */}
            <div className="mt-6 rounded-2xl bg-black/30 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold">יעד קבוצתי</span>
                <span className="font-bold tabular-nums text-white/60">
                  <span className="text-white">{data?.totals.minutes ?? 0}</span> / {teamGoal} דק׳
                </span>
              </div>
              <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full bg-[#d4ff3a] shadow-[0_0_20px_rgba(212,255,58,0.6)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${teamPct * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              <p className="mt-2 text-xs text-white/40">
                {data?.totals.sessions ?? 0} אימונים השבוע · {WEEKLY_GOAL_MIN} דק׳ לכל אחד
              </p>
            </div>
          </Card>

          {/* Full table */}
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between px-2 pb-3 pt-1">
              <h2 className="text-xl font-extrabold">טבלה מלאה</h2>
              <div className="flex gap-[5px] text-[10px] font-bold text-white/35 max-sm:hidden">
                {DAY_LABELS.map((d, i) => (
                  <span key={d} className={cn('w-6 text-center', i === todayIdx && 'text-[#d4ff3a]')}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
            <ul className="space-y-2">
              {rows.map((r, i) => (
                <Row key={r.member.id} row={r} rank={r.minutes > 0 ? i + 1 : null} me={r.member.id === meId} todayIdx={todayIdx} delay={i * 0.04} />
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function Row({ row, rank, me, todayIdx, delay }: { row: GymWeekRow; rank: number | null; me: boolean; todayIdx: number; delay: number }) {
  const goalPct = Math.min(1, row.minutes / WEEKLY_GOAL_MIN);
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn('rounded-2xl p-3', me ? 'bg-[#d4ff3a]/[0.07] ring-1 ring-[#d4ff3a]/25' : 'bg-white/[0.025]')}
    >
      <div className="flex items-center gap-3">
        <span className="w-6 text-center text-sm font-black tabular-nums text-white/40">{rank ?? '–'}</span>
        <Avatar member={row.member} size={42} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate font-extrabold">
            {row.member.name}
            {me && <span className="rounded-full bg-[#d4ff3a] px-2 py-0.5 text-[10px] font-black text-black">אני</span>}
            {row.streak >= 2 && (
              <span className="flex items-center gap-0.5 rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-bold text-orange-300">
                <Flame className="h-3 w-3" /> {row.streak}
              </span>
            )}
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full" style={{ width: `${goalPct * 100}%`, background: row.member.color }} />
          </div>
        </div>
        <Days daily={row.daily} color={row.member.color} todayIdx={todayIdx} className="max-sm:hidden" />
        <div className="w-[76px] text-end">
          <p className="text-base font-black tabular-nums">{fmtMinutes(row.minutes)}</p>
          <p className="text-[11px] font-bold text-white/40">{row.sessions} אימונים</p>
        </div>
      </div>
      <Days daily={row.daily} color={row.member.color} todayIdx={todayIdx} className="mt-3 justify-between ps-9 sm:hidden" labels />
    </motion.li>
  );
}

function Days({
  daily,
  color,
  todayIdx,
  className,
  labels,
}: {
  daily: number[];
  color: string;
  todayIdx: number;
  className?: string;
  labels?: boolean;
}) {
  const max = Math.max(60, ...daily);
  return (
    <div className={cn('flex gap-[5px]', className)}>
      {daily.map((m, d) => (
        <div key={d} className="flex flex-col items-center gap-1">
          <div
            title={`${DAY_LABELS[d]}: ${m ? `${m} דק׳` : 'ללא אימון'}`}
            className={cn('h-6 w-6 rounded-[7px]', d === todayIdx && 'ring-1 ring-white/50 ring-offset-1 ring-offset-[#0b0c0e]')}
            style={{ background: m ? color : 'rgba(255,255,255,0.05)', opacity: m ? 0.35 + 0.65 * (m / max) : 1 }}
          />
          {labels && <span className={cn('text-[9px] font-bold', d === todayIdx ? 'text-[#d4ff3a]' : 'text-white/30')}>{DAY_LABELS[d]}</span>}
        </div>
      ))}
    </div>
  );
}

function NavBtn({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08] disabled:opacity-25"
    >
      {children}
    </button>
  );
}
