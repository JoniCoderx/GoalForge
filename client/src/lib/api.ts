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
    if (res.status === 401 && !path.startsWith('/auth')) setToken(null);
    throw new ApiError(res.status, message, body?.details);
  }
  return body as T;
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
    engagement: (id: string) => post<{ video: Video }>(`/videos/${id}/engagement`),
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
