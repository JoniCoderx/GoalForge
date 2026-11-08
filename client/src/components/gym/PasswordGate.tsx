import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ApiError } from '@/lib/api';
import { gymApi, setGymToken } from '@/lib/gym';
import { Button } from '@/components/ui/Button';

export function GymPasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const { token } = await gymApi.auth(password);
      setGymToken(token);
      onUnlock();
    } catch (err) {
      setPassword('');
      setError(err instanceof ApiError && err.status === 429 ? 'יותר מדי ניסיונות, נסו שוב בעוד כמה דקות' : 'סיסמה שגויה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="relative grid min-h-screen place-items-center overflow-hidden bg-ink-950 px-4">
      <div className="pointer-events-none absolute inset-0 bg-grid-glow" />
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card relative w-full max-w-sm p-7 text-center"
      >
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-brand-500/15 text-4xl">🏋️</div>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">חדר הכושר של החבר׳ה</h1>
        <p className="mt-1 text-sm text-slate-400">הכניסו את סיסמת הקבוצה כדי להמשיך</p>
        <input
          type="password"
          name="gym-password"
          inputMode="numeric"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="סיסמה"
          aria-label="סיסמה"
          className="input mt-6 text-center text-lg tracking-widest"
        />
        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
        <Button type="submit" size="lg" loading={loading} className="mt-4 w-full">
          כניסה
        </Button>
      </motion.form>
    </div>
  );
}
