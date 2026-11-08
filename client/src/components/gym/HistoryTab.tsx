import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { equipmentLabel, fmtMinutes, fmtTime, gymApi, type GymMember, type GymWorkout } from '@/lib/gym';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar, Card, Empty, GymButton } from './shared';
import { LogWorkoutForm } from './LogWorkoutForm';

function dayHeading(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'היום';
  if (same(d, y)) return 'אתמול';
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function HistoryTab({ members, meId }: { members: GymMember[]; meId: string | null }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [logging, setLogging] = useState(false);
  const [deleting, setDeleting] = useState<GymWorkout | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['gym', 'history', filter],
    queryFn: () => gymApi.history(filter || undefined),
  });
  const workouts = useMemo(() => data?.workouts ?? [], [data]);

  const groups = useMemo(() => {
    const map = new Map<string, GymWorkout[]>();
    for (const w of workouts) {
      const k = new Date(w.startedAt).toDateString();
      map.set(k, [...(map.get(k) ?? []), w]);
    }
    return [...map.values()];
  }, [workouts]);

  const total = workouts.reduce((a, w) => a + w.durationMin, 0);

  const remove = useMutation({
    mutationFn: (id: string) => gymApi.removeWorkout(id),
    onSuccess: () => {
      toast.success('האימון נמחק');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['gym'] });
    },
    onError: () => toast.error('המחיקה נכשלה'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/50">
            {workouts.length} אימונים · {fmtMinutes(total)}
          </p>
          <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">היסטוריה</h1>
        </div>
        <GymButton onClick={() => setLogging(true)} disabled={!members.length} className="min-h-[46px] px-5 text-sm">
          <Plus className="h-4 w-4" /> רישום ידני
        </GymButton>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden">
        {[{ id: '', name: 'כולם', emoji: '👥', color: '#ffffff' }, ...members].map((m) => {
          const on = filter === m.id;
          return (
            <button
              key={m.id || 'all'}
              type="button"
              onClick={() => setFilter(m.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full border py-1.5 pe-4 ps-1.5 text-sm font-bold transition',
                on ? 'border-[#d4ff3a] bg-[#d4ff3a] text-black' : 'border-white/10 bg-white/[0.03] text-white/70 hover:text-white'
              )}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-black/20 text-base">{m.emoji}</span>
              {m.name}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <Card>
          <Empty icon="📭" title="אין אימונים עדיין" text="אחרי שתסיימו אימון — הוא יופיע כאן." />
        </Card>
      ) : (
        <div className="space-y-7">
          {groups.map((g) => (
            <section key={g[0].startedAt}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="text-sm font-black text-white/80">{dayHeading(g[0].startedAt)}</h2>
                <span className="h-px flex-1 bg-white/[0.07]" />
                <span className="text-xs font-bold tabular-nums text-white/35">
                  {fmtMinutes(g.reduce((a, w) => a + w.durationMin, 0))}
                </span>
              </div>
              <ul className="space-y-2.5">
                {g.map((w, i) => (
                  <motion.li
                    key={w.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.2) }}
                    className="group flex items-center gap-3 rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-3 backdrop-blur-xl"
                  >
                    <Avatar member={w.member} size={46} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold">{w.member.name}</p>
                      <p className="truncate text-xs text-white/50">
                        {fmtTime(w.startedAt)}
                        {w.equipment && <> · {equipmentLabel(w.equipment)}</>}
                      </p>
                      {w.notes && <p className="truncate text-xs text-white/35">{w.notes}</p>}
                    </div>
                    <span
                      className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-black tabular-nums"
                      style={{ background: `${w.member.color}22`, color: w.member.color }}
                    >
                      {fmtMinutes(w.durationMin)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeleting(w)}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white/25 transition hover:bg-[#ff3b5c]/10 hover:text-[#ff5573]"
                      aria-label="מחיקת אימון"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal open={logging} onClose={() => setLogging(false)} title="רישום אימון ידני">
        {logging && <LogWorkoutForm members={members} defaultMemberId={meId ?? undefined} onDone={() => setLogging(false)} />}
      </Modal>
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="למחוק את האימון?" size="sm">
        {deleting && (
          <div dir="rtl">
            <p className="text-white/70">
              האימון של <b className="text-white">{deleting.member.name}</b> ({fmtMinutes(deleting.durationMin)}) יימחק לצמיתות.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <GymButton variant="ghost" onClick={() => setDeleting(null)} className="min-h-[46px] px-5 text-sm">
                ביטול
              </GymButton>
              <GymButton variant="red" loading={remove.isPending} onClick={() => remove.mutate(deleting.id)} className="min-h-[46px] px-5 text-sm">
                מחיקה
              </GymButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
