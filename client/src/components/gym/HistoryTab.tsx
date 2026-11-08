import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { equipmentLabel, fmtDate, fmtMinutes, fmtTime, gymApi, type GymMember, type GymWorkout } from '@/lib/gym';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar, Empty, Panel, SectionTitle } from './shared';
import { LogWorkoutForm } from './LogWorkoutForm';

export function HistoryTab({ members, meId }: { members: GymMember[]; meId: string | null }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [logging, setLogging] = useState(false);
  const [deleting, setDeleting] = useState<GymWorkout | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['gym', 'history', filter],
    queryFn: () => gymApi.history(filter || undefined),
  });
  const workouts = data?.workouts ?? [];

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
    <Panel>
      <SectionTitle
        title="היסטוריית אימונים"
        subtitle="200 האימונים האחרונים"
        action={
          <Button size="sm" onClick={() => setLogging(true)} disabled={!members.length}>
            <Plus className="h-4 w-4" /> רישום ידני
          </Button>
        }
      />

      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {[{ id: '', name: 'כולם', emoji: '👥' }, ...members].map((m) => (
          <button
            key={m.id || 'all'}
            type="button"
            onClick={() => setFilter(m.id)}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition',
              filter === m.id ? 'border-brand-400/50 bg-brand-500/15 text-white' : 'border-white/10 text-slate-400 hover:text-white'
            )}
          >
            {m.emoji} {m.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <Empty icon="📭" title="אין אימונים עדיין" text="אחרי שתסיימו אימון הוא יופיע כאן." />
      ) : (
        <ul className="space-y-2">
          {workouts.map((w) => (
            <li key={w.id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
              <Avatar member={w.member} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">
                  {w.member.name}
                  {w.equipment && <span className="font-normal text-slate-400"> · {equipmentLabel(w.equipment)}</span>}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {fmtDate(w.startedAt)} · {fmtTime(w.startedAt)}
                  {w.notes && <> · {w.notes}</>}
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-white/5 px-2.5 py-1 text-sm font-semibold tabular-nums text-white">
                {fmtMinutes(w.durationMin)}
              </span>
              <button
                type="button"
                onClick={() => setDeleting(w)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
                aria-label="מחיקת אימון"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={logging} onClose={() => setLogging(false)} title="רישום אימון ידני">
        {logging && <LogWorkoutForm members={members} defaultMemberId={meId ?? undefined} onDone={() => setLogging(false)} />}
      </Modal>
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="למחוק את האימון?" size="sm">
        {deleting && (
          <div>
            <p className="text-sm text-slate-300">
              האימון של {deleting.member.name} מ-{fmtDate(deleting.startedAt)} ({fmtMinutes(deleting.durationMin)}) יימחק לצמיתות.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                ביטול
              </Button>
              <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(deleting.id)}>
                מחיקה
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Panel>
  );
}
