import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  Repeat,
  CalendarClock,
  Clock,
  FolderKanban,
  Receipt,
  Coins,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { expensesApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  BarBreakdown,
  CountStat,
  ErrorState,
  ExpenseStatusBadge,
  MoneyStat,
  RecurringChip,
  Section,
} from './shared';
import { QK, formatMoney } from './utils';

export function DashboardTab({ onAddExpense }: { onAddExpense: () => void }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QK.dashboard,
    queryFn: expensesApi.dashboard,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState label="Could not load the dashboard." onRetry={() => refetch()} />;
  }

  const cur = data.baseCurrency || 'USD';
  const t = data.totals;
  const empty = t.expenseCount === 0 && t.projectCount === 0;

  if (empty) {
    return (
      <EmptyState
        icon={<Receipt className="h-7 w-7" />}
        title="No expenses tracked yet"
        description="Add your first project and expense to see total spend, recurring costs and upcoming payments here."
        action={
          <button type="button" className="btn-primary" onClick={onAddExpense}>
            <Receipt className="h-4 w-4" /> Add your first expense
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {data.currencies.length > 1 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Totals mix multiple currencies ({data.currencies.join(', ')}). Amounts are summed as-is.</span>
        </div>
      )}

      {/* Primary totals — big and bold */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyStat label="Total spent" amount={t.totalSpent} currency={cur} icon={<Wallet className="h-5 w-5" />} accent="brand" big delay={0} />
        <MoneyStat label="Monthly recurring" amount={t.monthlyRecurring} currency={cur} icon={<Repeat className="h-5 w-5" />} accent="sky" delay={0.04} />
        <MoneyStat label="Yearly recurring" amount={t.yearlyRecurring} currency={cur} icon={<CalendarClock className="h-5 w-5" />} accent="violet" delay={0.08} />
        <MoneyStat label="Pending payments" amount={t.pending} currency={cur} icon={<Clock className="h-5 w-5" />} accent="amber" delay={0.12} />
      </div>

      {/* Secondary counts */}
      <div className="grid gap-4 sm:grid-cols-3">
        <CountStat label="One-time spend" value={formatMoney(t.oneTime, cur)} icon={<Coins className="h-5 w-5" />} accent="slate" delay={0.14} />
        <CountStat label="Projects" value={t.projectCount} icon={<FolderKanban className="h-5 w-5" />} accent="slate" delay={0.16} />
        <CountStat label="Expenses" value={t.expenseCount} icon={<Receipt className="h-5 w-5" />} accent="slate" delay={0.18} />
      </div>

      {/* Breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Cost per project" icon={<FolderKanban className="h-4 w-4" />}>
          <BarBreakdown data={data.byProject} currency={cur} emptyLabel="No project costs yet." />
        </Section>
        <Section title="Cost by category" icon={<TrendingUp className="h-4 w-4" />}>
          <BarBreakdown data={data.byCategory} currency={cur} emptyLabel="No categorised costs yet." />
        </Section>
      </div>

      {/* Upcoming recurring */}
      <Section title="Upcoming recurring payments" subtitle="Subscriptions and retainers due next" icon={<CalendarClock className="h-4 w-4" />}>
        {data.upcoming.length ? (
          <div className="divide-y divide-white/5">
            {data.upcoming.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{u.title}</p>
                  <p className="truncate text-xs text-slate-500">{u.project}</p>
                </div>
                <RecurringChip frequency={u.frequency} />
                {u.overdue && (
                  <span className="chip border border-rose-500/20 bg-rose-500/10 text-rose-300">Overdue</span>
                )}
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-white">{formatMoney(u.amount, u.currency)}</p>
                  <p className="text-xs text-slate-500">{formatDate(u.nextPaymentDate)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">No upcoming recurring payments.</p>
        )}
      </Section>

      {/* Recent expenses */}
      <Section title="Recent expenses" icon={<Receipt className="h-4 w-4" />}>
        {data.recent.length ? (
          <div className="divide-y divide-white/5">
            {data.recent.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{r.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {r.project} · {r.category}
                  </p>
                </div>
                <ExpenseStatusBadge status={r.status} />
                <div className="text-right">
                  <p className="font-semibold tabular-nums text-white">{formatMoney(r.amount, r.currency)}</p>
                  <p className="text-xs text-slate-500">{formatDate(r.datePaid)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">No recent expenses.</p>
        )}
      </Section>
    </div>
  );
}
