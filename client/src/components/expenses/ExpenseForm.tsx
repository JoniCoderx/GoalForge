import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Save, Check, X, Repeat } from 'lucide-react';
import { expensesApi, ApiError } from '@/lib/api';
import type { Expense, ExpenseInput, ExpenseStatus, RecurringFrequency } from '@/lib/types';
import { Input, Textarea } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/PageLoader';
import { SelectField, Toggle } from './shared';
import {
  CURRENCY_OPTIONS,
  FREQUENCY_OPTIONS,
  QK,
  STATUS_OPTIONS,
  todayInput,
  toDateInput,
} from './utils';

const ADD_CATEGORY = '__add_category__';

function ReqLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="label">
      {children}
      {required && <span className="ml-0.5 text-rose-400">*</span>}
    </span>
  );
}

export function ExpenseForm({
  expense,
  defaultProjectId,
  onClose,
}: {
  expense?: Expense;
  defaultProjectId?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const editing = !!expense;

  const projectsQuery = useQuery({
    queryKey: [...QK.projects, false],
    queryFn: () => expensesApi.projects(false),
  });
  const categoriesQuery = useQuery({ queryKey: QK.categories, queryFn: expensesApi.categories });

  const projects = projectsQuery.data?.projects ?? [];
  const categories = categoriesQuery.data?.categories ?? [];

  const [projectId, setProjectId] = useState(expense?.projectId ?? defaultProjectId ?? '');
  const [title, setTitle] = useState(expense?.title ?? '');
  const [category, setCategory] = useState(expense?.category ?? '');
  const [vendor, setVendor] = useState(expense?.vendor ?? '');
  const [paymentMethod, setPaymentMethod] = useState(expense?.paymentMethod ?? '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [currency, setCurrency] = useState(expense?.currency ?? 'USD');
  const [datePaid, setDatePaid] = useState(toDateInput(expense?.datePaid) || todayInput());
  const [isRecurring, setIsRecurring] = useState(expense?.isRecurring ?? false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>(
    expense?.recurringFrequency ?? 'monthly'
  );
  const [nextPaymentDate, setNextPaymentDate] = useState(toDateInput(expense?.nextPaymentDate));
  const [status, setStatus] = useState<ExpenseStatus>(expense?.status ?? 'paid');
  const [notes, setNotes] = useState(expense?.notes ?? '');
  const [addedBy, setAddedBy] = useState(expense?.addedBy ?? '');

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [touched, setTouched] = useState(false);

  const createCategoryMut = useMutation({
    mutationFn: (name: string) => expensesApi.createCategory(name),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: QK.categories });
      setCategory(res.category.name);
      setNewCategory('');
      setAddingCategory(false);
      toast.success('Category added');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not add category'),
  });

  const amountNum = Number(amount);
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!projectId) e.projectId = 'Choose a project';
    if (!title.trim()) e.title = 'Give the expense a title';
    if (!category.trim()) e.category = 'Pick a category';
    if (amount.trim() === '' || !Number.isFinite(amountNum) || amountNum < 0)
      e.amount = 'Enter an amount (numbers only, 0 or more)';
    if (!datePaid || Number.isNaN(new Date(datePaid).getTime())) e.datePaid = 'Pick a valid date';
    return e;
  }, [projectId, title, category, amount, amountNum, datePaid]);

  const valid = Object.keys(errors).length === 0;

  const buildInput = (): ExpenseInput => ({
    projectId,
    title: title.trim(),
    category: category.trim(),
    vendor: vendor.trim(),
    paymentMethod: paymentMethod.trim(),
    amount: amountNum,
    currency: currency.trim() || 'USD',
    datePaid: new Date(datePaid).toISOString(),
    isRecurring,
    recurringFrequency: isRecurring ? recurringFrequency : null,
    nextPaymentDate: isRecurring && nextPaymentDate ? new Date(nextPaymentDate).toISOString() : null,
    status,
    notes: notes.trim(),
    addedBy: addedBy.trim(),
  });

  const saveMut = useMutation({
    mutationFn: () =>
      editing ? expensesApi.updateExpense(expense!.id, buildInput()) : expensesApi.createExpense(buildInput()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: QK.projects });
      qc.invalidateQueries({ queryKey: QK.expenses });
      if (projectId) qc.invalidateQueries({ queryKey: QK.project(projectId) });
      if (expense?.projectId && expense.projectId !== projectId)
        qc.invalidateQueries({ queryKey: QK.project(expense.projectId) });
      toast.success(editing ? 'Expense updated' : 'Expense added');
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not save expense'),
  });

  const submit = () => {
    setTouched(true);
    if (!valid) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    saveMut.mutate();
  };

  const show = (key: string) => (touched ? errors[key] : undefined);

  return (
    <div className="space-y-5">
      {/* Project */}
      <div>
        <SelectField
          id="exp-project"
          label="Project"
          required
          value={projectId}
          onChange={setProjectId}
          error={show('projectId')}
          disabled={projectsQuery.isLoading}
        >
          <option value="">{projectsQuery.isLoading ? 'Loading projects…' : 'Select a project…'}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        {!projectsQuery.isLoading && projects.length === 0 && (
          <p className="mt-1.5 text-xs text-amber-400">Create a project first — expenses attach to a project.</p>
        )}
      </div>

      {/* Title */}
      <div>
        <ReqLabel required>Expense title</ReqLabel>
        <Input
          name="exp-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='e.g. "Figma subscription"'
          error={show('title')}
        />
      </div>

      {/* Category */}
      <div>
        <SelectField
          id="exp-category"
          label="Category"
          required
          value={addingCategory ? ADD_CATEGORY : category}
          onChange={(v) => {
            if (v === ADD_CATEGORY) {
              setAddingCategory(true);
            } else {
              setAddingCategory(false);
              setCategory(v);
            }
          }}
          error={!addingCategory ? show('category') : undefined}
          disabled={categoriesQuery.isLoading}
        >
          <option value="">{categoriesQuery.isLoading ? 'Loading…' : 'Select a category…'}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
          {/* Keep the current value selectable even if it isn't in the list yet */}
          {category && !categories.some((c) => c.name === category) && (
            <option value={category}>{category}</option>
          )}
          <option value={ADD_CATEGORY}>+ Add new category…</option>
        </SelectField>
        {addingCategory && (
          <div className="mt-2 flex gap-2">
            <Input
              name="new-category"
              autoFocus
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
            />
            <Button
              variant="secondary"
              disabled={!newCategory.trim()}
              loading={createCategoryMut.isPending}
              onClick={() => createCategoryMut.mutate(newCategory.trim())}
            >
              <Check className="h-4 w-4" /> Add
            </Button>
            <Button variant="ghost" onClick={() => setAddingCategory(false)} aria-label="Cancel new category">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Vendor + Payment method */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <ReqLabel>Vendor / paid to</ReqLabel>
          <Input
            name="exp-vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder='e.g. "Adobe"'
          />
        </div>
        <div>
          <ReqLabel>Payment method</ReqLabel>
          <Input
            name="exp-method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder='e.g. "Company card", "PayPal"'
          />
        </div>
      </div>

      {/* Amount + currency + date */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <ReqLabel required>Amount</ReqLabel>
          <Input
            name="exp-amount"
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            error={show('amount')}
            hint={show('amount') ? undefined : 'Numbers only'}
          />
        </div>
        <SelectField id="exp-currency" label="Currency" value={currency} onChange={setCurrency}>
          {CURRENCY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          {currency && !CURRENCY_OPTIONS.includes(currency) && <option value={currency}>{currency}</option>}
        </SelectField>
        <div>
          <ReqLabel required>Date paid</ReqLabel>
          <Input
            name="exp-date"
            type="date"
            value={datePaid}
            onChange={(e) => setDatePaid(e.target.value)}
            error={show('datePaid')}
          />
        </div>
      </div>

      {/* Recurring */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-200">
            <Repeat className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-medium">Recurring expense?</span>
          </div>
          <Toggle checked={isRecurring} onChange={setIsRecurring} label={isRecurring ? 'On' : 'Off'} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Turn on for subscriptions/retainers so monthly &amp; yearly totals are calculated.
        </p>
        {isRecurring && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SelectField
              id="exp-frequency"
              label="Recurring frequency"
              value={recurringFrequency}
              onChange={(v) => setRecurringFrequency(v as RecurringFrequency)}
            >
              {FREQUENCY_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </SelectField>
            <div>
              <ReqLabel>Next payment date</ReqLabel>
              <Input
                name="exp-next"
                type="date"
                value={nextPaymentDate}
                onChange={(e) => setNextPaymentDate(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status + added by */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="exp-status"
          label="Status"
          value={status}
          onChange={(v) => setStatus(v as ExpenseStatus)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </SelectField>
        <div>
          <ReqLabel>Added by</ReqLabel>
          <Input
            name="exp-addedby"
            value={addedBy}
            onChange={(e) => setAddedBy(e.target.value)}
            placeholder="e.g. your name"
          />
        </div>
      </div>

      {/* Notes */}
      <Textarea
        label="Notes"
        name="exp-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Anything worth remembering about this expense (optional)"
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
        {saveMut.isPending && <Spinner className="h-4 w-4" />}
        <Button variant="ghost" onClick={onClose} disabled={saveMut.isPending}>
          Cancel
        </Button>
        <Button onClick={submit} loading={saveMut.isPending} disabled={touched && !valid}>
          {editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editing ? 'Save changes' : 'Add expense'}
        </Button>
      </div>
    </div>
  );
}
