import type {
  AdminStats,
  AdminUser,
  AnalyticsOverview,
  BrandSettings,
  ExportJob,
  GeneratedContent,
  LogEntry,
  Prompt,
  Template,
  User,
  Video,
} from './types';

const TOKEN_KEY = 'goalforge_token';

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
