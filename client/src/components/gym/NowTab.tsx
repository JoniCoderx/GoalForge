import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Play, Square, PenLine, Repeat, Flame, Clock3, Dumbbell } from 'lucide-react';
import { ApiError } from '@/lib/api';
import {
  EQUIPMENT,
  GYM_INPUT,
  LIME,
  SESSION_GOAL_MIN,
  WEEKLY_GOAL_MIN,
  equipmentLabel,
  fmtClock,
  fmtMinutes,
  fmtTime,
  gymApi,
  weekStart,
  type GymMember,
} from '@/lib/gym';
import { useMedia, useNow } from '@/lib/useNow';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Avatar, Card, Empty, GymButton, Label, Ring } from './shared';
import { LogWorkoutForm } from './LogWorkoutForm';

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'משהו השתבש, נסו שוב');

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'לילה טוב';
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  if (h < 21) return 'ערב טוב';
  return 'לילה טוב';
}

export function NowTab({
  me,
  members,
  onPickMe,
  onGoMembers,
}: {
  me: GymMember | null;
  members: GymMember[];
  onPickMe: (id: string | null) => void;
  onGoMembers: () => void;
}) {
  const qc = useQueryClient();
  const now = useNow(1000);
  const wide = useMedia('(min-width: 640px)');
  const [equipment, setEquipment] = useState('');
  const [notes, setNotes] = useState('');
  const [logging, setLogging] = useState(false);

  const { data } = useQuery({ queryKey: ['gym', 'active'], queryFn: gymApi.active, refetchInterval: 5000 });
  const start0 = useMemo(() => weekStart(), []);
  const { data: week } = useQuery({
    queryKey: ['gym', 'week', start0.toISOString()],
    queryFn: () => gymApi.week(start0),
    refetchInterval: 15000,
  });

  const active = data?.workouts ?? [];
  const mine = me ? active.find((w) => w.memberId === me.id) : undefined;
  const myRow = me ? week?.rows.find((r) => r.member.id === me.id) : undefined;

  const refresh = () => qc.invalidateQueries({ queryKey: ['gym'] });

  const start = useMutation({
    mutationFn: () => gymApi.start(me!.id, equipment || undefined),
    onSuccess: () => {
      toast.success('יאללה! האימון התחיל 💪');
      refresh();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const stop = useMutation({
    mutationFn: () => gymApi.stop(mine!.id, { notes: notes || undefined }),
    onSuccess: ({ workout }) => {
      if (workout) toast.success(`כל הכבוד! ${fmtMinutes(workout.durationMin)} נרשמו 🔥`);
      else toast('אימון של פחות מדקה — לא נרשם', { icon: '⏱️' });
      setNotes('');
      setEquipment('');
      refresh();
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (members.length === 0) {
    return (
      <Card>
        <Empty
          icon="👋"
          title="בואו נתחיל"
          text="הוסיפו את עצמכם ואת החבר׳ה — ואז מתחילים להתאמן ולהתחרות."
          action={<GymButton onClick={onGoMembers}>הוספת חבר׳ה</GymButton>}
        />
      </Card>
    );
  }

  if (!me) {
    return (
      <div>
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">מי מתאמן?</h1>
        <p className="mt-2 text-white/50">בחרו את עצמכם — נזכור אתכם במכשיר הזה.</p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m, i) => (
            <motion.button
              key={m.id}
              type="button"
              onClick={() => onPickMe(m.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.96 }}
              className="flex flex-col items-center gap-3 rounded-[28px] border border-white/[0.08] bg-white/[0.035] px-4 py-7 backdrop-blur-xl transition-colors hover:border-white/20"
            >
              <Avatar member={m} size={72} />
              <span className="text-lg font-extrabold">{m.name}</span>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  const elapsedMs = mine ? now - new Date(mine.startedAt).getTime() : 0;
  const weekMin = myRow?.minutes ?? 0;
  const ringValue = mine ? elapsedMs / (SESSION_GOAL_MIN * 60000) : weekMin / WEEKLY_GOAL_MIN;
  const others = active.filter((w) => w.memberId !== me.id);
  const streak = myRow?.streak ?? 0;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/50">{greeting()} 👋</p>
          <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{me.name}</h1>
        </div>
        <button
          type="button"
          onClick={() => onPickMe(null)}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/70 transition hover:text-white"
        >
          <Repeat className="h-4 w-4" /> החלפה
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* Hero */}
        <Card glow={mine ? `${LIME}` : `${me.color}`} className="pb-7">
          <div className="flex flex-col items-center">
            <HeroRing
              size={wide ? 320 : 270}
              mine={!!mine}
              value={ringValue}
              elapsedMs={elapsedMs}
              weekMin={weekMin}
              busy={start.isPending}
              onStart={() => start.mutate()}
            />

            <AnimatePresence mode="wait" initial={false}>
              {mine ? (
                <motion.div
                  key="live"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 w-full max-w-md space-y-3"
                >
                  <p className="text-center text-sm text-white/50">
                    התחלת ב-{fmtTime(mine.startedAt)}
                    {mine.equipment && <> · {equipmentLabel(mine.equipment)}</>}
                  </p>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={300}
                    placeholder="מה עשית היום? (לא חובה)"
                    aria-label="הערה לאימון"
                    className={GYM_INPUT}
                  />
                  <GymButton variant="red" loading={stop.isPending} onClick={() => stop.mutate()} className="h-14 w-full text-lg">
                    <Square className="h-5 w-5 fill-current" /> סיום אימון
                  </GymButton>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 w-full"
                >
                  <Label>על מה מתאמנים? (לא חובה)</Label>
                  <div className="-mx-5 flex snap-x gap-2.5 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
                    {EQUIPMENT.map((e) => {
                      const on = equipment === e.key;
                      return (
                        <motion.button
                          key={e.key}
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          onClick={() => setEquipment(on ? '' : e.key)}
                          className={cn(
                            'flex w-[92px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 text-center transition-colors',
                            on ? 'border-[#d4ff3a] bg-[#d4ff3a]/10' : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
                          )}
                          aria-pressed={on}
                        >
                          <span className="text-3xl">{e.icon}</span>
                          <span className={cn('text-xs font-bold leading-tight', on ? 'text-[#d4ff3a]' : 'text-white/70')}>{e.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setLogging(true)}
                    className="mx-auto mt-4 flex items-center gap-1.5 text-sm font-medium text-white/40 transition hover:text-white"
                  >
                    <PenLine className="h-4 w-4" /> שכחתי להפעיל — רישום ידני
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        <div className="space-y-6">
          {/* My week */}
          <div className="grid grid-cols-3 gap-3">
            <MiniStat icon={<Clock3 className="h-4 w-4" />} label="דקות השבוע" value={weekMin} />
            <MiniStat icon={<Dumbbell className="h-4 w-4" />} label="אימונים" value={myRow?.sessions ?? 0} />
            <MiniStat
              icon={<Flame className="h-4 w-4" />}
              label="ימים ברצף"
              value={streak}
              hot={streak >= 2}
            />
          </div>

          {/* Live now */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">בחדר עכשיו</h2>
              {others.length > 0 && (
                <span className="flex items-center gap-1.5 rounded-full bg-[#d4ff3a]/10 px-3 py-1 text-xs font-bold text-[#d4ff3a]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d4ff3a]" /> {others.length} LIVE
                </span>
              )}
            </div>
            {others.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/40">אף אחד אחר לא מתאמן כרגע 😴</p>
            ) : (
              <ul className="space-y-2.5">
                {others.map((w) => (
                  <motion.li
                    key={w.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 rounded-2xl bg-white/[0.03] p-3"
                  >
                    <Avatar member={w.member} size={44} live />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{w.member.name}</p>
                      <p className="truncate text-xs text-white/45">
                        {w.equipment ? equipmentLabel(w.equipment) : 'אימון'} · מ-{fmtTime(w.startedAt)}
                      </p>
                    </div>
                    <span className="font-mono text-lg font-bold tabular-nums text-[#d4ff3a]" dir="ltr">
                      {fmtClock(now - new Date(w.startedAt).getTime())}
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal open={logging} onClose={() => setLogging(false)} title="רישום אימון ידני">
        {logging && <LogWorkoutForm members={members} defaultMemberId={me.id} onDone={() => setLogging(false)} />}
      </Modal>
    </div>
  );
}

function HeroRing({
  size,
  mine,
  value,
  elapsedMs,
  weekMin,
  busy,
  onStart,
}: {
  size: number;
  mine: boolean;
  value: number;
  elapsedMs: number;
  weekMin: number;
  busy: boolean;
  onStart: () => void;
}) {
  const goalHit = mine && elapsedMs >= SESSION_GOAL_MIN * 60000;
  return (
    <Ring value={value} size={size} stroke={size > 300 ? 16 : 14}>
      {mine ? (
        <div className="text-center">
          <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-[#d4ff3a]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#d4ff3a]" /> באימון
          </p>
          <p className={cn('mt-2 font-black tabular-nums leading-none', size > 300 ? 'text-7xl' : 'text-6xl')} dir="ltr">
            {fmtClock(elapsedMs)}
          </p>
          <p className="mt-3 text-sm font-medium text-white/45">
            {goalHit ? '🎯 עברת שעה! מטורף' : `יעד: ${SESSION_GOAL_MIN} דק׳`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <motion.button
            type="button"
            onClick={onStart}
            disabled={busy}
            aria-label="התחלת אימון"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            className="relative grid place-items-center rounded-full bg-[#d4ff3a] text-black shadow-[0_0_60px_-5px_rgba(212,255,58,0.75)] disabled:opacity-60"
            style={{ width: size * 0.48, height: size * 0.48 }}
          >
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-[#d4ff3a]"
              animate={{ scale: [1, 1.25], opacity: [0.7, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            />
            {busy ? (
              <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-black border-t-transparent" />
            ) : (
              <span className="flex flex-col items-center">
                <Play className="h-10 w-10 fill-current" />
                <span className="mt-1 text-lg font-black">התחלת אימון</span>
              </span>
            )}
          </motion.button>
          <p className="mt-4 text-sm font-bold text-white/60">
            <span className="text-white">{weekMin}</span> / {WEEKLY_GOAL_MIN} דק׳ השבוע
          </p>
        </div>
      )}
    </Ring>
  );
}

function MiniStat({ icon, label, value, hot }: { icon: React.ReactNode; label: string; value: number; hot?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-3xl border p-4 backdrop-blur-xl',
        hot ? 'border-orange-400/30 bg-gradient-to-b from-orange-500/15 to-transparent' : 'border-white/[0.08] bg-white/[0.035]'
      )}
    >
      <span className={cn('grid h-8 w-8 place-items-center rounded-xl', hot ? 'bg-orange-500/20 text-orange-300' : 'bg-white/[0.06] text-white/60')}>
        {icon}
      </span>
      <p className="mt-3 text-3xl font-black tabular-nums leading-none">{value}</p>
      <p className="mt-1.5 text-[11px] font-bold text-white/45">{label}</p>
    </div>
  );
}
