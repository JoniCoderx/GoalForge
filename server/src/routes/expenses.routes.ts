import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Expense } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { asyncHandler, badRequest, notFound, unauthorized } from '../utils/http.js';
import { validateBody } from '../middleware/validate.js';
import { requireExpenses } from '../middleware/expenses.js';
import { signExpensesToken } from '../utils/jwt.js';

const router = Router();

/* ─────────────── Password gate ─────────────── */

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

router.post(
  '/auth',
  validateBody(z.object({ password: z.string().min(1).max(200) })),
  asyncHandler(async (req, res) => {
    const { password } = req.body as { password: string };
    if (!safeEqual(password, env.expensesPassword)) throw unauthorized('Incorrect password');
    res.json({ token: signExpensesToken() });
  })
);

// Everything below requires the expenses token.
router.use(requireExpenses);
router.get('/session', (_req, res) => res.json({ ok: true }));

/* ─────────────── Money helpers ─────────────── */

/** Normalise a recurring expense to a monthly cost. */
function monthlyEquivalent(e: Expense): number {
  if (!e.isRecurring || e.status === 'cancelled') return 0;
  switch (e.recurringFrequency) {
    case 'yearly':
      return e.amount / 12;
    case 'weekly':
      return (e.amount * 52) / 12;
    case 'monthly':
    case 'custom':
    default:
      return e.amount;
  }
}

const active = (e: Expense) => e.status !== 'cancelled';
const round2 = (n: number) => Math.round(n * 100) / 100;

function baseCurrency(expenses: Expense[]): string {
  const counts: Record<string, number> = {};
  for (const e of expenses) counts[e.currency] = (counts[e.currency] ?? 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? 'USD';
}

function projectTotals(expenses: Expense[]) {
  const totalSpent = expenses.filter(active).reduce((a, e) => a + e.amount, 0);
  const oneTime = expenses.filter((e) => active(e) && !e.isRecurring).reduce((a, e) => a + e.amount, 0);
  const monthlyRecurring = expenses.reduce((a, e) => a + monthlyEquivalent(e), 0);
  const pending = expenses.filter((e) => e.status === 'pending').reduce((a, e) => a + e.amount, 0);
  return {
    totalSpent: round2(totalSpent),
    oneTime: round2(oneTime),
    monthlyRecurring: round2(monthlyRecurring),
    yearlyRecurring: round2(monthlyRecurring * 12),
    pending: round2(pending),
  };
}

/* ─────────────── Categories ─────────────── */

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.expenseCategory.findMany({ orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
    res.json({ categories });
  })
);

router.post(
  '/categories',
  validateBody(z.object({ name: z.string().min(1).max(60) })),
  asyncHandler(async (req, res) => {
    const name = (req.body as { name: string }).name.trim();
    const category = await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name, isDefault: false },
    });
    res.status(201).json({ category });
  })
);

/* ─────────────── Projects ─────────────── */

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(120),
  notes: z.string().max(4000).optional(),
  archived: z.boolean().optional(),
});

router.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const includeArchived = req.query.archived === 'true';
    const projects = await prisma.expenseProject.findMany({
      where: includeArchived ? {} : { archived: false },
      orderBy: { updatedAt: 'desc' },
      take: 500,
      include: { expenses: true },
    });
    const out = projects.map((p) => ({
      id: p.id,
      name: p.name,
      notes: p.notes,
      archived: p.archived,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      expenseCount: p.expenses.length,
      currency: baseCurrency(p.expenses),
      ...projectTotals(p.expenses),
    }));
    res.json({ projects: out });
  })
);

router.post(
  '/projects',
  validateBody(projectSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof projectSchema>;
    const project = await prisma.expenseProject.create({ data: { name: b.name, notes: b.notes ?? '' } });
    res.status(201).json({ project: { ...project, expenseCount: 0, ...projectTotals([]) } });
  })
);

router.get(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const project = await prisma.expenseProject.findUnique({
      where: { id: req.params.id },
      include: { expenses: { orderBy: { datePaid: 'desc' } } },
    });
    if (!project) throw notFound('Project not found');

    const byCategory: Record<string, number> = {};
    const byPaymentMethod: Record<string, number> = {};
    for (const e of project.expenses.filter(active)) {
      byCategory[e.category] = round2((byCategory[e.category] ?? 0) + e.amount);
      const pm = e.paymentMethod || 'Unspecified';
      byPaymentMethod[pm] = round2((byPaymentMethod[pm] ?? 0) + e.amount);
    }

    res.json({
      project: {
        id: project.id,
        name: project.name,
        notes: project.notes,
        archived: project.archived,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        currency: baseCurrency(project.expenses),
        ...projectTotals(project.expenses),
      },
      expenses: project.expenses,
      byCategory,
      byPaymentMethod,
    });
  })
);

