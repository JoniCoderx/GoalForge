import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { GymMember } from '@/lib/gym';

export function Avatar({ member, size = 'md' }: { member: GymMember; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'h-8 w-8 text-base', md: 'h-11 w-11 text-xl', lg: 'h-16 w-16 text-3xl' }[size];
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-2xl border', dims)}
      style={{ background: `${member.color}22`, borderColor: `${member.color}55` }}
      aria-hidden="true"
    >
      {member.emoji}
    </span>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('card p-5 sm:p-6', className)}>{children}</div>;
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="mt-3 font-semibold text-white">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-400">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, accent = '#22c55e' }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="card relative overflow-hidden p-4">
      <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: accent }} />
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}
