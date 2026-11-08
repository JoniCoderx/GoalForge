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
import { Avatar } from '@/components/gym/shared';

type Tab = 'now' | 'week' | 'history' | 'members';
const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'now', label: 'אימון', icon: Timer },
  { key: 'week', label: 'דירוג', icon: Trophy },
  { key: 'history', label: 'היסטוריה', icon: History },
  { key: 'members', label: 'חבר׳ה', icon: Users },
];

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;800;900&display=swap';

/** Load the Hebrew display font once, only for this app. */
function useRubik() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);
}

export function GymBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#d4ff3a] opacity-[0.10] blur-[120px]"
        animate={{ x: [0, -60, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-48 -left-40 h-[560px] w-[560px] rounded-full bg-[#00d1ff] opacity-[0.08] blur-[130px]"
        animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)',
        }}
      />
    </div>
  );
}

export default function Gym() {
  useRubik();
  const qc = useQueryClient();
  const [gate, setGate] = useState<'checking' | 'locked' | 'open'>(() => (getGymToken() ? 'checking' : 'locked'));
  const [tab, setTab] = useState<Tab>('now');
  const [meId, setMeId] = useState<string | null>(() => getMe());

  useEffect(() => {
    document.title = 'SPACE GYM · החבר׳ה';
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

  const { data } = useQuery({ queryKey: ['gym', 'members'], queryFn: gymApi.members, enabled: gate === 'open' });
  const members = data?.members ?? [];
  const me = members.find((m) => m.id === meId) ?? null;

  const pickMe = (id: string | null) => {
    setMe(id);
    setMeId(id);
  };

  const root = 'min-h-screen bg-[#060708] text-white antialiased';
  const font = { fontFamily: "'Rubik', system-ui, sans-serif" };

  if (gate === 'checking') {
    return (
      <div dir="rtl" className={cn(root, 'grid place-items-center')} style={font}>
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#d4ff3a]/30 border-t-[#d4ff3a]" />
      </div>
    );
  }
  if (gate === 'locked') {
    return (
      <div dir="rtl" lang="he" className={root} style={font}>
        <GymPasswordGate onUnlock={() => setGate('open')} />
      </div>
    );
  }

  return (
    <div dir="rtl" lang="he" className={cn(root, 'pb-32')} style={font}>
      <GymBackdrop />

      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#060708]/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d4ff3a] text-xl font-black text-black shadow-[0_0_30px_-5px_rgba(212,255,58,0.6)]">
              S
            </span>
            <div className="leading-none">
              <p className="text-lg font-black tracking-tight" dir="ltr">
                SPACE<span className="text-[#d4ff3a]">·</span>GYM
              </p>
              <p className="mt-1 text-xs font-medium text-white/40">החבר׳ה · ביג</p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 sm:flex">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors',
                  tab === t.key ? 'text-black' : 'text-white/60 hover:text-white'
                )}
              >
                {tab === t.key && (
                  <motion.span layoutId="gym-tab-d" className="absolute inset-0 rounded-full bg-[#d4ff3a]" transition={{ type: 'spring', damping: 26, stiffness: 320 }} />
                )}
                <t.icon className="relative h-4 w-4" />
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {me && (
              <button type="button" onClick={() => setTab('now')} className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pe-3 ps-1 sm:flex">
                <Avatar member={me} size={30} />
                <span className="text-sm font-bold">{me.name}</span>
              </button>
            )}
            <button
              type="button"
              aria-label="יציאה"
              onClick={() => {
                setGymToken(null);
                qc.removeQueries({ queryKey: ['gym'] });
                setGate('locked');
              }}
              className="grid h-10 w-10 place-items-center rounded-full text-white/40 transition hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {tab === 'now' && <NowTab me={me} members={members} onPickMe={pickMe} onGoMembers={() => setTab('members')} />}
            {tab === 'week' && <WeekTab meId={meId} />}
            {tab === 'history' && <HistoryTab members={members} meId={meId} />}
            {tab === 'members' && <MembersTab members={members} meId={meId} onRemoved={(id) => id === meId && pickMe(null)} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating mobile tab bar */}
      <nav className="fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 grid grid-cols-4 rounded-[26px] border border-white/10 bg-[#111316]/85 p-1.5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn('relative flex flex-col items-center gap-1 rounded-[20px] py-2.5 text-[11px] font-bold transition-colors', tab === t.key ? 'text-black' : 'text-white/50')}
          >
            {tab === t.key && (
              <motion.span layoutId="gym-tab-m" className="absolute inset-0 rounded-[20px] bg-[#d4ff3a]" transition={{ type: 'spring', damping: 26, stiffness: 320 }} />
            )}
            <t.icon className="relative h-5 w-5" />
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
