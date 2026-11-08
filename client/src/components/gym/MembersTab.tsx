import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Trash2, UserPlus } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { GYM_INPUT, MEMBER_COLORS, MEMBER_EMOJIS, gymApi, type GymMember } from '@/lib/gym';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Avatar, Card, Empty, GymButton, Label } from './shared';

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
      toast.success('הוסר/ה מהקבוצה');
      setDeleting(null);
      onRemoved(id);
      qc.invalidateQueries({ queryKey: ['gym'] });
    },
    onError: () => toast.error('ההסרה נכשלה'),
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-white/50">{members.length} בקבוצה</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">החבר׳ה</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <Card glow={`${color}66`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) add.mutate();
            }}
          >
            <div className="flex flex-col items-center">
              <motion.div key={emoji + color} initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
                <Avatar member={{ emoji, color }} size={96} ring />
              </motion.div>
              <p className="mt-3 h-7 text-xl font-black">{name.trim() || 'חבר/ה חדש/ה'}</p>
            </div>
            <input
              className={cn(GYM_INPUT, 'mt-5 text-center text-lg font-bold')}
              placeholder="שם"
              aria-label="שם"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="mt-5">
              <Label>אימוג׳י</Label>
              <div className="grid grid-cols-6 gap-2">
                {MEMBER_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    aria-label={`אימוג׳י ${em}`}
                    className={cn(
                      'grid aspect-square place-items-center rounded-2xl border text-2xl transition',
                      emoji === em ? 'border-[#d4ff3a] bg-[#d4ff3a]/10' : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
                    )}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <Label>צבע</Label>
              <div className="flex flex-wrap gap-2.5">
                {MEMBER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`צבע ${c}`}
                    className={cn('h-10 w-10 rounded-full transition', color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0b0c0e]' : 'opacity-70 hover:opacity-100')}
                    style={{ background: c, boxShadow: color === c ? `0 0 20px ${c}` : undefined }}
                  />
                ))}
              </div>
            </div>
            <GymButton type="submit" loading={add.isPending} disabled={!name.trim()} className="mt-6 h-14 w-full">
              <UserPlus className="h-5 w-5" /> הוספה לקבוצה
            </GymButton>
          </form>
        </Card>

        <Card>
          {members.length === 0 ? (
            <Empty icon="👥" title="הקבוצה ריקה" text="הוסיפו את החבר הראשון." />
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {members.map((m, i) => (
                <motion.li
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative flex flex-col items-center rounded-3xl border border-white/[0.07] p-4 pt-5"
                  style={{ background: `linear-gradient(180deg, ${m.color}14, transparent)` }}
                >
                  <button
                    type="button"
                    onClick={() => setDeleting(m)}
                    className="absolute end-2 top-2 grid h-9 w-9 place-items-center rounded-full text-white/25 transition hover:bg-[#ff3b5c]/10 hover:text-[#ff5573]"
                    aria-label={`הסרת ${m.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Avatar member={m} size={60} />
                  <p className="mt-2.5 max-w-full truncate font-extrabold">{m.name}</p>
                  {m.id === meId && <span className="mt-1 rounded-full bg-[#d4ff3a] px-2.5 py-0.5 text-[10px] font-black text-black">אני</span>}
                </motion.li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="להסיר מהקבוצה?" size="sm">
        {deleting && (
          <div dir="rtl">
            <p className="text-white/70">
              <b className="text-white">{deleting.name}</b> יוסר/תוסר מהקבוצה, <b className="text-[#ff5573]">וכל האימונים שלו/ה יימחקו</b>. אי אפשר לבטל.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <GymButton variant="ghost" onClick={() => setDeleting(null)} className="min-h-[46px] px-5 text-sm">
                ביטול
              </GymButton>
              <GymButton variant="red" loading={remove.isPending} onClick={() => remove.mutate(deleting.id)} className="min-h-[46px] px-5 text-sm">
                הסרה
              </GymButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