router.patch(
  '/projects/:id',
  validateBody(projectSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.expenseProject.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Project not found');
    const b = req.body as Partial<z.infer<typeof projectSchema>>;
    const project = await prisma.expenseProject.update({
      where: { id: existing.id },
      data: {
        ...(b.name !== undefined ? { name: b.name } : {}),
        ...(b.notes !== undefined ? { notes: b.notes } : {}),
        ...(b.archived !== undefined ? { archived: b.archived } : {}),
      },
    });
    res.json({ project });
  })
);

router.delete(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.expenseProject.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Project not found');
    await prisma.expenseProject.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  })
);

/* ─────────────── Expenses ─────────────── */

const expenseSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  title: z.string().min(1, 'Title is required').max(160),
  category: z.string().min(1).max(60).default('Other'),
  vendor: z.string().max(160).optional(),
  paymentMethod: z.string().max(80).optional(),
  amount: z.coerce.number().refine((n) => Number.isFinite(n) && n >= 0, 'Amount must be a non-negative number'),
  currency: z.string().min(1).max(8).default('USD'),
  datePaid: z.coerce.date(),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(['monthly', 'yearly', 'weekly', 'custom']).nullable().optional(),
  nextPaymentDate: z.coerce.date().nullable().optional(),
  status: z.enum(['paid', 'pending', 'cancelled']).default('paid'),
  notes: z.string().max(4000).optional(),
  addedBy: z.string().max(80).optional(),
});

/**
 * Derive the next payment date from the paid date + frequency, so recurring
 * expenses show up in "Upcoming recurring payments" even when the user leaves
 * the optional next-payment field blank ("custom" can't be inferred).
 */
function deriveNextPayment(datePaid: Date, frequency: string): Date | null {
  const next = new Date(datePaid);
  if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  else if (frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else return null;
  return next;
}

function expenseData(b: z.infer<typeof expenseSchema>) {
  const frequency = b.isRecurring ? b.recurringFrequency ?? 'monthly' : null;
  return {
    projectId: b.projectId,
    title: b.title,
    category: b.category,
    vendor: b.vendor ?? '',
    paymentMethod: b.paymentMethod ?? '',
    amount: b.amount,
    currency: b.currency.toUpperCase(),
    datePaid: b.datePaid,
    isRecurring: b.isRecurring,
    recurringFrequency: frequency,
    nextPaymentDate: b.isRecurring
      ? b.nextPaymentDate ?? (frequency ? deriveNextPayment(b.datePaid, frequency) : null)
      : null,
    status: b.status,
    notes: b.notes ?? '',
    addedBy: b.addedBy ?? '',
  };
}

router.get(
  '/expenses',
  asyncHandler(async (req, res) => {
    const q = req.query as Record<string, string | undefined>;
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    if (q.category) where.category = q.category;
    if (q.status) where.status = q.status;
    if (q.recurring === 'true') where.isRecurring = true;
    if (q.recurring === 'false') where.isRecurring = false;
    if (q.dateFrom || q.dateTo) {
      where.datePaid = {};
      if (q.dateFrom) where.datePaid.gte = new Date(q.dateFrom);
      if (q.dateTo) where.datePaid.lte = new Date(q.dateTo);
    }
    let expenses = await prisma.expense.findMany({
      where,
      orderBy: { datePaid: 'desc' },
      take: 2000,
      include: { project: { select: { name: true } } },
    });
    // Free-text search is applied case-insensitively in JS so it behaves the
    // same on SQLite and PostgreSQL (Prisma `contains` is case-sensitive on PG,
    // and `mode: 'insensitive'` is unsupported on SQLite).
    if (q.search) {
      const s = q.search.trim().toLowerCase();
      if (s) {
        expenses = expenses.filter(
          (e) =>
            e.title.toLowerCase().includes(s) ||
            e.vendor.toLowerCase().includes(s) ||
            e.notes.toLowerCase().includes(s)
        );
      }
    }
    res.json({ expenses });
  })
);

router.post(
  '/expenses',
  validateBody(expenseSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof expenseSchema>;
    const project = await prisma.expenseProject.findUnique({ where: { id: b.projectId } });
    if (!project) throw badRequest('Selected project does not exist');
    const expense = await prisma.expense.create({ data: expenseData(b) });
    await prisma.expenseProject.update({ where: { id: b.projectId }, data: { updatedAt: new Date() } });
    res.status(201).json({ expense });
  })
);

