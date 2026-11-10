import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Check, ChevronRight, CloudOff, Copy, Minus, Plus } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { fmtClock, fmtKg, gym, imageUrl, relativeDay, repsRange, type Exercise, type SessionItem, type SetEntry } from '@/lib/gym';
import { useNow } from '@/lib/useNow';
import { cn } from '@/lib/utils';
import { GymButton, Sheet, Thumb } from './shared';
import { RestTimer } from './RestTimer';

/** Editable row — strings so partial input like "42." survives typing. */
interface Row {
  w: string;
  r: string;
  done: boolean;
}

type Draft = Record<string, Row[]>;

const toRow = (s: SetEntry): Row => ({ w: s.weight == null ? '' : fmtKg(s.weight), r: s.reps == null ? '' : String(s.reps), done: s.done });
const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || !Number.isFinite(n) ? null : n;
};
const toEntry = (r: Row): SetEntry => {
  const reps = num(r.r);
  return { weight: num(r.w), reps: reps == null ? null : Math.round(reps), done: r.done };
};
const emptyRow = (): Row => ({ w: '', r: '', done: false });

const backupKey = (id: string) => `gym_backup_${id}`;

/** iPhone keyboard "next": weight → reps → next set's weight. */
function focusNext(el: HTMLInputElement) {
  const all = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-setinput]'));
  const next = all[all.indexOf(el) + 1];
  if (next) next.focus();
  else el.blur();
}

const maxWeight = (sets: { weight: number | null }[]) => Math.max(0, ...sets.map((s) => s.weight ?? 0));

