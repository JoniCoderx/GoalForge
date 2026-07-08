import type { ExpenseStatus, RecurringFrequency } from '@/lib/types';

/* ─────────────── Query keys (shared so invalidation stays consistent) ─────────────── */

export const QK = {
  dashboard: ['exp-dashboard'] as const,
  projects: ['exp-projects'] as const,
  expenses: ['exp-expenses'] as const,
  categories: ['exp-categories'] as const,
  project: (id: string) => ['exp-project', id] as const,
};

/* ─────────────── Money formatting ─────────────── */

/** Format an amount with its currency, falling back gracefully for unknown codes. */
export function formatMoney(amount: number, currency = 'USD'): string {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Compact money for tight spaces (keeps the currency symbol, trims cents on big values). */
export function formatMoneyCompact(amount: number, currency = 'USD'): string {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: value >= 100000 ? 'compact' : 'standard',
      maximumFractionDigits: value >= 100000 ? 1 : 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/* ─────────────── Status meta ─────────────── */

export const EXPENSE_STATUS_META: Record<ExpenseStatus, { label: string; color: string; dot: string }> = {
  paid: { label: 'Paid', color: 'text-brand-300 bg-brand-500/10 border-brand-500/20', dot: 'bg-brand-400' },
  pending: { label: 'Pending', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  cancelled: { label: 'Cancelled', color: 'text-slate-400 bg-white/5 border-white/10', dot: 'bg-slate-500' },
};

export const STATUS_OPTIONS: { value: ExpenseStatus; label: string }[] = [
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
];

/* ─────────────── Recurring meta ─────────────── */

export const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
];

export function frequencyLabel(freq: RecurringFrequency | null | undefined): string {
  if (!freq) return 'Recurring';
  return FREQUENCY_OPTIONS.find((f) => f.value === freq)?.label ?? freq;
}

/* ─────────────── Category colors (deterministic from the name) ─────────────── */

const CATEGORY_PALETTE = [
  'text-sky-300 bg-sky-500/10 border-sky-500/20',
  'text-violet-300 bg-violet-500/10 border-violet-500/20',
  'text-amber-300 bg-amber-500/10 border-amber-500/20',
  'text-rose-300 bg-rose-500/10 border-rose-500/20',
  'text-brand-300 bg-brand-500/10 border-brand-500/20',
  'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
  'text-pink-300 bg-pink-500/10 border-pink-500/20',
];

/** Solid fill colors used for the CSS bars (parallel to CATEGORY_PALETTE order). */
const BAR_PALETTE = [
  'bg-sky-400',
  'bg-violet-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-brand-400',
  'bg-emerald-400',
  'bg-indigo-400',
  'bg-pink-400',
];

function hashString(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

export function categoryColor(name: string): string {
  return CATEGORY_PALETTE[hashString(name || '?') % CATEGORY_PALETTE.length];
}

export function barColor(name: string): string {
  return BAR_PALETTE[hashString(name || '?') % BAR_PALETTE.length];
}

/* ─────────────── Misc helpers ─────────────── */

/** ISO string → yyyy-mm-dd for <input type="date">. */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Today as yyyy-mm-dd. */
export function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'CHF', 'SEK', 'NOK', 'BRL', 'MXN'];

/** Turn a Record<string, number> into sorted bar rows with pre-computed percentages. */
export function toBarRows(map: Record<string, number>): { label: string; value: number; percent: number }[] {
  const entries = Object.entries(map || {}).filter(([, v]) => Number.isFinite(v));
  if (!entries.length) return [];
  const max = Math.max(...entries.map(([, v]) => v), 0) || 1;
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, percent: Math.max(2, Math.round((value / max) * 100)) }));
}

/** Safe JSON parse for optional metadata strings. */
export function parseMeta(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const IMPORT_COLUMNS =
  'project, title, category, vendor, paymentMethod, amount, currency, datePaid, isRecurring, recurringFrequency, nextPaymentDate, status, notes, addedBy';
