import { ApiError } from './api';

/* ─────────────── Types ─────────────── */

export interface GymMember {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: string;
}

export interface GymWorkout {
  id: string;
  memberId: string;
  equipment: string;
  notes: string;
  startedAt: string;
  endedAt: string | null;
  durationMin: number;
  member: GymMember;
}

export interface GymWeekRow {
  member: GymMember;
  sessions: number;
  minutes: number;
  activeDays: number;
  daily: number[];
}

export interface GymWeek {
  start: string;
  end: string;
  rows: GymWeekRow[];
  totals: { sessions: number; minutes: number };
}

/* ─────────────── Token + client ─────────────── */

const TOKEN_KEY = 'gym_token';
const ME_KEY = 'gym_me';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable (private mode) — session still works in memory */
  }
}

export const getGymToken = () => read(TOKEN_KEY);
export const setGymToken = (t: string | null) => write(TOKEN_KEY, t);
export const getMe = () => read(ME_KEY);
export const setMe = (id: string | null) => write(ME_KEY, id);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getGymToken();
  const res = await fetch(`/api/gym${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-gym-token': token } : {}) },
  });
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
    if (res.status === 401 && path !== '/auth') setGymToken(null);
    throw new ApiError(res.status, body?.error || 'משהו השתבש, נסו שוב', body?.details);
  }
  return body as T;
}

const send = <T>(method: string, path: string, body?: unknown) =>
  request<T>(path, { method, body: body ? JSON.stringify(body) : undefined });

export const gymApi = {
  auth: (password: string) => send<{ token: string }>('POST', '/auth', { password }),
  session: () => request<{ ok: boolean }>('/session'),
  members: () => request<{ members: GymMember[] }>('/members'),
  addMember: (data: { name: string; emoji?: string; color?: string }) =>
    send<{ member: GymMember }>('POST', '/members', data),
  removeMember: (id: string) => send<{ ok: boolean }>('DELETE', `/members/${id}`),
  active: () => request<{ workouts: GymWorkout[] }>('/active'),
  history: (memberId?: string) =>
    request<{ workouts: GymWorkout[] }>(`/workouts${memberId ? `?memberId=${memberId}` : ''}`),
  start: (memberId: string, equipment?: string) =>
    send<{ workout: GymWorkout }>('POST', '/workouts/start', { memberId, equipment }),
  stop: (id: string, data: { notes?: string; equipment?: string } = {}) =>
    send<{ workout: GymWorkout | null; discarded?: boolean }>('POST', `/workouts/${id}/stop`, data),
  log: (data: { memberId: string; startedAt: string; durationMin: number; equipment?: string; notes?: string }) =>
    send<{ workout: GymWorkout }>('POST', '/workouts', data),
  removeWorkout: (id: string) => send<{ ok: boolean }>('DELETE', `/workouts/${id}`),
  week: (start: Date) => request<GymWeek>(`/week?start=${encodeURIComponent(start.toISOString())}`),
};

/* ─────────────── Helpers ─────────────── */

/** Equipment at the facility — swap in real names/photos when available. */
export const EQUIPMENT: { key: string; label: string; icon: string }[] = [
  { key: 'treadmill', label: 'הליכון', icon: '🏃' },
  { key: 'bike', label: 'אופני כושר', icon: '🚴' },
  { key: 'rower', label: 'חתירה', icon: '🚣' },
  { key: 'weights', label: 'משקולות חופשיות', icon: '🏋️' },
  { key: 'machines', label: 'מכונות כוח', icon: '⚙️' },
  { key: 'cables', label: 'כבלים', icon: '🪢' },
  { key: 'pullup', label: 'מתח ומקבילים', icon: '🤸' },
  { key: 'stretch', label: 'מתיחות ומזרן', icon: '🧘' },
];

export const MEMBER_EMOJIS = ['💪', '🔥', '⚡', '🦁', '🐺', '🚀', '🏆', '🥊', '🐯', '🦅', '🏃', '😎'];
export const MEMBER_COLORS = ['#22c55e', '#0ea5e9', '#a855f7', '#f59e0b', '#f43f5e', '#14b8a6', '#eab308', '#6366f1'];

export const DAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

/** Local midnight of the Sunday that starts the week containing `d` (Israeli week). */
export function weekStart(d = new Date()): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function fmtMinutes(min: number): string {
  if (min < 60) return `${min} דק׳`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ש׳ ${m} דק׳` : `${h} ש׳`;
}

export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' });
export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

export function equipmentLabel(key: string): string {
  const e = EQUIPMENT.find((x) => x.key === key);
  return e ? `${e.icon} ${e.label}` : key;
}
