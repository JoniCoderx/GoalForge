import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, History, Play } from 'lucide-react';
import { fmtClock, gym, relativeDay, type GymMember, type Plan, type Session } from '@/lib/gym';
import { useNow } from '@/lib/useNow';
import { Avatar, Card, GymButton, SectionLabel, Sheet } from './shared';
import { PushCard } from './PushCard';

export function Home({
  me,
  plans,
  active,
  starting,
  onStart,
  onResume,
  onOpenPlan,
  onOpenHistory,
}: {
  me: GymMember;
  plans: Plan[];
  active: Session | null;
  starting: boolean;
  onStart: (key: 'A' | 'B') => void;
  onResume: () => void;
  onOpenPlan: (key: 'A' | 'B') => void;
  onOpenHistory: () => void;
}) {
  const now = useNow(1000);
  const [choosing, setChoosing] = useState(false);
  const { data } = useQuery({ queryKey: ['gym', 'overview'], queryFn: gym.overview });
  const rows = data?.members ?? [];
  const mine = rows.find((r) => r.member.id === me.id);
  const others = rows.filter((r) => r.member.id !== me.id);

  return (
    <div>
      <p className="text-[15px] text-white/50">{new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      <h1 className="mt-0.5 text-[34px] font-black leading-tight">היי {me.name} 👋</h1>

      {/* Primary action */}
      {active ? (
        <motion.button
          type="button"
          onClick={onResume}
          whileTap={{ scale: 0.98 }}
          className="mt-6 flex w-full items-center gap-4 rounded-[28px] bg-[#d4ff3a] p-5 text-start text-black shadow-[0_16px_50px_-18px_rgba(212,255,58,0.8)]"
        >
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-black/10">
            <span className="h-3 w-3 animate-pulse rounded-full bg-black" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-bold opacity-70">{active.planName} בעיצומו</span>
            <span className="block text-2xl font-black tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
              {fmtClock(now - new Date(active.startedAt).getTime())}
            </span>
          </span>
          <span className="flex items-center gap-1 text-lg font-black">
            המשך <ChevronLeft className="h-5 w-5" />
          </span>
        </motion.button>
      ) : (
        <motion.button
          type="button"
          onClick={() => setChoosing(true)}
          whileTap={{ scale: 0.98 }}
          className="mt-6 flex h-[88px] w-full items-center justify-center gap-3 rounded-[28px] bg-[#d4ff3a] text-2xl font-black text-black shadow-[0_16px_50px_-18px_rgba(212,255,58,0.8)]"
        >
          <Play className="h-7 w-7 fill-current" /> התחלת אימון
        </motion.button>
      )}

      <PushCard />

      {/* The crew: this week + last workout, one card per person */}
      <SectionLabel>החבר׳ה</SectionLabel>
      {rows.length === 0 ? (
        <div className="space-y-2.5">
          {[0, 1].map((i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-[24px] bg-white/[0.04]" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {[...(mine ? [mine] : []), ...others].map((r) => {
            const isMe = r.member.id === me.id;
            return (
              <Card key={r.member.id} className="flex items-center gap-3.5 py-3.5">
                <Avatar member={r.member} size={46} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-bold">{isMe ? 'אני' : r.member.name}</p>
                  <p className="truncate text-[14px] text-white/50">
                    {r.last ? (
                      <>
                        אחרון: {relativeDay(r.last.startedAt)} · אימון {r.last.planKey}
                      </>
                    ) : (
                      'עוד לא התאמן'
                    )}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[26px] font-black leading-none tabular-nums" style={{ color: r.week ? r.member.color : 'rgba(255,255,255,0.3)' }}>
                    {r.week}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-white/40">השבוע</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Programs */}
      <SectionLabel>תוכניות האימון</SectionLabel>
      <div className="grid grid-cols-2 gap-3">
        {plans.length === 0 &&
          [0, 1].map((i) => <div key={i} className="h-[112px] animate-pulse rounded-[24px] bg-white/[0.04]" />)}
        {plans.map((p) => (
          <Card key={p.key} onClick={() => onOpenPlan(p.key)} className="min-h-[112px]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.08] text-xl font-black">{p.key}</span>
            <p className="mt-3 truncate text-[17px] font-bold">{p.name}</p>
            <p className="text-[13px] text-white/45">{p.exercises.length} תרגילים</p>
          </Card>
        ))}
      </div>

      {/* Quick access */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <GymButton variant="soft" onClick={onOpenHistory}>
          <History className="h-5 w-5" /> היסטוריה
        </GymButton>
        <GymButton variant="soft" onClick={onOpenHistory}>
          <CalendarDays className="h-5 w-5" /> לוח שנה
        </GymButton>
      </div>

      <Sheet open={choosing} onClose={() => setChoosing(false)} title="איזה אימון היום?">
        <div className="space-y-3">
          {plans.map((p) => (
            <motion.button
              key={p.key}
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={starting}
              onClick={() => {
                setChoosing(false);
                onStart(p.key);
              }}
              className="flex w-full items-center gap-4 rounded-3xl bg-white/[0.06] p-4 text-start disabled:opacity-50"
            >
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#d4ff3a] text-3xl font-black text-black">{p.key}</span>
              <span className="flex-1">
                <span className="block text-xl font-bold">{p.name}</span>
                <span className="block text-[15px] text-white/50">
                  {p.exercises.length ? `${p.exercises.length} תרגילים` : 'אין עדיין תרגילים — אפשר להוסיף בלשונית תוכניות'}
                </span>
              </span>
              <ChevronLeft className="h-6 w-6 text-white/40" />
            </motion.button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
