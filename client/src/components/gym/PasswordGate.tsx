import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { GYM_INPUT, gymApi, setGymToken } from '@/lib/gym';
import { cn } from '@/lib/utils';
import { GymButton } from './shared';

export function GymPasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(0);

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
      setShake((s) => s + 1);
      setError(err instanceof ApiError && err.status === 429 ? 'יותר מדי ניסיונות — נסו שוב בעוד כמה דקות' : 'סיסמה שגויה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-5">
      {/* Hero glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <motion.div
          className="absolute left-1/2 top-[18%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#d4ff3a] opacity-20 blur-[120px]"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute bottom-[-20%] right-[-10%] h-[400px] w-[400px] rounded-full bg-[#00d1ff] opacity-10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 14, stiffness: 180 }}
          className="mx-auto grid h-24 w-24 place-items-center rounded-[30px] bg-[#d4ff3a] text-5xl shadow-[0_0_80px_-10px_rgba(212,255,58,0.8)]"
        >
          🏋️
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <h1 className="mt-8 text-5xl font-black leading-none tracking-tight" dir="ltr">
            SPACE<span className="text-[#d4ff3a]">·</span>GYM
          </h1>
          <p className="mt-4 text-lg font-medium text-white/60">מתאמנים ביחד. מתחרים ביחד. 💪</p>
        </motion.div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, x: shake ? [0, -10, 10, -6, 6, 0] : 0 }}
          transition={{ delay: shake ? 0 : 0.22, duration: shake ? 0.4 : 0.3 }}
          key={shake}
          className="mt-10"
        >
          <input
            type="password"
            name="gym-password"
            inputMode="numeric"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="• • • •"
            aria-label="סיסמת הקבוצה"
            className={cn(GYM_INPUT, 'h-16 text-center text-2xl font-bold tracking-[0.5em]', error && 'border-[#ff3b5c]/60')}
          />
          <p className={cn('mt-3 h-5 text-sm font-medium', error ? 'text-[#ff5573]' : 'text-white/30')}>
            {error || 'הכניסו את סיסמת הקבוצה'}
          </p>
          <GymButton type="submit" loading={loading} disabled={!password} className="mt-4 h-14 w-full text-lg">
            כניסה <ArrowLeft className="h-5 w-5" />
          </GymButton>
        </motion.form>
      </div>
    </div>
  );
}
