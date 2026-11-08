import { ApiError } from './api';

/* ─────────────── Types ─────────────── */

export interface GymMember {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface RosterMember extends GymMember {
  hasPin: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  notes: string;
  position: number;
  hasImage: boolean;
  imageVersion: number;
}

export interface Plan {
  key: 'A' | 'B';
  name: string;
  exercises: Exercise[];
}

export interface SetEntry {
  weight: number | null;
  reps: number | null;
  done: boolean;
}

export interface Session {
  id: string;
  memberId: string;
  planKey: 'A' | 'B';
  planName: string;
  startedAt: string;
  endedAt: string | null;
}

export interface SessionItem {
  key: string;
  exercise: Exercise | null;
  name: string;
  sets: SetEntry[];
  previous: { date: string; sets: SetEntry[] } | null;
}

export interface HistoryEntry {
  id: string;
  planKey: 'A' | 'B';
  planName: string;
  startedAt: string;
  endedAt: string;
  exercises: number;
  sets: number;
  volume: number;
}

export interface OverviewRow {
  member: GymMember;
  total: number;
  week: number;
  month: number;
  perWeek: number;
  last: { startedAt: string; planKey: 'A' | 'B' } | null;
}

export interface ExerciseStats {
  key: string;
  name: string;
  pr: { weight: number; reps: number; date: string } | null;
  series: { date: string; weight: number; reps: number }[];
}

/* ─────────────── Session storage ─────────────── */

const TOKEN_KEY = 'gym_token';
const ME_KEY = 'gym_member';

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
    /* private mode: the session simply won't persist across launches */
  }
}

export const getGymToken = () => read(TOKEN_KEY);
export function getStoredMe(): GymMember | null {
  try {
    const raw = read(ME_KEY);
    return raw ? (JSON.parse(raw) as GymMember) : null;
  } catch {
    return null;
  }
}
export function saveSession(token: string | null, member: GymMember | null) {
  write(TOKEN_KEY, token);
  write(ME_KEY, member ? JSON.stringify(member) : null);
}

