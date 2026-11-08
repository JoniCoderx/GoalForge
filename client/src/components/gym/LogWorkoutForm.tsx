import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ApiError } from '@/lib/api';
import { EQUIPMENT, gymApi, type GymMember } from '@/lib/gym';
import { Button } from '@/components/ui/Button';

const pad = (n: number) => String(n).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function LogWorkoutForm({
  members,
  defaultMemberId,
  onDone,
}: {
  members: GymMember[];
  defaultMemberId?: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [memberId, setMemberId] = useState(defaultMemberId ?? members[0]?.id ?? '');
  const [date, setDate] = useState(today());
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState('60');
  const [equipment, setEquipment] = useState('');
  const [notes, setNotes] = useState('');

  const minutes = Number(duration);
  const startedAt = new Date(`${date}T${time}`);
  const valid =
    !!memberId && Number.isInteger(minutes) && minutes >= 1 && minutes <= 300 && !Number.isNaN(startedAt.getTime());
  const future = valid && startedAt.getTime() > Date.now();

  const save = useMutation({
    mutationFn: () =>
      gymApi.log({
        memberId,
        startedAt: startedAt.toISOString(),
        durationMin: minutes,
        equipment: equipment || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success('האימון נרשם ✅');
      qc.invalidateQueries({ queryKey: ['gym'] });
      onDone();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'השמירה נכשלה'),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !future) save.mutate();
      }}
    >
      <label className="block">
        <span className="label">מי התאמן</span>
        <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.emoji} {m.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">תאריך</span>
          <input type="date" className="input" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">שעת התחלה</span>
          <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <label className="block">
        <span className="label">משך (דקות)</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={300}
          className="input"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="label">ציוד (לא חובה)</span>
        <select className="input" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
          <option value="">—</option>
          {EQUIPMENT.map((e) => (
            <option key={e.key} value={e.key}>
              {e.icon} {e.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">הערה (לא חובה)</span>
        <input className="input" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {!valid && <p className="text-sm text-rose-400">משך האימון צריך להיות בין 1 ל-300 דקות</p>}
      {future && <p className="text-sm text-rose-400">אי אפשר לרשום אימון בעתיד</p>}
      <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
        <Button variant="ghost" onClick={onDone}>
          ביטול
        </Button>
        <Button type="submit" loading={save.isPending} disabled={!valid || future}>
          שמירה
        </Button>
      </div>
    </form>
  );
}
