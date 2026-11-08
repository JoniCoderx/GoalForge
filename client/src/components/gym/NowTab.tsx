import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Play, Square, PenLine, Repeat } from 'lucide-react';
import { ApiError } from '@/lib/api';
import {
  EQUIPMENT,
  equipmentLabel,
  fmtClock,
  fmtMinutes,
  fmtTime,
  gymApi,
  type GymMember,
} from '@/lib/gym';
import { useNow } from '@/lib/useNow';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Avatar, Empty, Panel, SectionTitle } from './shared';
import { LogWorkoutForm } from './LogWorkoutForm';

const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'משהו השתבש, נסו שוב');

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
  const [equipment, setEquipment] = useState('');
  const [notes, setNotes] = useState('');
  const [logging, setLogging] = useState(false);

  const { data } = useQuery({
    queryKey: ['gym', 'active'],
    queryFn: gymApi.active,
    refetchInterval: 5000,
  });
  const active = data?.workouts ?? [];
  const mine = me ? active.find((w) => w.memberId === me.id) : undefined;

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
      <Empty
        icon="👋"
        title="עוד אין חברים בקבוצה"
        text="תוסיפו את עצמכם ואת החברים — ואז אפשר להתחיל להתאמן ולעקוב."
        action={<Button onClick={onGoMembers}>הוספת חברים</Button>}
      />
    );
  }

  if (!me) {
    return (
      <Panel>
        <SectionTitle title="מי מתאמן?" subtitle="בחרו את עצמכם — נזכור אתכם במכשיר הזה" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onPickMe(m.id)}
              className="card flex items-center gap-3 p-4 text-start transition hover:border-white/25 hover:bg-white/[0.04]"
            >
              <Avatar member={m} />
              <span className="truncate font-semibold text-white">{m.name}</span>
            </button>
          ))}
        </div>
      </Panel>
    );
  }

  const elapsed = mine ? now - new Date(mine.startedAt).getTime() : 0;
  const others = active.filter((w) => w.memberId !== me.id);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Timer card */}
      <Panel className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-24 start-1/2 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: `${me.color}${mine ? '40' : '20'}` }}
        />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar member={me} size="lg" />
            <div>
              <p className="text-sm text-slate-400">שלום,</p>
              <p className="font-display text-2xl font-bold text-white">{me.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onPickMe(null)}>
            <Repeat className="h-4 w-4" /> החלפה
          </Button>
        </div>

        <div className="relative mt-8 text-center">
          <p className="text-sm font-medium text-slate-400">{mine ? 'אימון פעיל' : 'מוכנים?'}</p>
          <motion.p
            key={mine ? 'live' : 'idle'}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              'mt-1 font-display text-7xl font-bold tabular-nums sm:text-8xl',
              mine ? 'text-white' : 'text-slate-600'
            )}
            dir="ltr"
          >
            {fmtClock(elapsed)}
          </motion.p>
          {mine && (
            <p className="mt-2 text-sm text-slate-400">
              התחלת ב-{fmtTime(mine.startedAt)}
              {mine.equipment && <> · {equipmentLabel(mine.equipment)}</>}
            </p>
          )}
        </div>

        {mine ? (
          <div className="relative mt-8 space-y-3">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              placeholder="הערה לאימון (לא חובה) — למשל: חזה + כתפיים"
              aria-label="הערה לאימון"
              className="input"
            />
            <Button
              variant="danger"
              size="lg"
              className="w-full text-lg"
              loading={stop.isPending}
              onClick={() => stop.mutate()}
            >
              <Square className="h-5 w-5" /> סיום אימון
            </Button>
          </div>
        ) : (
          <div className="relative mt-8">
            <p className="mb-2 text-sm text-slate-400">על מה מתאמנים? (לא חובה)</p>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT.map((e) => (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => setEquipment(equipment === e.key ? '' : e.key)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-sm transition',
                    equipment === e.key
                      ? 'border-brand-400/50 bg-brand-500/15 text-white'
                      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20'
                  )}
                >
                  {e.icon} {e.label}
                </button>
              ))}
            </div>
            <Button size="lg" className="mt-6 w-full text-lg" loading={start.isPending} onClick={() => start.mutate()}>
              <Play className="h-5 w-5" /> התחלת אימון
            </Button>
            <button
              type="button"
              onClick={() => setLogging(true)}
              className="mx-auto mt-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
            >
              <PenLine className="h-4 w-4" /> שכחתי להפעיל — רישום ידני
            </button>
          </div>
        )}
      </Panel>

      {/* Live friends */}
      <Panel>
        <SectionTitle title="מתאמנים עכשיו" subtitle={others.length ? `${others.length} בחדר` : undefined} />
        {others.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">אף אחד אחר לא מתאמן כרגע 😴</p>
        ) : (
          <ul className="space-y-3">
            {others.map((w) => (
              <li key={w.id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                <Avatar member={w.member} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{w.member.name}</p>
                  <p className="truncate text-xs text-slate-400">
                    {w.equipment ? equipmentLabel(w.equipment) : 'אימון'} · מ-{fmtTime(w.startedAt)}
                  </p>
                </div>
                <span className="flex items-center gap-2 font-mono text-sm tabular-nums text-brand-300" dir="ltr">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
                  {fmtClock(now - new Date(w.startedAt).getTime())}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal open={logging} onClose={() => setLogging(false)} title="רישום אימון ידני">
        {logging && <LogWorkoutForm members={members} defaultMemberId={me.id} onDone={() => setLogging(false)} />}
      </Modal>
    </div>
  );
}
