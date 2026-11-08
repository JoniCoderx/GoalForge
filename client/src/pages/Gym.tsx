import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Timer, Trophy, History, Users, LogOut, type LucideIcon } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { getGymToken, getMe, gymApi, setGymToken, setMe } from '@/lib/gym';
import { cn } from '@/lib/utils';
import { GymPasswordGate } from '@/components/gym/PasswordGate';
import { NowTab } from '@/components/gym/NowTab';
import { WeekTab } from '@/components/gym/WeekTab';
import { HistoryTab } from '@/components/gym/HistoryTab';
import { MembersTab } from '@/components/gym/MembersTab';

type Tab = 'now' | 'week' | 'history' | 'members';
const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'now', label: 'אימון', icon: Timer },
  { key: 'week', label: 'טבלה שבועית', icon: Trophy },
  { key: 'history', label: 'היסטוריה', icon: History },
  { key: 'members', label: 'חברים', icon: Users },
];

export default function Gym() {
  const qc = useQueryClient();
  const [gate, setGate] = useState<'checking' | 'locked' | 'open'>(() => (getGymToken() ? 'checking' : 'locked'));
  const [tab, setTab] = useState<Tab>('now');
  const [meId, setMeId] = useState<string | null>(() => getMe());

  useEffect(() => {
    document.title = 'חדר הכושר של החבר׳ה';
  }, []);

  useEffect(() => {
    if (gate !== 'checking') return;
    gymApi
      .session()
      .then(() => setGate('open'))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) setGymToken(null);
        setGate('locked');
      });
  }, [gate]);

  const { data } = useQuery({
    queryKey: ['gym', 'members'],
    queryFn: gymApi.members,
    enabled: gate === 'open',
  });
  const members = data?.members ?? [];
  const me = members.find((m) => m.id === meId) ?? null;

  const pickMe = (id: string | null) => {
    setMe(id);
    setMeId(id);
  };

  if (gate === 'checking') {
    return <div className="grid min-h-screen place-items-center bg-ink-950 text-slate-500">טוען…</div>;
  }
  if (gate === 'locked') return <GymPasswordGate onUnlock={() => setGate('open')} />;

  return (
    <div dir="rtl" lang="he" className="min-h-screen bg-ink-950 pb-24 text-slate-200 sm:pb-10">
      <div className="pointer-events-none fixed inset-0 bg-grid-glow opacity-50" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500/15 text-2xl">🏋️</span>
            <div>
              <p className="font-display text-lg font-bold leading-tight text-white">חדר הכושר של החבר׳ה</p>
              <p className="text-xs text-slate-500">ספייס · ביג</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setGymToken(null);
              qc.removeQueries({ queryKey: ['gym'] });
              setGate('locked');
            }}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> יציאה
          </button>
        </div>
        {/* Desktop tabs */}
        <nav className="mx-auto hidden max-w-5xl gap-1 px-4 pb-3 sm:flex">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition',
                tab === t.key ? 'text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              {tab === t.key && (
                <motion.span layoutId="gym-tab" className="absolute inset-0 rounded-xl border border-brand-400/30 bg-brand-500/15" />
              )}
              <t.icon className="relative h-4 w-4" />
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {tab === 'now' && <NowTab me={me} members={members} onPickMe={pickMe} onGoMembers={() => setTab('members')} />}
            {tab === 'week' && <WeekTab />}
            {tab === 'history' && <HistoryTab members={members} meId={meId} />}
            {tab === 'members' && (
              <MembersTab members={members} meId={meId} onRemoved={(id) => id === meId && pickMe(null)} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-white/10 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', tab === t.key ? 'text-brand-300' : 'text-slate-500')}
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
