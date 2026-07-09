import type {
  ActivityItem,
  AdminStats,
  AdminUser,
  AnalyticsOverview,
  BrandSettings,
  ConsoleMetrics,
  ConsoleUser,
  ConsoleUserDetail,
  Coupon,
  Expense,
  ExpenseCategory,
  ExpenseDashboard,
  ExpenseFilters,
  ExpenseInput,
  ExpenseProject,
  ExpenseProjectDetail,
  ExportJob,
  GeneratedContent,
  LogEntry,
  Prompt,
  Template,
  User,
  UserPlan,
  UserStatus,
  Video,
} from './types';

const TOKEN_KEY = 'goalforge_token';
const CONSOLE_TOKEN_KEY = 'goalforge_console_token';
const EXPENSES_TOKEN_KEY = 'goalforge_expenses_token';

export function getExpensesToken(): string | null {
  return localStorage.getItem(EXPENSES_TOKEN_KEY);
}
export function setExpensesToken(token: string | null) {
  if (token) localStorage.setItem(EXPENSES_TOKEN_KEY, token);
  else localStorage.removeItem(EXPENSES_TOKEN_KEY);
}

export function getConsoleToken(): string | null {
  return localStorage.getItem(CONSOLE_TOKEN_KEY);
}
export function setConsoleToken(token: string | null) {
  if (token) localStorage.setItem(CONSOLE_TOKEN_KEY, token);
  else localStorage.removeItem(CONSOLE_TOKEN_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers, credentials: 'include' });

  if (res.status === 204) return undefined as T;

  let body: any = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message = body?.error || res.statusText || 'Request failed';
    if (res.status === 401 && !path.startsWith('/auth')) {
      // The session died mid-use (expired token, rotated JWT_SECRET on a
      // deploy, or a banned account). Without a redirect the dashboard sits
      // on dead "Couldn't load" cards forever — send the user back to login.
      setToken(null);
      const here = window.location.pathname;
      if (here.startsWith('/app') || here.startsWith('/admin')) {
        window.location.assign('/login?reason=session-expired');
      }
    }
    throw new ApiError(res.status, message, body?.details);
  }
  return body as T;
}

/**
 * Human-readable description of a failed request, for error states — shows
 * the real status and server message instead of a generic apology, so any
 * production failure is diagnosable straight from the screen.
 */
