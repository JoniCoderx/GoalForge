import { motion } from 'framer-motion';
import { type ReactNode } from 'react';
import { cn, formatNumber } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon,
  accent = 'brand',
  delay = 0,
  suffix,
  hint,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  accent?: 'brand' | 'sky' | 'violet' | 'amber' | 'rose';
  delay?: number;
  suffix?: string;
  hint?: string;
}) {
  const accents: Record<string, string> = {
    brand: 'text-brand-400 bg-brand-500/10',
    sky: 'text-accent-sky bg-sky-500/10',
    violet: 'text-accent-violet bg-violet-500/10',
    amber: 'text-accent-amber bg-amber-500/10',
    rose: 'text-accent-rose bg-rose-500/10',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card group relative overflow-hidden p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 font-display text-3xl font-semibold text-white">
            {typeof value === 'number' ? formatNumber(value) : value}
            {suffix && <span className="text-lg text-slate-400">{suffix}</span>}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={cn('grid h-11 w-11 place-items-center rounded-xl transition-transform group-hover:scale-110', accents[accent])}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
