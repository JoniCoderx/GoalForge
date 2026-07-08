import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-white/10', className)}>
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-sky"
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ ease: 'easeOut', duration: 0.4 }}
      />
    </div>
  );
}

export function CircularProgress({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={4} className="stroke-white/10" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={4}
        strokeLinecap="round"
        className="stroke-brand-400 transition-all duration-500"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  );
}
