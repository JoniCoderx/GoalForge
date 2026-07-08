import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  Lock,
  Download,
  FileJson,
  type LucideIcon,
} from 'lucide-react';
import { expensesApi, getExpensesToken, setExpensesToken, ApiError } from '@/lib/api';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { PasswordGate } from '@/components/expenses/PasswordGate';
import { DashboardTab } from '@/components/expenses/DashboardTab';
import { ProjectsTab } from '@/components/expenses/ProjectsTab';
import { ExpensesTab } from '@/components/expenses/ExpensesTab';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';

type TabKey = 'dashboard' | 'projects' | 'expenses';

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'expenses', label: 'Expenses', icon: Receipt },
];

type GateState = 'checking' | 'locked' | 'unlocked';

function CheckingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950">
      <div className="flex flex-col items-center gap-4">
        <span
          className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-400"
          role="status"
          aria-label="Verifying access"
        />
        <p className="text-sm text-slate-500">Verifying access…</p>
      </div>
    </div>
  );
}

export default function Expenses() {
  const qc = useQueryClient();
  const [gate, setGate] = useState<GateState>(() => (getExpensesToken() ? 'checking' : 'locked'));
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [addingExpense, setAddingExpense] = useState(false);
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null);

  // Validate an existing token on mount.
  useEffect(() => {
    let cancelled = false;
    if (gate !== 'checking') return;
    expensesApi
      .session()
      .then(() => {
        if (!cancelled) setGate('unlocked');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) setExpensesToken(null);
        setGate('locked');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lock = () => {
    setExpensesToken(null);
    qc.removeQueries({ queryKey: ['exp-dashboard'] });
    qc.removeQueries({ queryKey: ['exp-projects'] });
    qc.removeQueries({ queryKey: ['exp-expenses'] });
    qc.removeQueries({ queryKey: ['exp-categories'] });
    qc.removeQueries({ queryKey: ['exp-project'] });
    setGate('locked');
    setTab('dashboard');
    toast.success('Locked');
  };

  const runExport = async (kind: 'csv' | 'json') => {
    setExporting(kind);
    try {
      if (kind === 'csv') await expensesApi.exportCsv();
      else await expensesApi.exportJson();
      toast.success(kind === 'csv' ? 'CSV downloaded' : 'JSON downloaded');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  if (gate === 'checking') return <CheckingScreen />;
  if (gate === 'locked') return <PasswordGate onUnlock={() => setGate('unlocked')} />;

  return (
    <div className="min-h-screen bg-ink-950 text-slate-200">
      <div className="pointer-events-none fixed inset-0 bg-grid-glow opacity-60" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo to="/expenses" />
            <span className="hidden h-5 w-px bg-white/10 sm:block" />
            <span className="hidden text-sm font-medium text-slate-400 sm:block">Expense Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" loading={exporting === 'csv'} onClick={() => runExport('csv')}>
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button variant="ghost" size="sm" loading={exporting === 'json'} onClick={() => runExport('json')}>
              <FileJson className="h-4 w-4" /> <span className="hidden sm:inline">JSON</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={lock}>
              <Lock className="h-4 w-4" /> <span className="hidden sm:inline">Lock</span>
            </Button>
          </div>
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
                      layoutId="expenses-tab"
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
            {tab === 'dashboard' && <DashboardTab onAddExpense={() => setAddingExpense(true)} />}
            {tab === 'projects' && <ProjectsTab />}
            {tab === 'expenses' && <ExpensesTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global add-expense (used by the dashboard empty state) */}
      <Modal open={addingExpense} onClose={() => setAddingExpense(false)} title="Add expense" size="lg">
        {addingExpense && <ExpenseForm onClose={() => setAddingExpense(false)} />}
      </Modal>
    </div>
  );
}
