import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  Wallet,
  Coins,
  Repeat,
  CalendarClock,
  Clock,
  Layers,
  CreditCard,
  Receipt,
} from 'lucide-react';
import { expensesApi, ApiError } from '@/lib/api';
import type { Expense } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  BarBreakdown,
  CategoryChip,
  ConfirmDelete,
  ErrorState,
  ExpenseStatusBadge,
  RecurringChip,
  Section,
} from './shared';
import { ExpenseForm } from './ExpenseForm';
import { QK, formatMoney } from './utils';

function Total({
  label,
  amount,
  currency,
  icon,
}: {
  label: string;
  amount: number;
  currency: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 font-display text-lg font-semibold tabular-nums text-white">{formatMoney(amount, currency)}</p>
    </div>
  );
}

export function ProjectDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QK.project(id),
    queryFn: () => expensesApi.project(id),
  });

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const deleteMut = useMutation({
    mutationFn: (expenseId: string) => expensesApi.deleteExpense(expenseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: QK.projects });
      qc.invalidateQueries({ queryKey: QK.expenses });
      qc.invalidateQueries({ queryKey: QK.project(id) });
      toast.success('Expense deleted');
      setDeleting(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Delete failed'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState label="Could not load this project." onRetry={() => refetch()} />;
  }

  const { project, expenses, byCategory, byPaymentMethod } = data;
  const cur = project.currency || 'USD';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-semibold text-white">{project.name}</h3>
          {project.notes && <p className="mt-1 max-w-xl text-sm text-slate-400">{project.notes}</p>}
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add expense
        </Button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Total label="Total spent" amount={project.totalSpent} currency={cur} icon={<Wallet className="h-3.5 w-3.5" />} />
        <Total label="One-time" amount={project.oneTime} currency={cur} icon={<Coins className="h-3.5 w-3.5" />} />
        <Total label="Monthly recurring" amount={project.monthlyRecurring} currency={cur} icon={<Repeat className="h-3.5 w-3.5" />} />
        <Total label="Yearly projection" amount={project.yearlyRecurring} currency={cur} icon={<CalendarClock className="h-3.5 w-3.5" />} />
        <Total label="Pending" amount={project.pending} currency={cur} icon={<Clock className="h-3.5 w-3.5" />} />
      </div>

      {/* Breakdowns */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Section title="By category" icon={<Layers className="h-4 w-4" />}>
          <BarBreakdown data={byCategory} currency={cur} emptyLabel="No categories yet." />
        </Section>
        <Section title="By payment method" icon={<CreditCard className="h-4 w-4" />}>
          <BarBreakdown data={byPaymentMethod} currency={cur} emptyLabel="No payment methods recorded." />
        </Section>
      </div>

      {/* Expenses */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-white">Expenses ({expenses.length})</h4>
        {expenses.length ? (
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-white">{e.title}</span>
                    <CategoryChip name={e.category} />
                    {e.isRecurring && <RecurringChip frequency={e.recurringFrequency} />}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {[e.vendor, formatDate(e.datePaid)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <ExpenseStatusBadge status={e.status} />
                <span className="font-semibold tabular-nums text-white">{formatMoney(e.amount, e.currency)}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(e)} aria-label={`Edit ${e.title}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(e)} aria-label={`Delete ${e.title}`}>
                    <Trash2 className="h-4 w-4 text-rose-300" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
            <Receipt className="mx-auto mb-2 h-6 w-6 text-slate-600" />
            <p className="text-sm text-slate-500">No expenses in this project yet.</p>
            <Button className="mt-3" size="sm" onClick={() => setAdding(true)}>
              <Plus className="h-4 w-4" /> Add expense to this project
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-white/10 pt-4">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Add / edit / delete sub-modals */}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add expense to this project" size="lg">
        {adding && <ExpenseForm defaultProjectId={id} onClose={() => setAdding(false)} />}
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit expense" size="lg">
        {editing && <ExpenseForm key={editing.id} expense={editing} onClose={() => setEditing(null)} />}
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
