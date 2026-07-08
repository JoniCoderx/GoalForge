import type { UserPlan, UserStatus } from '@/lib/types';

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export const USER_STATUS_META: Record<UserStatus, { label: string; color: string; dot: string }> = {
  active: { label: 'Active', color: 'text-brand-300 bg-brand-500/10 border-brand-500/20', dot: 'bg-brand-400' },
  trial: { label: 'Trial', color: 'text-sky-300 bg-sky-500/10 border-sky-500/20', dot: 'bg-sky-400' },
  expired: { label: 'Expired', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  banned: { label: 'Banned', color: 'text-rose-300 bg-rose-500/10 border-rose-500/20', dot: 'bg-rose-400' },
};

export const USER_PLAN_META: Record<UserPlan, { label: string; color: string }> = {
  free: { label: 'Free', color: 'text-slate-300 bg-white/5 border-white/10' },
  creator: { label: 'Creator', color: 'text-sky-300 bg-sky-500/10 border-sky-500/20' },
  studio: { label: 'Studio', color: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
};

/** Safe JSON parse for Activity.meta strings. */
export function parseMeta(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