/* ─────────────── API client ─────────────── */

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getGymToken();
  let res: Response;
  try {
    res = await fetch(`/api/gym${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { 'x-gym-token': token } : {}) },
    });
  } catch {
    throw new ApiError(0, 'אין חיבור לאינטרנט');
  }
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
    if (res.status === 401 && !path.startsWith('/auth')) {
      saveSession(null, null);
      window.dispatchEvent(new Event('gym:signed-out'));
    }
    throw new ApiError(res.status, body?.error || 'משהו השתבש, נסו שוב', body?.details);
  }
  return body as T;
}

const send = <T>(method: string, path: string, body?: unknown) =>
  request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export interface ExerciseInput {
  name: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  notes?: string;
}

export const gym = {
  roster: () => request<{ members: RosterMember[] }>('/roster'),
  register: (data: { code: string; name: string; pin: string; emoji: string; color: string }) =>
    send<{ token: string; member: GymMember }>('POST', '/auth/register', data),
  login: (data: { memberId: string; pin: string; code?: string }) =>
    send<{ token: string; member: GymMember }>('POST', '/auth/login', data),
  me: () => request<{ member: GymMember }>('/me'),
  members: () => request<{ members: GymMember[] }>('/members'),

  plans: () => request<{ plans: Plan[] }>('/plans'),
  renamePlan: (key: string, name: string) => send<{ plans: Plan[] }>('PATCH', `/plans/${key}`, { name }),
  addExercise: (key: string, data: ExerciseInput) => send<{ exercise: Exercise }>('POST', `/plans/${key}/exercises`, data),
  updateExercise: (id: string, data: ExerciseInput) => send<{ exercise: Exercise }>('PATCH', `/exercises/${id}`, data),
  deleteExercise: (id: string) => send<{ ok: boolean }>('DELETE', `/exercises/${id}`),
  reorder: (key: string, ids: string[]) => send<{ plans: Plan[] }>('POST', `/plans/${key}/order`, { ids }),
  uploadImage: (id: string, data: string, type: string) =>
    send<{ exercise: Exercise }>('PUT', `/exercises/${id}/image`, { data, type }),
  deleteImage: (id: string) => send<{ exercise: Exercise }>('DELETE', `/exercises/${id}/image`),

  activeSession: () => request<{ session: Session | null }>('/sessions/active'),
  startSession: (planKey: string) => send<{ session: Session; resumed: boolean }>('POST', '/sessions', { planKey }),
  session: (id: string) => request<{ session: Session; items: SessionItem[] }>(`/sessions/${id}`),
  saveSets: (sessionId: string, exerciseId: string, sets: SetEntry[]) =>
    send<{ ok: boolean }>('PUT', `/sessions/${sessionId}/exercises/${exerciseId}`, { sets }),
  finishSession: (id: string) => send<{ session: Session | null; discarded: boolean }>('POST', `/sessions/${id}/finish`),
  discardSession: (id: string) => send<{ ok: boolean }>('DELETE', `/sessions/${id}`),
  history: () => request<{ sessions: HistoryEntry[] }>('/history'),

  calendar: (from: Date, to: Date) =>
    request<{ sessions: { memberId: string; startedAt: string; planKey: 'A' | 'B' }[] }>(
      `/calendar?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`
    ),
  overview: () => {
    const ws = startOfWeek(new Date());
    const now = new Date();
    const ms = new Date(now.getFullYear(), now.getMonth(), 1);
    return request<{ members: OverviewRow[] }>(
      `/overview?ws=${encodeURIComponent(ws.toISOString())}&ms=${encodeURIComponent(ms.toISOString())}`
    );
  },
  stats: () => request<{ total: number; exercises: ExerciseStats[] }>('/stats'),
};

export function imageUrl(e: Pick<Exercise, 'id' | 'imageVersion'>): string {
  return `/api/gym/exercises/${e.id}/image?v=${e.imageVersion}&t=${encodeURIComponent(getGymToken() ?? '')}`;
}

/* ─────────────── Photos ─────────────── */

/** Shrink an iPhone photo (often 3–5 MB) to a ~1024px JPEG before upload. */
export async function compressImage(file: File, maxSide = 1024, quality = 0.8): Promise<{ data: string; type: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('לא הצלחנו לקרוא את התמונה'));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('הדפדפן לא תומך בעיבוד תמונה');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return { data: dataUrl.slice(dataUrl.indexOf(',') + 1), type: 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ─────────────── Formatting & dates ─────────────── */

export const LIME = '#d4ff3a';

export const inputClass =
  'w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-[17px] text-white placeholder:text-white/30 focus:border-[#d4ff3a]/70 focus:outline-none [color-scheme:dark]';
export const MEMBER_EMOJIS = ['💪', '🔥', '⚡', '🦁', '🐺', '🚀', '🏆', '🥊', '🐯', '🦅', '😎', '🦍'];
export const MEMBER_COLORS = ['#d4ff3a', '#38bdf8', '#a78bfa', '#fb923c', '#f472b6', '#2dd4bf'];
export const DAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
export const REST_OPTIONS = [60, 90, 120];

export function startOfWeek(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

export const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** "היום", "אתמול", "לפני 3 ימים", or a date. */
export function relativeDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff <= 0) return 'היום';
  if (diff === 1) return 'אתמול';
  if (diff < 7) return `לפני ${diff} ימים`;
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

export function fmtClock(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

export function fmtDuration(fromIso: string, toIso: string): string {
  const min = Math.max(1, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000));
  if (min < 60) return `${min} דק׳`;
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')} ש׳`;
}

/** 42.5 → "42.5", 40 → "40". */
export const fmtKg = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));

export const repsRange = (e: Pick<Exercise, 'repsMin' | 'repsMax'>) =>
  e.repsMin === e.repsMax ? `${e.repsMin}` : `${e.repsMin}–${e.repsMax}`;
