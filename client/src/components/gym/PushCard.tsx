import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, BellOff, BellRing, Share } from 'lucide-react';
import { gym } from '@/lib/gym';
import { disablePush, enablePush, getPushState, type PushState } from '@/lib/push';
import { cn } from '@/lib/utils';
import { Card } from './shared';

/** Lock-screen notifications (rest timer) — setup and status. */
export function PushCard() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setState).catch(() => setState('unsupported'));
  }, []);

  if (!state || state === 'unsupported') return null;

  const run = async (fn: () => Promise<PushState>) => {
    setBusy(true);
    try {
      const next = await fn();
      setState(next);
      if (next === 'on') {
        toast.success('התראות הופעלו 🔔');
        await gym.pushTest().catch(() => undefined);
      }
    } catch {
      toast.error('לא הצלחנו להפעיל התראות');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={cn('mt-3 flex items-start gap-3.5', state === 'off' && 'border-[#d4ff3a]/30 bg-[#d4ff3a]/[0.05]')}>
      <span
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center rounded-2xl',
          state === 'on' ? 'bg-[#d4ff3a] text-black' : 'bg-white/[0.08] text-white/70'
        )}
      >
        {state === 'on' ? <BellRing className="h-5 w-5" /> : state === 'denied' ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">התראות במסך הנעילה</p>
        {state === 'needs-install' && (
          <p className="mt-0.5 text-[14px] leading-relaxed text-white/55">
            כדי לקבל התראה כשהמנוחה נגמרת: ב-Safari לחצו על <Share className="inline h-4 w-4 align-[-2px]" /> ואז
            <b className="text-white/80"> ״הוסף למסך הבית״</b>, ופתחו את האפליקציה משם.
          </p>
        )}
        {state === 'off' && (
          <>
            <p className="mt-0.5 text-[14px] text-white/55">נועלים את הטלפון במנוחה — ומקבלים התראה כשהיא נגמרת.</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(enablePush)}
              className="mt-3 h-11 rounded-xl bg-[#d4ff3a] px-5 text-[15px] font-bold text-black disabled:opacity-50"
            >
              {busy ? 'מפעיל…' : 'הפעלת התראות'}
            </button>
          </>
        )}
        {state === 'on' && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
            <span className="text-[#d4ff3a]">פעיל ✓</span>
            <button type="button" disabled={busy} className="text-white/55 underline-offset-2 active:underline" onClick={() => gym.pushTest().then(() => toast('נשלחה התראת בדיקה'))}>
              שליחת בדיקה
            </button>
            <button type="button" disabled={busy} className="text-white/40" onClick={() => run(disablePush)}>
              כיבוי
            </button>
          </div>
        )}
        {state === 'denied' && (
          <p className="mt-0.5 text-[14px] text-white/55">ההתראות חסומות. אפשר להפעיל אותן בהגדרות האייפון ← התראות ← Gym.</p>
        )}
      </div>
    </Card>
  );
}
