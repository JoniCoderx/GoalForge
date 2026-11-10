import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Timer, X } from 'lucide-react';
import { REST_OPTIONS, gym } from '@/lib/gym';
import { useNow } from '@/lib/useNow';
import { cn } from '@/lib/utils';

/**
 * Rest timer. A completed set (promptSignal bump) offers 60/90/120s with one
 * tap; the floating button opens it any time. Time is tracked as an absolute
 * end timestamp, so it stays correct if the phone locks mid-rest.
 */
const LAST_KEY = 'gym_rest_last';
const readLast = () => {
  try {
    return Number(localStorage.getItem(LAST_KEY)) || 90;
  } catch {
    return 90;
  }
};

export function RestTimer({ promptSignal, label }: { promptSignal: number; label: string }) {
  const [prompt, setPrompt] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [last, setLast] = useState(readLast);
  const audio = useRef<AudioContext | null>(null);
  const now = useNow(250);

  useEffect(() => {
    if (promptSignal > 0 && endAt === null) setPrompt(true);
  }, [promptSignal, endAt]);

  const remaining = endAt ? Math.max(0, endAt - now) : 0;

  useEffect(() => {
    if (endAt && remaining === 0) {
      setEndAt(null);
      beep(audio.current);
      navigator.vibrate?.([200, 100, 200]);
    }
  }, [endAt, remaining]);

  const start = (sec: number) => {
    // Create/resume audio inside the tap so iOS allows the end beep.
    try {
      audio.current ??= new AudioContext();
      void audio.current.resume();
    } catch {
      /* no audio support — vibration/visual only */
    }
    setTotal(sec * 1000);
    setEndAt(Date.now() + sec * 1000);
    setPrompt(false);
    setLast(sec);
    try {
      localStorage.setItem(LAST_KEY, String(sec));
    } catch {
      /* ignore */
    }
    // Lock-screen notification at the end (no-op if notifications are off).
    void gym.restPush(sec, label || undefined).catch(() => undefined);
  };

  const stop = () => {
    setEndAt(null);
    void gym.cancelRestPush().catch(() => undefined);
  };

  const addTime = () => {
    if (!endAt) return;
    const next = endAt + 15000;
    setEndAt(next);
    setTotal((t) => t + 15000);
    void gym.restPush(Math.ceil((next - Date.now()) / 1000), label || undefined).catch(() => undefined);
  };

  const secs = Math.ceil(remaining / 1000);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[45] px-3 pb-[max(12px,env(safe-area-inset-bottom))]" dir="rtl">
      <AnimatePresence mode="wait">
        {endAt ? (
          <motion.div
            key="run"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="pointer-events-auto mx-auto max-w-lg overflow-hidden rounded-[24px] border border-white/10 bg-[#1a1c20]/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1 ps-2">
                <p className="truncate text-[13px] font-semibold text-white/50">{label ? `הבא: ${label}` : 'מנוחה'}</p>
                <p className="text-4xl font-black tabular-nums leading-none" dir="ltr" style={{ textAlign: 'right' }}>
                  {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
                </p>
              </div>
              <button type="button" onClick={addTime} className="h-12 rounded-2xl bg-white/[0.08] px-4 text-[15px] font-bold">
                +15
              </button>
              <button type="button" onClick={stop} className="h-12 rounded-2xl bg-[#d4ff3a] px-4 text-[15px] font-bold text-black">
                דילוג
              </button>
            </div>
            <div className="h-1.5 bg-white/[0.06]">
              <div className="h-full bg-[#d4ff3a] transition-[width] duration-200 ease-linear" style={{ width: `${total ? (remaining / total) * 100 : 0}%` }} />
            </div>
          </motion.div>
        ) : prompt ? (
          <motion.div
            key="prompt"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="pointer-events-auto mx-auto flex max-w-lg items-center gap-2 rounded-[24px] border border-white/10 bg-[#1a1c20]/95 p-2.5 shadow-2xl backdrop-blur-xl"
          >
            <span className="flex items-center gap-1.5 ps-2 text-[15px] font-bold text-white/70">
              <Timer className="h-5 w-5" /> מנוחה
            </span>
            <div className="flex flex-1 gap-2">
              {REST_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => start(s)}
                  className={cn(
                    'h-12 flex-1 rounded-2xl text-[17px] font-black active:scale-95',
                    s === last ? 'bg-[#d4ff3a] text-black' : 'bg-white/[0.08]'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <button type="button" aria-label="סגירה" onClick={() => setPrompt(false)} className="grid h-12 w-10 place-items-center text-white/40">
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="fab"
            type="button"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setPrompt(true)}
            aria-label="טיימר מנוחה"
            className={cn('pointer-events-auto ms-auto grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-[#1a1c20] text-white shadow-2xl')}
          >
            <Timer className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function beep(ctx: AudioContext | null) {
  if (!ctx) return;
  try {
    [0, 0.25, 0.5].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
  } catch {
    /* audio unavailable */
  }
}
