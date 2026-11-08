import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DAY_LABELS, fmtDate, fmtDuration, fmtKg, fmtTime, gym, sameDay, type GymMember } from '@/lib/gym';
import { cn } from '@/lib/utils';
import { Avatar, Card, Empty, SectionLabel, Sheet } from './shared';

export function History({ me, members }: { me: GymMember; members: GymMember[] }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  const { data: cal } = useQuery({
    queryKey: ['gym', 'calendar', month.toISOString()],
    queryFn: () => gym.calendar(month, next),
  });
  const { data: hist, isLoading } = useQuery({ queryKey: ['gym', 'history'], queryFn: gym.history });

  const colorOf = useMemo(() => new Map(members.map((m) => [m.id, m.color])), [members]);
  const days = useMemo(() => {
    const first = month.getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))] as (Date | null)[];
  }, [month]);

  const today = new Date();
  const isCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  const sessions = hist?.sessions ?? [];

  return (
    <div>
      <h1 className="mb-4 text-[34px] font-black">היסטוריה</h1>

      {/* Calendar */}
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <button type="button" aria-label="חודש קודם" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-11 w-11 place-items-center rounded-full active:bg-white/10">
            <ChevronRight className="h-6 w-6" />
          </button>
          <p className="text-lg font-extrabold">{month.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</p>
          <button
            type="button"
            aria-label="חודש הבא"
            disabled={isCurrentMonth}
            onClick={() => setMonth(next)}
            className="grid h-11 w-11 place-items-center rounded-full active:bg-white/10 disabled:opacity-20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-[12px] font-semibold text-white/35">
          {DAY_LABELS.map((d) => (
            <span key={d} className="py-1">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((d, i) => {
            if (!d) return <span key={`b${i}`} />;
            const who = [...new Set((cal?.sessions ?? []).filter((s) => sameDay(new Date(s.startedAt), d)).map((s) => s.memberId))];
            const isToday = sameDay(d, today);
            return (
              <div key={d.toISOString()} className="flex flex-col items-center py-1">
                <span className={cn('grid h-9 w-9 place-items-center rounded-full text-[15px] font-semibold', isToday && 'bg-white text-black', !isToday && who.length && 'text-white', !isToday && !who.length && 'text-white/45')}>
                  {d.getDate()}
                </span>
                <span className="mt-0.5 flex h-2 gap-0.5">
                  {who.map((id) => (
                    <span key={id} className="h-2 w-2 rounded-full" style={{ background: colorOf.get(id) ?? '#888' }} />
                  ))}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-white/[0.06] pt-2.5">
          {members.map((m) => (
            <span key={m.id} className="flex items-center gap-1.5 text-[13px] text-white/60">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
              {m.id === me.id ? 'אני' : m.name}
            </span>
          ))}
        </div>
      </Card>

      {/* My log */}
      <SectionLabel>האימונים שלי</SectionLabel>
      {isLoading ? (
        <div className="h-24 animate-pulse rounded-[24px] bg-white/[0.04]" />
      ) : sessions.length === 0 ? (
        <Card>
          <Empty icon="📭" title="עוד אין אימונים" text="אחרי שתסיימו אימון ראשון — הוא יופיע כאן." />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {sessions.map((s) => (
            <Card key={s.id} onClick={() => setOpenId(s.id)} className="flex items-center gap-3.5 p-3.5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/[0.08] text-xl font-black">{s.planKey}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{fmtDate(s.startedAt)}</p>
                <p className="text-[14px] text-white/50">
                  {fmtTime(s.startedAt)} · {fmtDuration(s.startedAt, s.endedAt)} · {s.exercises} תרגילים · {s.sets} סטים
                </p>
              </div>
              <ChevronLeft className="h-5 w-5 text-white/30" />
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!openId} onClose={() => setOpenId(null)} title="פירוט אימון">
        {openId && <SessionDetail id={openId} />}
      </Sheet>
    </div>
  );
}

function SessionDetail({ id }: { id: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['gym', 'session', id], queryFn: () => gym.session(id) });
  if (isLoading || !data) return <div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />;
  const { session, items } = data;
  return (
    <div>
      <div className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3">
        <Avatar member={{ emoji: session.planKey, color: '#d4ff3a' }} size={44} />
        <div>
          <p className="font-bold">{session.planName}</p>
          <p className="text-[14px] text-white/50">
            {fmtDate(session.startedAt)} · {fmtTime(session.startedAt)}
            {session.endedAt && <> · {fmtDuration(session.startedAt, session.endedAt)}</>}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((it) => (
          <div key={it.key} className="rounded-2xl border border-white/[0.07] p-3">
            <p className="font-bold">{it.name}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {it.sets.map((s, i) => (
                <span key={i} className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[14px] font-semibold tabular-nums" dir="ltr">
                  {s.weight != null ? `${fmtKg(s.weight)}kg` : '–'} × {s.reps ?? '–'}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
