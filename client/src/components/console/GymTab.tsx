import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { consoleApi, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';

/** Merge two gym members that are really the same person. */
export function GymTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['console-gym'], queryFn: consoleApi.gymMembers });
  const members = data?.members ?? [];
  const [fromId, setFrom] = useState('');
  const [intoId, setInto] = useState('');
  const from = members.find((m) => m.id === fromId);
  const into = members.find((m) => m.id === intoId);

  const merge = useMutation({
    mutationFn: () => consoleApi.gymMerge(fromId, intoId),
    onSuccess: (r) => {
      toast.success(`${r.moved} אימונים עברו מ-${r.removed} אל ${r.into}`);
      setFrom('');
      qc.invalidateQueries({ queryKey: ['console-gym'] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Merge failed'),
  });

  const sel = 'h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-white';
  return (
    <div dir="rtl" className="max-w-md space-y-4">
      <h2 className="text-lg font-bold">איחוד משתמשים בחדר כושר</h2>
      <p className="text-sm text-slate-400">כל האימונים של המשתמש הראשון יעברו לשני, והמשתמש הראשון יימחק.</p>
      <label className="block text-sm">
        להעביר את האימונים של
        <select className={sel} value={fromId} onChange={(e) => setFrom(e.target.value)}>
          <option value="">בחר…</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.name} ({m.sessions} אימונים)</option>)}
        </select>
      </label>
      <label className="block text-sm">
        אל
        <select className={sel} value={intoId} onChange={(e) => setInto(e.target.value)}>
          <option value="">בחר…</option>
          {members.filter((m) => m.id !== fromId).map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.name} ({m.sessions} אימונים)</option>)}
        </select>
      </label>
      <Button
        disabled={!from || !into || merge.isPending}
        onClick={() => window.confirm(`להעביר את כל האימונים של ${from?.name} אל ${into?.name} ולמחוק את ${from?.name}?`) && merge.mutate()}
      >
        אחד
      </Button>
    </div>
  );
}