export function describeApiError(err: unknown): string {
  if (err instanceof ApiError) {
    return `The server responded with HTTP ${err.status}: ${err.message}`;
  }
  if (err instanceof TypeError) {
    return 'Could not reach the server — check your connection and try again.';
  }
  return err instanceof Error && err.message ? err.message : 'Unexpected error. Please try again.';
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

export const api = {
  auth: {
    register: (data: { name: string; email: string; password: string }) =>
      post<{ token: string; user: User }>('/auth/register', data),
    login: (data: { email: string; password: string }) =>
      post<{ token: string; user: User }>('/auth/login', data),
    me: () => get<{ user: User }>('/auth/me'),
    logout: () => post<{ ok: boolean }>('/auth/logout'),
  },
  templates: {
    list: () => get<{ templates: Template[] }>('/templates'),
    get: (key: string) => get<{ template: Template }>(`/templates/${key}`),
  },
  ai: {
    status: () => get<{ configured: boolean; model: string }>('/ai/status'),
    generate: (data: { templateKey: string; topic?: string; tone?: string; audience?: string }) =>
      post<{ content: GeneratedContent; source: 'openai' | 'local'; template: Template }>('/ai/generate', data),
    regenerate: (data: { templateKey: string; topic: string; field: string }) =>
      post<{ field: string; value: string | string[] }>('/ai/regenerate', data),
  },
  videos: {
    list: (status?: string) => get<{ videos: Video[] }>(`/videos${status ? `?status=${status}` : ''}`),
    get: (id: string) => get<{ video: Video }>(`/videos/${id}`),
    generate: (data: {
      templateKey: string;
      topic?: string;
      tone?: string;
      audience?: string;
      autoExport?: boolean;
    }) => post<{ video: Video; source: string; jobId?: string }>('/videos/generate', data),
    update: (id: string, data: Partial<Video>) => patch<{ video: Video }>(`/videos/${id}`, data),
    export: (id: string) => post<{ jobId: string; status: string }>(`/videos/${id}/export`),
    remove: (id: string) => del<{ ok: boolean }>(`/videos/${id}`),
  },
  exports: {
    queue: () => get<{ jobs: ExportJob[]; depth: number }>('/exports/queue'),
    history: () => get<{ jobs: ExportJob[] }>('/exports/history'),
    get: (id: string) => get<{ job: ExportJob }>(`/exports/${id}`),
  },
  brand: {
    get: () => get<{ brand: BrandSettings }>('/brand'),
    update: (data: Partial<BrandSettings>) => put<{ brand: BrandSettings }>('/brand', data),
  },
  prompts: {
    list: () => get<{ prompts: Prompt[] }>('/prompts'),
    update: (key: string, content: string) => put<{ prompt: Prompt }>(`/prompts/${key}`, { content }),
  },
  analytics: {
    overview: () => get<AnalyticsOverview>('/analytics/overview'),
  },
  admin: {
    stats: () => get<AdminStats>('/admin/stats'),
    users: () => get<{ users: AdminUser[] }>('/admin/users'),
    setRole: (id: string, role: 'USER' | 'ADMIN') =>
      patch<{ user: AdminUser }>(`/admin/users/${id}/role`, { role }),
    logs: (level?: string) => get<{ logs: LogEntry[] }>(`/admin/logs${level ? `?level=${level}` : ''}`),
    updateTemplate: (key: string, data: Partial<Template>) =>
      patch<{ template: Template }>(`/admin/templates/${key}`, data),
    createPrompt: (data: { key: string; name: string; description: string; category: string; content: string }) =>
      post<{ prompt: Prompt }>('/admin/prompts', data),
    deletePrompt: (key: string) => del<{ ok: boolean }>(`/admin/prompts/${key}`),
  },
};

/* ─────────────── Owner console (/users) — token via x-console-token ─────────────── */

async function consoleRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getConsoleToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['x-console-token'] = token;

  const res = await fetch(`/api/console${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth') setConsoleToken(null);
    throw new ApiError(res.status, body?.error || res.statusText || 'Request failed', body?.details);
  }
  return body as T;
}

const cget = <T>(p: string) => consoleRequest<T>(p);
const cbody = <T>(method: string, p: string, b?: unknown) =>
  consoleRequest<T>(p, { method, body: b ? JSON.stringify(b) : undefined });

export interface CouponInput {
  code: string;
  discountPercent: number;
  maxUses?: number | null;
  expiresAt?: string | null;
  note?: string;
  active?: boolean;
}

/* ─────────────── Expense tracker (/expenses) — token via x-expenses-token ─────────────── */

async function expensesRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getExpensesToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['x-expenses-token'] = token;
  const res = await fetch(`/api/expenses${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth') setExpensesToken(null);
    throw new ApiError(res.status, body?.error || res.statusText || 'Request failed', body?.details);
  }
  return body as T;
}
const eget = <T>(p: string) => expensesRequest<T>(p);
const ebody = <T>(method: string, p: string, b?: unknown) =>
  expensesRequest<T>(p, { method, body: b ? JSON.stringify(b) : undefined });

/** Download an export (CSV/JSON) that requires the token header. */
async function expensesDownload(path: string, filename: string): Promise<void> {
  const token = getExpensesToken();
  const res = await fetch(`/api/expenses${path}`, { headers: token ? { 'x-expenses-token': token } : {} });
  if (!res.ok) throw new ApiError(res.status, 'Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const expensesApi = {
  auth: (password: string) => ebody<{ token: string }>('POST', '/auth', { password }),
  session: () => eget<{ ok: boolean }>('/session'),
  dashboard: () => eget<ExpenseDashboard>('/dashboard'),
  categories: () => eget<{ categories: ExpenseCategory[] }>('/categories'),
  createCategory: (name: string) => ebody<{ category: ExpenseCategory }>('POST', '/categories', { name }),
  projects: (includeArchived = false) =>
    eget<{ projects: ExpenseProject[] }>(`/projects${includeArchived ? '?archived=true' : ''}`),
  project: (id: string) => eget<ExpenseProjectDetail>(`/projects/${id}`),
  createProject: (data: { name: string; notes?: string }) => ebody<{ project: ExpenseProject }>('POST', '/projects', data),
  updateProject: (id: string, data: { name?: string; notes?: string; archived?: boolean }) =>
    ebody<{ project: ExpenseProject }>('PATCH', `/projects/${id}`, data),
  deleteProject: (id: string) => ebody<{ ok: boolean }>('DELETE', `/projects/${id}`),
  expenses: (filters: ExpenseFilters = {}) => {
    const q = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) q.set(k, v);
    });
    const s = q.toString();
    return eget<{ expenses: Expense[] }>(`/expenses${s ? `?${s}` : ''}`);
  },
  createExpense: (data: ExpenseInput) => ebody<{ expense: Expense }>('POST', '/expenses', data),
  updateExpense: (id: string, data: Partial<ExpenseInput>) => ebody<{ expense: Expense }>('PATCH', `/expenses/${id}`, data),
  deleteExpense: (id: string) => ebody<{ ok: boolean }>('DELETE', `/expenses/${id}`),
  exportCsv: () => expensesDownload('/export.csv', 'expenses.csv'),
  exportJson: () => expensesDownload('/export.json', 'expenses-backup.json'),
  importCsv: (csv: string) => ebody<{ imported: number; errors: string[]; total: number }>('POST', '/import', { csv }),
};

export const consoleApi = {
  auth: (password: string) => cbody<{ token: string }>('POST', '/auth', { password }),
  session: () => cget<{ ok: boolean }>('/session'),
  metrics: () => cget<ConsoleMetrics>('/metrics'),
  users: (params: { search?: string; status?: string; plan?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    if (params.plan) q.set('plan', params.plan);
    const s = q.toString();
    return cget<{ users: ConsoleUser[] }>(`/users${s ? `?${s}` : ''}`);
  },
  user: (id: string) => cget<ConsoleUserDetail>(`/users/${id}`),
  updateUser: (
    id: string,
    data: {
      action?: 'ban' | 'unban' | 'grantPremium' | 'removePremium' | 'resetLimits';
      plan?: UserPlan;
      status?: UserStatus;
      premiumDays?: number;
    }
  ) => cbody<{ user: ConsoleUser }>('PATCH', `/users/${id}`, data),
  activity: (type?: string) => cget<{ activity: ActivityItem[] }>(`/activity${type ? `?type=${type}` : ''}`),
  coupons: () => cget<{ coupons: Coupon[] }>('/coupons'),
  createCoupon: (data: CouponInput) => cbody<{ coupon: Coupon }>('POST', '/coupons', data),
  updateCoupon: (id: string, data: Partial<CouponInput>) => cbody<{ coupon: Coupon }>('PATCH', `/coupons/${id}`, data),
  deleteCoupon: (id: string) => cbody<{ ok: boolean }>('DELETE', `/coupons/${id}`),
};
