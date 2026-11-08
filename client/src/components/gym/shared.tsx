import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LIME, type GymMember } from '@/lib/gym';

/* Frosted glass surface used across the gym app. */
export function Card({ children, className, glow }: { children: ReactNode; className?: string; glow?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-6',
        className
      )}
    >
      {glow && (
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-60 blur-[80px]"
          style={{ background: glow }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

export function Avatar({
  member,
  size = 48,
  live,
  ring,
}: {
  member: Pick<GymMember, 'emoji' | 'color'>;
  size?: number;
  live?: boolean;
  ring?: boolean;
}) {
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {live && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: member.color }}
          animate={{ scale: [1, 1.45], opacity: [0.45, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <span
        className="relative grid h-full w-full place-items-center rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 25%, ${member.color}55, ${member.color}18 70%)`,
          boxShadow: ring ? `0 0 0 2px #060708, 0 0 0 4px ${member.color}` : `inset 0 0 0 1px ${member.color}55`,
          fontSize: size * 0.48,
        }}
        aria-hidden="true"
      >
        {member.emoji}
      </span>
    </span>
  );
}

/** Circular progress ring (0–1) with a glowing stroke. */
export function Ring({
  value,
  size = 280,
  stroke = 14,
  color = LIME,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ overflow: 'visible' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {/* Soft halo: a wide translucent copy of the arc — no SVG filter, so
            nothing can clip the glow into a visible box. */}
        {[stroke * 3.2, stroke * 2].map((w, i) => (
          <motion.circle
            key={w}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeOpacity={i === 0 ? 0.07 : 0.12}
            strokeWidth={w}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={false}
            animate={{ strokeDashoffset: c * (1 - v) }}
            transition={{ type: 'spring', damping: 30, stiffness: 60 }}
          />
        ))}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ type: 'spring', damping: 30, stiffness: 60 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <motion.span
        className="text-6xl"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {icon}
      </motion.span>
      <p className="mt-4 text-xl font-extrabold text-white">{title}</p>
      <p className="mt-1.5 max-w-xs text-sm text-white/50">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Big pill button — the gym app's primary action style. */
export function GymButton({
  children,
  onClick,
  variant = 'lime',
  disabled,
  loading,
  type = 'button',
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'lime' | 'red' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const styles = {
    lime: 'bg-[#d4ff3a] text-black shadow-[0_10px_40px_-10px_rgba(212,255,58,0.7)] hover:bg-[#e0ff6b]',
    red: 'bg-[#ff3b5c] text-white shadow-[0_10px_40px_-10px_rgba(255,59,92,0.7)] hover:bg-[#ff5573]',
    ghost: 'border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]',
  }[variant];
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.96 }}
      className={cn(
        'inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-6 text-base font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        styles,
        className
      )}
    >
      {loading ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </motion.button>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <p className="mb-2.5 text-sm font-bold text-white/45">{children}</p>;
}