router.patch(
  '/expenses/:id',
  validateBody(expenseSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Expense not found');
    const b = req.body as Partial<z.infer<typeof expenseSchema>>;

    const data: any = {};
    for (const k of ['projectId', 'title', 'category', 'vendor', 'paymentMethod', 'status', 'notes', 'addedBy'] as const) {
      if (b[k] !== undefined) data[k] = b[k];
    }
    if (b.amount !== undefined) data.amount = b.amount;
    if (b.currency !== undefined) data.currency = b.currency.toUpperCase();
    if (b.datePaid !== undefined) data.datePaid = b.datePaid;
    if (b.isRecurring !== undefined) {
      data.isRecurring = b.isRecurring;
      if (!b.isRecurring) {
        data.recurringFrequency = null;
        data.nextPaymentDate = null;
      }
    }
    if (b.recurringFrequency !== undefined) data.recurringFrequency = b.recurringFrequency;
    if (b.nextPaymentDate !== undefined) data.nextPaymentDate = b.nextPaymentDate;

    // Same derivation as on create: if the expense ends up recurring with no
    // next payment date, infer it from the paid date + frequency.
    const merged = { ...existing, ...data };
    if (merged.isRecurring && !merged.nextPaymentDate && merged.recurringFrequency) {
      const derived = deriveNextPayment(new Date(merged.datePaid), merged.recurringFrequency);
      if (derived) data.nextPaymentDate = derived;
    }

    const expense = await prisma.expense.update({ where: { id: existing.id }, data });
    await prisma.expenseProject.update({ where: { id: expense.projectId }, data: { updatedAt: new Date() } });
    res.json({ expense });
  })
);

router.delete(
  '/expenses/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Expense not found');
    await prisma.expense.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  })
);

/* ─────────────── Dashboard ─────────────── */

router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const [projects, expenses] = await Promise.all([
      prisma.expenseProject.findMany({ where: { archived: false }, select: { id: true, name: true } }),
      prisma.expense.findMany({ take: 10000, include: { project: { select: { name: true } } } }),
    ]);
    const projectName: Record<string, string> = {};
    for (const p of projects) projectName[p.id] = p.name;

    const totals = projectTotals(expenses);
    const currencies = Array.from(new Set(expenses.map((e) => e.currency)));

    const byProject: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    for (const e of expenses.filter(active)) {
      const name = e.project?.name ?? projectName[e.projectId] ?? 'Unknown';
      byProject[name] = round2((byProject[name] ?? 0) + e.amount);
      byCategory[e.category] = round2((byCategory[e.category] ?? 0) + e.amount);
    }

    const now = new Date();
    const upcoming = expenses
      .filter((e) => e.isRecurring && e.status !== 'cancelled' && e.nextPaymentDate)
      .sort((a, b) => (a.nextPaymentDate!.getTime() - b.nextPaymentDate!.getTime()))
      .slice(0, 12)
      .map((e) => ({
        id: e.id,
        title: e.title,
        project: e.project?.name ?? 'Unknown',
        amount: e.amount,
        currency: e.currency,
        frequency: e.recurringFrequency,
        nextPaymentDate: e.nextPaymentDate,
        overdue: e.nextPaymentDate! < now,
      }));

    const recent = [...expenses]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map((e) => ({
        id: e.id,
        title: e.title,
        project: e.project?.name ?? 'Unknown',
        category: e.category,
        amount: e.amount,
        currency: e.currency,
        status: e.status,
        datePaid: e.datePaid,
      }));

    res.json({
      baseCurrency: baseCurrency(expenses),
      currencies,
      totals: {
        totalSpent: totals.totalSpent,
        monthlyRecurring: totals.monthlyRecurring,
        yearlyRecurring: totals.yearlyRecurring,
        pending: totals.pending,
        oneTime: totals.oneTime,
        projectCount: projects.length,
        expenseCount: expenses.length,
      },
      byProject,
      byCategory,
      upcoming,
      recent,
    });
  })
);

/* ─────────────── Export / Import ─────────────── */

