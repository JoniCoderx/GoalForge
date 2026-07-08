import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, Plus, Pencil, Trash2, CheckCircle2, Receipt, FilterX, Upload } from 'lucide-react';
import { expensesApi, ApiError } from '@/lib/api';
import type { Expense, ExpenseFilters } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  CategoryChip,
  ConfirmDelete,
  ErrorState,
  ExpenseStatusBadge,
  RecurringChip,
  SelectField,
} from './shared';
import { ExpenseForm } from './ExpenseForm';
import { ImportForm } from './ImportModal';
import { QK, STATUS_OPTIONS, formatMoney } from './utils';

export function ExpensesTab() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const projectsQuery = useQuery({ queryKey: [...QK.projects, false], queryFn: () => expensesApi.projects(false) });
  const categoriesQuery = useQuery({ queryKey: QK.categories, queryFn: expensesApi.categories });
  const projects = projectsQuery.data?.projects ?? [];
  const categories = categoriesQuery.data?.categories ?? [];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...QK.expenses, filters],
    queryFn: () => expensesApi.expenses(filters),
  });
  const expenses = useMemo(() => data?.expenses ?? [], [data]);

  const set = (key: keyof ExpenseFilters, value: string) =>
    setFilters((f) => {
      const next = { ...f };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });

  const hasFilters = Object.keys(filters).length > 0;

  const markPaidMut = useMutation({
    mutationFn: (id: string) => expensesApi.updateExpense(id, { status: 'paid' }),
    onSuccess: (_res, _id) => {
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: QK.projects });
      qc.invalidateQueries({ queryKey: QK.expenses });
      toast.success('Marked as paid');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Update failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => expensesApi.deleteExpense(id),
    onSuccess: (_res, _id) => {
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: QK.projects });
      qc.invalidateQueries({ queryKey: QK.expenses });
      if (deleting?.projectId) qc.invalidateQueries({ queryKey: QK.project(deleting.projectId) });
      toast.success('Expense deleted');
      setDeleting(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Delete failed'),
  });

  const totalShown = useMemo(() => expenses.reduce((sum, e) => sum + (e.amount || 0), 0), [expenses]);
  const shownCurrency = expenses[0]?.currency ?? 'USD';
  const singleCurrency = expenses.every((e) => e.currency === shownCurrency);

  return (
    <div>
      {/* Filter bar */}
      <div className="card space-y-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={filters.search ?? ''}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Search title, vendor or notes…"
            className="input pl-10"
            aria-label="Search expenses"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SelectField label="Project" value={filters.projectId ?? ''} onChange={(v) => set('projectId', v)}>
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Category" value={filters.category ?? ''} onChange={(v) => set('category', v)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Status" value={filters.status ?? ''} onChange={(v) => set('status', v)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </SelectField>
          <SelectField label="Type" value={filters.recurring ?? ''} onChange={(v) => set('recurring', v)}>
            <option value="">All types</option>
            <option value="true">Recurring only</option>
            <option value="false">One-time only</option>
          </SelectField>
          <div>
            <label className="label" htmlFor="filter-from">
              From date
            </label>
            <input
              id="filter-from"
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => set('dateFrom', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="filter-to">
              To date
            </label>
            <input
              id="filter-to"
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => set('dateTo', e.target.value)}
              className="input"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => setFilters({})} disabled={!hasFilters}>
            <FilterX className="h-4 w-4" /> Clear filters
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setImporting(true)}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add expense
            </Button>
          </div>
        </div>
      </div>

      {/* Summary of shown rows */}
      {!isLoading && !isError && expenses.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm">
          <span className="text-slate-400">
            {expenses.length} expense{expenses.length === 1 ? '' : 's'}
          </span>
          <span className="text-slate-400">
            Shown total:{' '}
            <span className="font-semibold tabular-nums text-white">
              {singleCurrency ? formatMoney(totalShown, shownCurrency) : 'Mixed currencies'}
            </span>
          </span>
        </div>
      )}

      {/* List */}
      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState label="Could not load expenses." onRetry={() => refetch()} />
        ) : !expenses.length ? (
          <EmptyState
            icon={<Receipt className="h-7 w-7" />}
            title={hasFilters ? 'No expenses match' : 'No expenses yet'}
            description={
              hasFilters
                ? 'Try adjusting or clearing the filters above.'
                : 'Add your first expense to start tracking project costs.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={() => setFilters({})}>
                  <FilterX className="h-4 w-4" /> Clear filters
                </Button>
              ) : (
                <Button onClick={() => setAdding(true)}>
                  <Plus className="h-4 w-4" /> Add expense
                </Button>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {expenses.map((e, i) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                index={i}
                markPaidBusy={markPaidMut.isPending}
                onEdit={() => setEditing(e)}
                onDelete={() => setDeleting(e)}
                onMarkPaid={() => markPaidMut.mutate(e.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add expense" size="lg">
        {adding && <ExpenseForm onClose={() => setAdding(false)} />}
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit expense" size="lg">
        {editing && <ExpenseForm key={editing.id} expense={editing} onClose={() => setEditing(null)} />}
      </Modal>
      <Modal open={importing} onClose={() => setImporting(false)} title="Import expenses from CSV" size="lg">
        {importing && <ImportForm onClose={() => setImporting(false)} />}
      </Modal>
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete expense" size="sm">
        {deleting && (
          <ConfirmDelete
            loading={deleteMut.isPending}
            onCancel={() => setDeleting(null)}
            onConfirm={() => deleteMut.mutate(deleting.id)}
            message={
              <>
                Delete <span className="font-medium text-white">{deleting.title}</span>? This cannot be undone.
              </>
            }
          />
        )}
      </Modal>
    </div>
  );
}

function ExpenseRow({
  expense,
  index,
  markPaidBusy,
  onEdit,
  onDelete,
  onMarkPaid,
}: {
  expense: Expense;
  index: number;
  markPaidBusy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
}) {
  const e = expense;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.25) }}
      className="card p-4"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Title + project */}
        <div className="min-w-0 flex-1 basis-full sm:basis-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-white">{e.title}</span>
            <CategoryChip name={e.category} />
            {e.isRecurring && <RecurringChip frequency={e.recurringFrequency} />}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {[e.project?.name, e.vendor].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>

        {/* Amount + date */}
        <div className="text-right">
          <p className="font-display text-lg font-semibold tabular-nums text-white">
            {formatMoney(e.amount, e.currency)}
          </p>
          <p className="text-xs text-slate-500">
            {formatDate(e.datePaid)}
            {e.isRecurring && e.nextPaymentDate ? ` · next ${formatDate(e.nextPaymentDate)}` : ''}
          </p>
        </div>

        {/* Status */}
        <ExpenseStatusBadge status={e.status} />

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          {e.status === 'pending' && (
            <Button variant="ghost" size="sm" disabled={markPaidBusy} onClick={onMarkPaid}>
              <CheckCircle2 className="h-4 w-4 text-brand-400" />
              <span className="hidden sm:inline">Mark paid</span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${e.title}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label={`Delete ${e.title}`}>
            <Trash2 className="h-4 w-4 text-rose-300" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
