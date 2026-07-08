import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Repeat, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExpenseStatus, RecurringFrequency } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import {
  EXPENSE_STATUS_META,
  barColor,
  categoryColor,
  formatMoney,
  frequencyLabel,
  toBarRows,
} from './utils';

/* ─────────── Error state with retry ─────────── */

export function ErrorState({ label, onRetry }: { label: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<AlertTriangle className="h-7 w-7" />}
      title="Something went wrong"
      description={label}
      action={onRetry ? <Button onClick={onRetry}>Retry</Button> : undefined}
    />
  );
}

/* ─────────── Delete confirmation body (used inside a Modal) ─────────── */

export function ConfirmDelete({
  message,
  confirmLabel = 'Delete',
  loading,
  onCancel,
  onConfirm,
}: {
  message: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm text-slate-300">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>
          <Trash2 className="h-4 w-4" /> {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

/* ─────────── Status / category / recurring chips ─────────── */

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  const meta = EXPENSE_STATUS_META[status] ?? EXPENSE_STATUS_META.paid;
  return (
    <Badge color={meta.color}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </Badge>
  );
}

export function CategoryChip({ name }: { name: string }) {
  if (!name) return null;
  return <Badge color={categoryColor(name)}>{name}</Badge>;
}

export function RecurringChip({ frequency }: { frequency: RecurringFrequency | null | undefined }) {
  return (
    <Badge color="text-sky-300 bg-sky-500/10 border-sky-500/20">
      <Repeat className="h-3 w-3" />
      {frequencyLabel(frequency)}
    </Badge>
  );
}

/* ─────────── Big totals ─────────── */

type Accent = 'brand' | 'sky' | 'violet' | 'amber' | 'rose' | 'slate';

const ACCENTS: Record<Accent, string> = {
  brand: 'text-brand-400 bg-brand-500/10',
  sky: 'text-accent-sky bg-sky-500/10',
  violet: 'text-accent-violet bg-violet-500/10',
  amber: 'text-accent-amber bg-amber-500/10',
  rose: 'text-accent-rose bg-rose-500/10',
  slate: 'text-slate-300 bg-white/5',
};

/** Big, bold total card — the primary way costs are surfaced. */
export function MoneyStat({
  label,
  amount,
  currency,
  icon,
  accent = 'brand',
  hint,
  delay = 0,
  big,
}: {
  label: string;
  amount: number;
  currency: string;
  icon: ReactNode;
  accent?: Accent;
  hint?: string;
  delay?: number;
  big?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="card group relative overflow-hidden p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{label}</p>
          <p
            className={cn(
              'mt-2 font-display font-semibold tabular-nums text-white',
              big ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
            )}
          >
            {formatMoney(amount, currency)}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-110',
            ACCENTS[accent]
          )}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

/** Small count card (projects, expenses, one-time). */
export function CountStat({
  label,
  value,
  icon,
  accent = 'slate',
  delay = 0,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  accent?: Accent;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="card flex items-center gap-3 p-4"
    >
      <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', ACCENTS[accent])}>{icon}</div>
      <div className="min-w-0">
        <p className="font-display text-xl font-semibold tabular-nums text-white">{value}</p>
        <p className="truncate text-xs text-slate-400">{label}</p>
      </div>
    </motion.div>
  );
}

/* ─────────── CSS bar breakdown (no charting lib) ─────────── */

export function BarBreakdown({
  data,
  currency,
  emptyLabel = 'No data yet.',
}: {
  data: Record<string, number>;
  currency: string;
  emptyLabel?: string;
}) {
  const rows = toBarRows(data);
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-500">{emptyLabel}</p>;
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-300">{row.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-white">{formatMoney(row.value, currency)}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${row.percent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn('h-full rounded-full', barColor(row.label))}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────── Form controls ─────────── */

export function SelectField({
  label,
  hint,
  error,
  required,
  value,
  onChange,
  children,
  id,
  disabled,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="ml-0.5 text-rose-400">*</span>}
        </label>
      )}
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn('input disabled:opacity-50', error && 'border-rose-500/60')}
      >
        {children}
      </select>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3"
    >
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
          checked ? 'border-brand-400/50 bg-brand-500/80' : 'border-white/10 bg-white/5'
        )}
      >
        <span
          className={cn('absolute top-0.5 rounded-full bg-white transition-all', checked ? 'left-[22px]' : 'left-0.5')}
          style={{ height: 18, width: 18 }}
        />
      </span>
      <span className="text-sm font-medium text-slate-200">{label}</span>
    </button>
  );
}

/** Section wrapper with a title, used across dashboard and project detail. */
export function Section({
  title,
  subtitle,
  icon,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {icon && <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/10 text-brand-400">{icon}</div>}
          <div>
            <h2 className="font-display font-semibold text-white">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