const CSV_COLUMNS = [
  'project', 'title', 'category', 'vendor', 'paymentMethod', 'amount', 'currency',
  'datePaid', 'isRecurring', 'recurringFrequency', 'nextPaymentDate', 'status', 'notes', 'addedBy',
];

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

router.get(
  '/export.csv',
  asyncHandler(async (_req, res) => {
    const expenses = await prisma.expense.findMany({
      orderBy: { datePaid: 'desc' },
      include: { project: { select: { name: true } } },
    });
    const rows = [CSV_COLUMNS.join(',')];
    for (const e of expenses) {
      rows.push(
        [
          e.project?.name ?? '', e.title, e.category, e.vendor, e.paymentMethod, e.amount, e.currency,
          e.datePaid.toISOString().slice(0, 10), e.isRecurring, e.recurringFrequency ?? '',
          e.nextPaymentDate ? e.nextPaymentDate.toISOString().slice(0, 10) : '', e.status, e.notes, e.addedBy,
        ]
          .map(csvEscape)
          .join(',')
      );
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
    res.send(rows.join('\n'));
  })
);

router.get(
  '/export.json',
  asyncHandler(async (_req, res) => {
    const [projects, expenses, categories] = await Promise.all([
      prisma.expenseProject.findMany(),
      prisma.expense.findMany(),
      prisma.expenseCategory.findMany(),
    ]);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses-backup.json"');
    res.send(JSON.stringify({ exportedAt: new Date().toISOString(), projects, expenses, categories }, null, 2));
  })
);

/** Minimal RFC-4180-ish CSV parser (handles quoted fields, commas, newlines). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((f) => f !== '')) rows.push(row);
  }
  return rows;
}

router.post(
  '/import',
  validateBody(z.object({ csv: z.string().min(1).max(2_000_000) })),
  asyncHandler(async (req, res) => {
    const rows = parseCsv((req.body as { csv: string }).csv);
    if (rows.length < 2) throw badRequest('CSV has no data rows');
    const header = rows[0].map((h) => h.trim());
    const idx = (name: string) => header.indexOf(name);
    const iProject = idx('project');
    const iTitle = idx('title');
    const iAmount = idx('amount');
    if (iProject < 0 || iTitle < 0 || iAmount < 0) {
      throw badRequest('CSV must include at least "project", "title" and "amount" columns');
    }

    const projectCache = new Map<string, string>();
    async function projectId(name: string): Promise<string> {
      const key = name.trim() || 'Imported';
      if (projectCache.has(key)) return projectCache.get(key)!;
      const existing = await prisma.expenseProject.findFirst({ where: { name: key } });
      const p = existing ?? (await prisma.expenseProject.create({ data: { name: key } }));
      projectCache.set(key, p.id);
      return p.id;
    }

    let imported = 0;
    const errors: string[] = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const cell = (name: string) => {
        const i = idx(name);
        return i >= 0 && i < row.length ? row[i].trim() : '';
      };
      const amount = Number(cell('amount'));
      if (!cell('title') || !Number.isFinite(amount)) {
        errors.push(`Row ${r + 1}: missing title or invalid amount`);
        continue;
      }
      const datePaid = cell('datePaid') ? new Date(cell('datePaid')) : new Date();
      const isRecurring = /^(true|yes|1)$/i.test(cell('isRecurring'));
      const next = cell('nextPaymentDate');
      try {
        await prisma.expense.create({
          data: {
            projectId: await projectId(cell('project')),
            title: cell('title'),
            category: cell('category') || 'Other',
            vendor: cell('vendor'),
            paymentMethod: cell('paymentMethod'),
            amount,
            currency: (cell('currency') || 'USD').toUpperCase(),
            datePaid: isNaN(datePaid.getTime()) ? new Date() : datePaid,
            isRecurring,
            recurringFrequency: isRecurring ? (cell('recurringFrequency') || 'monthly') : null,
            nextPaymentDate: isRecurring && next && !isNaN(new Date(next).getTime()) ? new Date(next) : null,
            status: ['paid', 'pending', 'cancelled'].includes(cell('status')) ? cell('status') : 'paid',
            notes: cell('notes'),
            addedBy: cell('addedBy'),
          },
        });
        imported++;
      } catch {
        errors.push(`Row ${r + 1}: failed to import`);
      }
    }
    res.json({ imported, errors: errors.slice(0, 20), total: rows.length - 1 });
  })
);

export default router;