export function Workout({ sessionId, onMinimize, onEnded }: { sessionId: string; onMinimize: () => void; onEnded: (discarded: boolean) => void }) {
  const qc = useQueryClient();
  const now = useNow(1000);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['gym', 'session', sessionId],
    queryFn: () => gym.session(sessionId),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  });

  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [restPrompt, setRestPrompt] = useState({ n: 0, label: '' });
  const [finishing, setFinishing] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<Exercise | null>(null);

  const dirty = useRef(new Set<string>());
  const timers = useRef(new Map<string, number>());
  const draftRef = useRef<Draft | null>(null);
  draftRef.current = draft;

  const items = useMemo(() => data?.items ?? [], [data]);

  // Finished or cancelled on another device — close instead of an error loop.
  useEffect(() => {
    if (isError && error instanceof ApiError && error.status === 404) {
      try {
        localStorage.removeItem(backupKey(sessionId));
      } catch {
        /* ignore */
      }
      qc.invalidateQueries({ queryKey: ['gym'] });
      toast('האימון כבר הסתיים או בוטל', { icon: 'ℹ️' });
      onEnded(true);
    }
  }, [isError, error, sessionId, qc, onEnded]);

  /* ── Initialise from server, then overlay any unsynced local backup ── */
  useEffect(() => {
    if (!data || draft) return;
    const init: Draft = {};
    for (const it of data.items) {
      init[it.key] = it.sets.length ? it.sets.map(toRow) : Array.from({ length: it.exercise?.sets ?? 3 }, emptyRow);
    }
    try {
      const raw = localStorage.getItem(backupKey(sessionId));
      if (raw) {
        const backup = JSON.parse(raw) as { draft: Draft; dirty: string[] };
        for (const k of backup.dirty) {
          if (backup.draft[k] && init[k]) {
            init[k] = backup.draft[k];
            dirty.current.add(k);
          }
        }
      }
    } catch {
      /* corrupt backup — server data wins */
    }
    setDraft(init);
  }, [data, draft, sessionId]);

  const persistBackup = useCallback(() => {
    try {
      if (dirty.current.size === 0) localStorage.removeItem(backupKey(sessionId));
      else localStorage.setItem(backupKey(sessionId), JSON.stringify({ draft: draftRef.current, dirty: [...dirty.current] }));
    } catch {
      /* storage full/private — server autosave still runs */
    }
  }, [sessionId]);

  /* ── Autosave ── */
  const flushOne = useCallback(
    async (key: string) => {
      const rows = draftRef.current?.[key];
      if (!rows) return;
      setStatus('saving');
      try {
        await gym.saveSets(sessionId, key, rows.map(toEntry));
        // Only clear if nothing changed while the request was in flight.
        if (draftRef.current?.[key] === rows) dirty.current.delete(key);
        persistBackup();
        setStatus(dirty.current.size ? 'saving' : 'saved');
      } catch (e) {
        setStatus('offline');
        if (e instanceof ApiError && e.status === 404) dirty.current.delete(key);
      }
    },
    [sessionId, persistBackup]
  );

  const flushAll = useCallback(async () => {
    for (const t of timers.current.values()) window.clearTimeout(t);
    timers.current.clear();
    await Promise.all([...dirty.current].map((k) => flushOne(k)));
    return dirty.current.size === 0;
  }, [flushOne]);

  // Retry unsynced changes every few seconds (lost signal in the gym).
  useEffect(() => {
    const id = window.setInterval(() => {
      if (dirty.current.size && timers.current.size === 0) void flushAll();
    }, 4000);
    const onOnline = () => void flushAll();
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('online', onOnline);
    };
  }, [flushAll]);

  // Push initial backup-restored changes once.
  useEffect(() => {
    if (draft && dirty.current.size) void flushAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft === null]);

  // Save immediately when the app goes to the background (iOS may kill it).
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        persistBackup();
        void flushAll();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [flushAll, persistBackup]);

  const update = (key: string, rows: Row[]) => {
    setDraft((d) => (d ? { ...d, [key]: rows } : d));
    draftRef.current = draftRef.current ? { ...draftRef.current, [key]: rows } : draftRef.current;
    dirty.current.add(key);
    persistBackup();
    setStatus('saving');
    const prev = timers.current.get(key);
    if (prev) window.clearTimeout(prev);
    timers.current.set(
      key,
      window.setTimeout(() => {
        timers.current.delete(key);
        void flushOne(key);
      }, 700)
    );
  };

  /* ── Finish / discard ── */
  const finish = async () => {
    setBusy(true);
    const synced = await flushAll();
    if (!synced) {
      toast.error('אין חיבור — הנתונים שמורים במכשיר. נסו לסיים שוב כשיחזור החיבור.');
      setBusy(false);
      return;
    }
    try {
      const r = await gym.finishSession(sessionId);
      localStorage.removeItem(backupKey(sessionId));
      qc.invalidateQueries({ queryKey: ['gym'] });
      toast.success(r.discarded ? 'לא נרשמו סטים — האימון לא נשמר' : 'האימון נשמר 💪 כל הכבוד!');
      onEnded(r.discarded);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'הסיום נכשל');
      setBusy(false);
    }
  };

  const discard = async () => {
    setBusy(true);
    try {
      await gym.discardSession(sessionId);
      localStorage.removeItem(backupKey(sessionId));
      qc.invalidateQueries({ queryKey: ['gym'] });
      toast('האימון בוטל', { icon: '🗑️' });
      onEnded(true);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'הביטול נכשל');
      setBusy(false);
    }
  };

  const session = data?.session;
  const doneSets = draft ? Object.values(draft).flat().filter((r) => r.done).length : 0;
  const totalSets = draft ? Object.values(draft).flat().length : 0;
  const allDone = totalSets > 0 && doneSets === totalSets;

  // What got better vs last time — shown when finishing.
  const improvements = useMemo(() => {
    if (!draft) return [];
    return items.flatMap((it) => {
      const done = (draft[it.key] ?? []).filter((r) => r.done).map(toEntry);
      if (!it.previous || done.length === 0) return [];
      const kg = maxWeight(done) - maxWeight(it.previous.sets);
      const reps = done.reduce((a, s) => a + (s.reps ?? 0), 0) - it.previous.sets.reduce((a, s) => a + (s.reps ?? 0), 0);
      if (kg > 0) return [{ name: it.name, text: `\u2066+${fmtKg(kg)}\u2069 ק״ג` }];
      if (kg === 0 && reps > 0) return [{ name: it.name, text: `\u2066+${reps}\u2069 חזרות` }];
      return [];
    });
  }, [draft, items]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0a0b0d]" dir="rtl">
      {/* Header */}
      <header className="border-b border-white/[0.07] bg-[#0a0b0d]/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button type="button" onClick={onMinimize} className="flex items-center gap-0.5 px-2 py-2 text-[17px] font-semibold text-[#d4ff3a]">
            <ChevronRight className="h-6 w-6" /> בית
          </button>
          <div className="flex-1 text-center">
            <p className="text-[15px] font-bold leading-tight">{session?.planName ?? 'אימון'}</p>
            <p className="font-mono text-[13px] tabular-nums text-white/50" dir="ltr">
              {session ? fmtClock(now - new Date(session.startedAt).getTime()) : '--:--'}
            </p>
          </div>
          <GymButton
            onClick={() => setFinishing(true)}
            className={cn('min-h-[40px] rounded-xl px-4 text-[15px]', allDone && 'animate-pulse shadow-[0_0_24px_rgba(212,255,58,0.6)]')}
            disabled={!session}
          >
            סיום
          </GymButton>
        </div>
        <div className="flex items-center justify-between px-4 pb-2 text-[12px]">
          <span className="text-white/45">
            {doneSets}/{totalSets} סטים
          </span>
          <span className={cn('flex items-center gap-1', status === 'offline' ? 'text-amber-300' : 'text-white/40')}>
            {status === 'offline' ? (
              <>
                <CloudOff className="h-3.5 w-3.5" /> אין חיבור — נשמר במכשיר
              </>
            ) : status === 'saving' ? (
              'שומר…'
            ) : (
              <>
                <Check className="h-3.5 w-3.5" /> נשמר
              </>
            )}
          </span>
        </div>
        <div className="h-0.5 bg-white/[0.05]">
          <motion.div className="h-full bg-[#d4ff3a]" animate={{ width: totalSets ? `${(doneSets / totalSets) * 100}%` : 0 }} />
        </div>
      </header>

      {/* Exercises */}
      <main className="flex-1 overflow-y-auto overscroll-contain px-3 pb-44 pt-3">
        {isLoading || (data && !draft) ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-[24px] bg-white/[0.04]" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-20 text-center">
            <p className="text-white/60">לא הצלחנו לטעון את האימון</p>
            <GymButton variant="soft" className="mt-4" onClick={() => refetch()}>
              נסו שוב
            </GymButton>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-5xl">📋</p>
            <p className="mt-3 text-lg font-bold">אין תרגילים בתוכנית</p>
            <p className="mt-1 text-white/50">חזרו לבית ← תוכניות כדי להוסיף תרגילים.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <ExerciseCard
                key={it.key}
                item={it}
                rows={draft?.[it.key] ?? []}
                onRows={(rows) => update(it.key, rows)}
                onSetDone={(label) => setRestPrompt((p) => ({ n: p.n + 1, label }))}
                onZoom={setZoom}
              />
            ))}
          </div>
        )}
      </main>

      <RestTimer promptSignal={restPrompt.n} label={restPrompt.label} />

      {/* Finish sheet */}
      <Sheet open={finishing} onClose={() => { setFinishing(false); setConfirmDiscard(false); }} title="סיום אימון">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-white/[0.05] p-4">
              <p className="text-3xl font-black tabular-nums">{doneSets}</p>
              <p className="text-[13px] text-white/50">סטים שהושלמו</p>
            </div>
            <div className="rounded-2xl bg-white/[0.05] p-4">
              <p className="text-3xl font-black tabular-nums" dir="ltr">
                {session ? fmtClock(now - new Date(session.startedAt).getTime()) : '--'}
              </p>
              <p className="text-[13px] text-white/50">משך האימון</p>
            </div>
          </div>
          {improvements.length > 0 && (
            <div className="rounded-2xl border border-[#d4ff3a]/25 bg-[#d4ff3a]/[0.06] p-4">
              <p className="font-bold text-[#d4ff3a]">🎉 השתפרת מהפעם הקודמת</p>
              <ul className="mt-2 space-y-1.5">
                {improvements.map((x) => (
                  <li key={x.name} className="flex items-center justify-between gap-3 text-[15px]">
                    <span className="truncate text-white/80">{x.name}</span>
                    <span className="shrink-0 font-black text-[#d4ff3a]">{x.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <GymButton className="w-full" loading={busy} onClick={finish}>
            <Check className="h-5 w-5" /> סיום ושמירה
          </GymButton>
          <GymButton variant="soft" className="w-full" onClick={() => setFinishing(false)}>
            המשך להתאמן
          </GymButton>
          {confirmDiscard ? (
            <div className="rounded-2xl border border-[#ff3b5c]/30 p-3 text-center">
              <p className="text-[15px] text-white/70">למחוק את האימון וכל הסטים שלו?</p>
              <div className="mt-3 flex gap-2">
                <GymButton variant="ghost" className="flex-1" onClick={() => setConfirmDiscard(false)}>
                  לא
                </GymButton>
                <GymButton variant="red" className="flex-1" loading={busy} onClick={discard}>
                  כן, למחוק
                </GymButton>
              </div>
            </div>
          ) : (
            <button type="button" className="w-full py-2 text-[15px] font-semibold text-[#ff5573]" onClick={() => setConfirmDiscard(true)}>
              ביטול האימון בלי לשמור
            </button>
          )}
        </div>
      </Sheet>

      {/* Full-size machine photo */}
      {zoom && (
        <button
          type="button"
          aria-label="סגירת התמונה"
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 p-4 pt-[max(16px,env(safe-area-inset-top))]"
        >
          <img src={imageUrl(zoom)} alt={zoom.name} className="max-h-[80dvh] w-full rounded-3xl object-contain" />
          <p className="mt-4 text-xl font-bold">{zoom.name}</p>
          <p className="mt-1 text-[14px] text-white/45">הקישו לסגירה</p>
        </button>
      )}
    </div>
  );
}

function ExerciseCard({
  item,
  rows,
  onRows,
  onSetDone,
  onZoom,
}: {
  item: SessionItem;
  rows: Row[];
  onRows: (rows: Row[]) => void;
  onSetDone: (nextLabel: string) => void;
  onZoom: (e: Exercise) => void;
}) {
  const ex = item.exercise;
  const prev = item.previous;
  const editable = !!ex;
  const allDone = rows.length > 0 && rows.every((r) => r.done);
  // null = automatic (collapse once every set is done); true/false = user's choice.
  const [open, setOpen] = useState<boolean | null>(null);
  const collapsed = open === null ? allDone : !open;

  const setRow = (i: number, patch: Partial<Row>) => onRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const toggleDone = (i: number) => {
    const r = rows[i];
    if (!r.done) {
      // Empty fields + a previous set → take last time's numbers.
      const p = prev?.sets[i];
      setRow(i, {
        done: true,
        w: r.w || (p?.weight != null ? fmtKg(p.weight) : ''),
        r: r.r || (p?.reps != null ? String(p.reps) : ''),
      });
      const nextOpen = rows.findIndex((x, j) => j !== i && !x.done);
      onSetDone(nextOpen === -1 ? `${item.name} הושלם — לתרגיל הבא` : `${item.name} · סט ${nextOpen + 1}`);
      navigator.vibrate?.(15);
    } else setRow(i, { done: false });
  };

  const copyPrevious = () => {
    if (!prev) return;
    const n = Math.max(prev.sets.length, rows.length);
    onRows(
      Array.from({ length: n }, (_, i) => {
        const cur = rows[i];
        if (cur?.done) return cur;
        const p = prev.sets[i];
        return p ? { w: p.weight == null ? '' : fmtKg(p.weight), r: p.reps == null ? '' : String(p.reps), done: false } : cur ?? emptyRow();
      })
    );
    toast.success('הועתק מהאימון הקודם');
  };

  if (collapsed) {
    // Finished exercise → compact summary row, tap to reopen.
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-[22px] border border-[#d4ff3a]/25 bg-[#d4ff3a]/[0.05] p-3 text-start"
        aria-label={`${item.name} — הושלם, הקישו לפתיחה`}
      >
        <Thumb exercise={ex} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold">{item.name}</p>
          <p className="truncate text-[13px] font-semibold text-white/55" dir="ltr" style={{ textAlign: 'right' }}>
            {rows.map((r) => `${r.w || '–'}×${r.r || '–'}`).join('  ·  ')}
          </p>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d4ff3a] text-black">
          <Check className="h-5 w-5" strokeWidth={3} />
        </span>
      </button>
    );
  }

  return (
    <section className={cn('rounded-[24px] border p-3.5 transition-colors', allDone ? 'border-[#d4ff3a]/30 bg-[#d4ff3a]/[0.04]' : 'border-white/[0.08] bg-white/[0.035]')}>
      <div className="flex gap-3">
        {ex?.hasImage ? (
          <button type="button" onClick={() => onZoom(ex)} aria-label={`הגדלת התמונה של ${ex.name}`} className="shrink-0 rounded-2xl active:opacity-80">
            <Thumb exercise={ex} size={76} />
          </button>
        ) : (
          <Thumb exercise={ex} size={76} />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-[19px] font-extrabold leading-tight">{item.name}</h3>
          {ex && (
            <p className="mt-0.5 text-[15px] text-white/55">
              {ex.sets} סטים × {repsRange(ex)} חזרות
            </p>
          )}
          {ex?.notes && <p className="mt-0.5 line-clamp-2 text-[13px] text-white/40">{ex.notes}</p>}
        </div>
        {allDone && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="כיווץ התרגיל"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d4ff3a] text-black"
          >
            <Check className="h-5 w-5" strokeWidth={3} />
          </button>
        )}
      </div>

      {/* Last time */}
      {prev ? (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-white/40">פעם קודמת · {relativeDay(prev.date)}</p>
            <p className="truncate text-[15px] font-bold text-white/85" dir="ltr" style={{ textAlign: 'right' }}>
              {prev.sets.map((s) => `${s.weight != null ? fmtKg(s.weight) : '–'}×${s.reps ?? '–'}`).join('  ·  ')}
            </p>
          </div>
          {editable && (
            <button type="button" onClick={copyPrevious} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/[0.08] px-3 py-2 text-[14px] font-bold active:bg-white/15">
              <Copy className="h-4 w-4" /> העתקה
            </button>
          )}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-white/[0.03] px-3 py-2 text-[13px] text-white/35">פעם ראשונה בתרגיל הזה — בהצלחה! 🔥</p>
      )}

      {/* Sets */}
      <div className="mt-3">
        <div className="grid grid-cols-[34px_1fr_1fr_56px] gap-2 px-1 pb-1.5 text-[12px] font-semibold text-white/35">
          <span className="text-center">סט</span>
          <span className="text-center">ק״ג</span>
          <span className="text-center">חזרות</span>
          <span />
        </div>
        <div className="space-y-2">
          {rows.map((r, i) => {
            const p = prev?.sets[i];
            return (
              <div key={i} className="grid grid-cols-[34px_1fr_1fr_56px] items-center gap-2">
                <span className={cn('grid h-[34px] w-[34px] place-items-center rounded-full text-[15px] font-bold', r.done ? 'bg-[#d4ff3a] text-black' : 'bg-white/[0.07] text-white/60')}>
                  {i + 1}
                </span>
                <input
                  aria-label={`משקל סט ${i + 1}`}
                  inputMode="decimal"
                  enterKeyHint="next"
                  data-setinput
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), focusNext(e.currentTarget))}
                  disabled={!editable}
                  value={r.w}
                  placeholder={p?.weight != null ? fmtKg(p.weight) : 'ק״ג'}
                  onChange={(e) => setRow(i, { w: e.target.value.replace(/[^\d.,]/g, '').slice(0, 6) })}
                  className={cn(
                    'h-14 w-full rounded-2xl border text-center text-[22px] font-bold tabular-nums placeholder:font-semibold placeholder:text-white/20 focus:outline-none',
                    r.done ? 'border-[#d4ff3a]/25 bg-[#d4ff3a]/[0.08] text-white' : 'border-white/10 bg-white/[0.05] focus:border-[#d4ff3a]/70'
                  )}
                />
                <input
                  aria-label={`חזרות סט ${i + 1}`}
                  inputMode="numeric"
                  enterKeyHint="next"
                  data-setinput
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), focusNext(e.currentTarget))}
                  disabled={!editable}
                  value={r.r}
                  placeholder={p?.reps != null ? String(p.reps) : 'חזרות'}
                  onChange={(e) => setRow(i, { r: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                  className={cn(
                    'h-14 w-full rounded-2xl border text-center text-[22px] font-bold tabular-nums placeholder:font-semibold placeholder:text-white/20 focus:outline-none',
                    r.done ? 'border-[#d4ff3a]/25 bg-[#d4ff3a]/[0.08] text-white' : 'border-white/10 bg-white/[0.05] focus:border-[#d4ff3a]/70'
                  )}
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  disabled={!editable}
                  onClick={() => toggleDone(i)}
                  aria-label={r.done ? `ביטול סימון סט ${i + 1}` : `סימון סט ${i + 1} כהושלם`}
                  aria-pressed={r.done}
                  className={cn('grid h-14 w-14 place-items-center rounded-2xl transition-colors', r.done ? 'bg-[#d4ff3a] text-black' : 'bg-white/[0.07] text-white/40')}
                >
                  <Check className="h-7 w-7" strokeWidth={3} />
                </motion.button>
              </div>
            );
          })}
        </div>
        {editable && (
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => onRows([...rows, rows.length ? { ...rows[rows.length - 1], done: false } : emptyRow()])}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/[0.05] text-[15px] font-bold text-white/70 active:bg-white/10"
            >
              <Plus className="h-4 w-4" /> סט
            </button>
            <button
              type="button"
              disabled={rows.length <= 1}
              onClick={() => onRows(rows.slice(0, -1))}
              className="flex h-11 w-20 items-center justify-center gap-1.5 rounded-xl bg-white/[0.05] text-[15px] font-bold text-white/70 active:bg-white/10 disabled:opacity-30"
              aria-label="הסרת סט אחרון"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

