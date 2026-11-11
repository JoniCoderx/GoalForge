import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BarChart3, CalendarDays, Dumbbell, Home as HomeIcon, LogOut, type LucideIcon } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { flushPendingSaves, getGymToken, getStoredMe, gym, saveSession, type GymMember } from '@/lib/gym';
import { cn } from '@/lib/utils';
import { GymAuth } from '@/components/gym/Auth';
import { Home } from '@/components/gym/Home';
import { Plans } from '@/components/gym/Plans';
import { History } from '@/components/gym/History';
import { Stats } from '@/components/gym/Stats';
import { Workout } from '@/components/gym/Workout';
import { Avatar } from '@/components/gym/shared';

type Tab = 'home' | 'plans' | 'history' | 'stats';
const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'home', label: 'בית', icon: HomeIcon },
  { key: 'plans', label: 'תוכניות', icon: Dumbbell },
  { key: 'history', label: 'היסטוריה', icon: CalendarDays },
  { key: 'stats', label: 'התקדמות', icon: BarChart3 },
];

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&display=swap';

/** Head tags that make /gym installable on the iPhone home screen. */
function useGymHead() {
  useEffect(() => {
    const added: HTMLElement[] = [];
    const add = (tag: 'link' | 'meta', attrs: Record<string, string>) => {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      el.dataset.gym = '1';
      document.head.appendChild(el);
      added.push(el);
    };
    add('link', { rel: 'stylesheet', href: FONT_HREF });
    add('link', { rel: 'manifest', href: '/gym.webmanifest' });
    add('link', { rel: 'apple-touch-icon', href: '/gym-icon-180.png' });
    add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
    add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' });
    add('meta', { name: 'apple-mobile-web-app-title', content: 'Gym' });
    add('meta', { name: 'theme-color', content: '#0a0b0d' });
    const prevTitle = document.title;
    const prevBg = document.body.style.backgroundColor;
    document.title = 'GYM·LOG';
    document.body.style.backgroundColor = '#0a0b0d';
    return () => {
      added.forEach((el) => el.remove());
      document.title = prevTitle;
      document.body.style.backgroundColor = prevBg;
    };
  }, []);
}

export default function Gym() {
  useGymHead();
  const qc = useQueryClient();
  const [me, setMe] = useState<GymMember | null>(() => (getGymToken() ? getStoredMe() : null));
  const [tab, setTab] = useState<Tab>('home');
  const [planKey, setPlanKey] = useState<'A' | 'B'>('A');
  const [workoutOpen, setWorkoutOpen] = useState(false);

  const signOut = useCallback(async () => {
    // Finish any pending workout saves while the token is still valid.
    await flushPendingSaves();
    saveSession(null, null);
    qc.removeQueries({ queryKey: ['gym'] });
    setMe(null);
    setWorkoutOpen(false);
    setTab('home');
  }, [qc]);

  useEffect(() => {
    // Token already rejected by the server: just clear local state.
    const onOut = () => {
      saveSession(null, null);
      qc.removeQueries({ queryKey: ['gym'] });
      setMe(null);
      setWorkoutOpen(false);
      setTab('home');
    };
    window.addEventListener('gym:signed-out', onOut);
    return () => window.removeEventListener('gym:signed-out', onOut);
  }, [qc]);

  const enabled = !!me;
  const { data: plansData } = useQuery({ queryKey: ['gym', 'plans'], queryFn: gym.plans, enabled });
  const { data: activeData, isFetched: activeChecked } = useQuery({ queryKey: ['gym', 'active'], queryFn: gym.activeSession, enabled });
  const { data: membersData } = useQuery({ queryKey: ['gym', 'members'], queryFn: gym.members, enabled });
  const plans = plansData?.plans ?? [];
  const active = activeData?.session ?? null;

  // Reopen an interrupted workout straight away (e.g. the app was closed mid-set).
  useEffect(() => {
    if (activeChecked && active) setWorkoutOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChecked]);

  const start = useMutation({
    mutationFn: (key: 'A' | 'B') => gym.startSession(key),
    onSuccess: ({ session, resumed }) => {
      qc.setQueryData(['gym', 'active'], { session });
      if (resumed) toast('ממשיכים את האימון הפתוח', { icon: '▶️' });
      setWorkoutOpen(true);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'לא הצלחנו להתחיל'),
  });

  const root = 'min-h-[100dvh] bg-[#0a0b0d] text-white antialiased [-webkit-tap-highlight-color:transparent]';
  const font = { fontFamily: "'Rubik', -apple-system, system-ui, sans-serif" };

  if (!me) {
    return (
      <div dir="rtl" lang="he" className={root} style={font}>
        <GymAuth onSignedIn={(m) => setMe(m)} />
      </div>
    );
  }

  return (
    <div dir="rtl" lang="he" className={root} style={font}>
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(212,255,58,0.10),transparent_70%)]" />

      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-[#0a0b0d]/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2.5">
          <span className="text-[17px] font-black tracking-tight" dir="ltr">
            GYM<span className="text-[#d4ff3a]">·</span>LOG
          </span>
          <div className="flex items-center gap-2">
            <Avatar member={me} size={32} />
            <button type="button" onClick={() => void signOut()} aria-label="התנתקות" className="grid h-9 w-9 place-items-center rounded-full text-white/40 active:bg-white/10">
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-lg px-4 pb-[calc(110px+env(safe-area-inset-bottom))] pt-2">
        {/* Enter-only animation: an exit-wait here could stall tab switches. */}
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.16 }}>
            {tab === 'home' && (
              <Home
                me={me}
                plans={plans}
                active={active}
                starting={start.isPending}
                onStart={(k) => start.mutate(k)}
                onResume={() => setWorkoutOpen(true)}
                onOpenPlan={(k) => {
                  setPlanKey(k);
                  setTab('plans');
                }}
                onOpenHistory={() => setTab('history')}
              />
            )}
            {tab === 'plans' && <Plans plans={plans} planKey={planKey} onPlanKey={setPlanKey} />}
            {tab === 'history' && <History me={me} members={membersData?.members ?? [me]} />}
            {tab === 'stats' && <Stats me={me} />}
        </motion.div>
      </main>

      {/* Tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.07] bg-[#0a0b0d]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn('flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-semibold', tab === t.key ? 'text-[#d4ff3a]' : 'text-white/45')}
            >
              <t.icon className="h-6 w-6" strokeWidth={tab === t.key ? 2.4 : 2} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* The workout stays MOUNTED for as long as it's active — "בית" only
          slides it away. Unmounting it lost unsaved input and rebuilt the
          screen from stale data, which then overwrote saved sets. */}
      {active && (
        <motion.div
          key={active.id}
          className="fixed inset-0 z-40"
          initial={{ y: '100%', visibility: 'hidden' }}
          animate={
            workoutOpen
              ? { y: 0, visibility: 'visible' }
              : { y: '100%', transitionEnd: { visibility: 'hidden' } }
          }
          transition={{ type: 'spring', damping: 34, stiffness: 320 }}
          style={{ pointerEvents: workoutOpen ? 'auto' : 'none' }}
          aria-hidden={!workoutOpen}
        >
          <Workout
            sessionId={active.id}
            visible={workoutOpen}
            onMinimize={() => setWorkoutOpen(false)}
            onEnded={() => {
              setWorkoutOpen(false);
              qc.setQueryData(['gym', 'active'], { session: null });
              setTab('home');
            }}
          />
        </motion.div>
      )}
    </div>
  );
}
