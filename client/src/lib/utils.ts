import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function formatDuration(sec: number): string {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}:${String(rem).padStart(2, '0')}` : `0:${String(rem).padStart(2, '0')}`;
}

export const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT: { label: 'Draft', color: 'text-slate-300 bg-white/5 border-white/10', dot: 'bg-slate-400' },
  QUEUED: { label: 'Queued', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  RENDERING: { label: 'Rendering', color: 'text-sky-300 bg-sky-500/10 border-sky-500/20', dot: 'bg-sky-400' },
  READY: { label: 'Ready', color: 'text-brand-300 bg-brand-500/10 border-brand-500/20', dot: 'bg-brand-400' },
  FAILED: { label: 'Failed', color: 'text-rose-300 bg-rose-500/10 border-rose-500/20', dot: 'bg-rose-400' },
};

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadUrl(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
