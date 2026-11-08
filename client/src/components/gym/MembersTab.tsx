import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Trash2, UserPlus } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { MEMBER_COLORS, MEMBER_EMOJIS, gymApi, type GymMember } from '@/lib/gym';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Avatar, Empty, Panel, SectionTitle } from './shared';

export function MembersTab({ members, meId, onRemoved }: { members: GymMember[]; meId: string | null; onRemoved: (id: string) => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(MEMBER_EMOJIS[0]);
  const [color, setColor] = useState(MEMBER_COLORS[members.length % MEMBER_COLORS.length]);
  const [deleting, setDeleting] = useState<GymMember | null>(null);

  const add = useMutation({
    mutationFn: () => gymApi.addMember({ name: name.trim(), emoji, color }),
    onSuccess: ({ member }) => {
      toast.success(`${member.name} הצטרף/ה! ${member.emoji}`);
      setName('');
      setColor(MEMBER_COLORS[(members.length + 1) % MEMBER_COLORS.length]);
      qc.invalidateQueries({ queryKey: ['gym'] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'ההוספה נכשלה'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => gymApi.removeMember(id),
    onSuccess: (_r, id) => {
      toast.success('החבר/ה הוסר/ה');
      setDeleting(null);
      onRemoved(id);
      qc.invalidateQueries({ queryKey: ['gym'] });
    },
    onError: () => toast.error('ההסרה נכשלה'),
  });

  const preview: GymMember = { id: 'preview', name, emoji, color, createdAt: '' };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Panel>
        <SectionTitle title="הוספת חבר/ה" />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) add.mutate();
          }}
        >
          <div className="flex items-center gap-3">
            <Avatar member={preview} size="lg" />
            <input
              className="input flex-1"
              placeholder="שם"
              aria-label="שם"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <p className="label">אימוג׳י</p>
            <div className="flex flex-wrap gap-2">
              {MEMBER_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={cn('grid h-11 w-11 place-items-center rounded-xl border text-xl transition', emoji === em ? 'border-brand-400/60 bg-brand-500/15' : 'border-white/10 hover:border-white/25')}
                  aria-label={`אימוג׳י ${em}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label">צבע</p>
            <div className="flex flex-wrap gap-2">
              {MEMBER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn('h-10 w-10 rounded-full border-2 transition', color === c ? 'scale-110 border-white' : 'border-transparent')}
                  style={{ background: c }}
                  aria-label={`צבע ${c}`}
                />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" loading={add.isPending} disabled={!name.trim()}>
            <UserPlus className="h-4 w-4" /> הוספה
          </Button>
        </form>
      </Panel>

      <Panel>
        <SectionTitle title="החבר׳ה" subtitle={`${members.length} חברים בקבוצה`} />
        {members.length === 0 ? (
          <Empty icon="👥" title="הקבוצה ריקה" text="הוסיפו את החבר הראשון בטופס." />
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                <Avatar member={m} />
                <span className="flex-1 truncate font-semibold text-white">
                  {m.name}
                  {m.id === meId && <span className="ms-2 rounded-md bg-brand-500/15 px-2 py-0.5 text-xs text-brand-300">אני</span>}
                </span>
                <button
                  type="button"
                  onClick={() => setDeleting(m)}
                  className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
                  aria-label={`הסרת ${m.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="להסיר מהקבוצה?" size="sm">
        {deleting && (
          <div>
            <p className="text-sm text-slate-300">
              {deleting.name} יוסר/תוסר מהקבוצה <strong className="text-white">וכל האימונים שלו/ה יימחקו</strong>. אי אפשר לבטל.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                ביטול
              </Button>
              <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(deleting.id)}>
                הסרה
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
