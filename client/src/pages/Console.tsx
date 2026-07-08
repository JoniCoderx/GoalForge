import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { LayoutDashboard, Users, Ticket, Activity, Lock, type LucideIcon } from 'lucide-react';
import { consoleApi, getConsoleToken, setConsoleToken, ApiError } from '@/lib/api';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { PasswordGate } from '@/components/console/PasswordGate';
import { OverviewTab } from '@/components/console/OverviewTab';
import { UsersTab } from '@/components/console/UsersTab';
import { CouponsTab } from '@/components/console/CouponsTab';
import { ActivityTab } from '@/components/console/ActivityTab';

type TabKey = 'overview' | 'users' | 'coupons' | 'activity';

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'coupons', label: 'Coupons', icon: Ticket },
  { key: 'activity', label: 'Activity', icon: Activity },
];

type GateState = 'checking' | 'locked' | 'unlocked';

function CheckingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950">
      <div className="flex flex-col items-center gap-4">
        <span
          className="h-10 w-10 rounded-full border-2 border-brand-500/30 border-t-brand-400 animate-spin"
          role="status"
          aria-label="Verifying access"
        />
        <p className="text-sm text-slate-500">Verifying access…</p>
      </div>
    </div>
  );
}

export default function Console() {
  const qc = useQueryClient();
  const [gate, setGate] = useState<GateState>(() => (getConsoleToken() ? 'checking' : 'locked'));
  const [tab, setTab] = useState<TabKey>('overview');

  // Validate an existing token on mount.
  useEffect(() => {
    let cancelled = false;
    if (gate !== 'checking') return;
    consoleApi
      .session()
      .then(() => {
        if (!cancelled) setGate('unlocked');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) setConsoleToken(null);
        setGate('locked');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lock = () => {
    setConsoleToken(null);
    qc.removeQueries({ queryKey: ['console-metrics'] });
    qc.removeQueries({ queryKey: ['console-users'] });
    qc.removeQueries({ queryKey: ['console-coupons'] });
    qc.removeQueries({ queryKey: ['console-activity'] });
    setGate('locked');
    setTab('overview');
    toast.success('Locked');
  };

  if (gate === 'checking') return <CheckingScreen />;
  if (gate === 'locked') return <PasswordGate onUnlock={() => setGate('unlocked')} />;

  return (
    <div className="min-h-screen bg-ink-950 text-slate-200">
      <div className="pointer-events-none fixed inset-0 bg-grid-glow opacity-60" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo to="/users" />
            <span className="hidden h-5 w-px bg-white/10 sm:block" />
            <span className="hidden text-sm font-medium text-slate-400 sm:block">Owner Console</span>
          </div>
          <Button variant="secondary" size="sm" onClick={lock}>
            <Lock className="h-4 w-4" /> Lock
          </Button>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
        {/* Tab bar */}
        <div className="mb-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="card inline-flex min-w-max gap-1 p-1">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                    active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="console-tab"
                      className="absolute inset-0 rounded-xl border border-brand-400/30 bg-brand-500/15"
                      transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                    />
                  )}
                  <t.icon className="relative z-10 h-4 w-4" />
                  <span className="relative z-10">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'overview' && <OverviewTab />}
            {tab === 'users' && <UsersTab />}
            {tab === 'coupons' && <CouponsTab />}
            {tab === 'activity' && <ActivityTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
