import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Lock, Receipt } from 'lucide-react';
import { expensesApi, setExpensesToken, ApiError } from '@/lib/api';
import { LogoMark } from '@/components/brand/Logo';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

export function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const res = await expensesApi.auth(password);
      setExpensesToken(res.token);
      onUnlock();
    } catch (err) {
      setPassword('');
      setError(err instanceof ApiError && err.status !== 401 ? err.message : 'Incorrect password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink-950 px-4">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-grid-glow" />
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 240 }}
        className="glass-strong relative w-full max-w-md rounded-2xl p-8 shadow-card"
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl bg-brand-500/20 blur-xl" />
            <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-ink-900/80">
              <LogoMark className="h-9 w-9" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-semibold text-white">
            GoalForge<span className="text-brand-400"> AI</span>
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
            <Receipt className="h-3.5 w-3.5" /> Expense Tracker
          </p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <Input
            label="Team password"
            type="password"
            name="expenses-password"
            autoComplete="off"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error || undefined}
            placeholder="Enter the team password"
          />
          <Button type="submit" size="lg" loading={loading} disabled={!password} className="w-full">
            <Lock className="h-4 w-4" /> Unlock
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Internal expense tracker — enter the team password.
        </p>
      </motion.div>
    </div>
  );
}
