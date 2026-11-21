import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check, Copy, Footprints, RefreshCw } from 'lucide-react';
import { gym, type GymMember } from '@/lib/gym';
import { cn } from '@/lib/utils';
import { Avatar, GymButton, Sheet } from './shared';

const SHORTCUT = 'GYM צעדים';
const fmt = (n: number) => n.toLocaleString('en-US');
const DAY = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

/** Daily steps from the iPhone Health app, synced by an iOS Shortcut. */
export function StepsCard({ me }: { me: GymMember }) {
  const { data, refetch } = useQuery({ queryKey: ['gym', 'steps'], queryFn: gym.steps, refetchOnWindowFocus: true });
  const [setup, setSetup] = useState(false);
  if (!data) return null;

  const mine = data.week[6]?.steps ?? 0;
  const max = Math.max(1, ...data.week.map((d) => d.steps));
  const syncNow = () => {
    // Runs the Shortcut, which sends today's steps; we refresh when the app is back.
    window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT)}`;
    setTimeout(() => void refetch(), 4000);
  };

  return (
    <>
      {!data.connected ? (
        <button
          type="button"
          onClick={() => setSetup(true)}
          className="mt-4 flex w-full items-center gap-3 rounded-[24px] border border-[#d4ff3a]/25 bg-[#d4ff3a]/[0.06] p-4 text-start active:bg-[#d4ff3a]/10"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#d4ff3a] text-black">
            <Footprints className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17px] font-extrabold">חיבור צעדים מהאייפון</span>
            <span className="block text-[13px] text-white/50">פעם אחת, 2 דקות — ומאז זה מתעדכן לבד כל יום</span>
          </span>
        </button>
      ) : (
        <div className="mt-4 rounded-[24px] border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#d4ff3a]/15 text-[#d4ff3a]">
              <Footprints className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white/45">צעדים היום</p>
              <p className="text-[28px] font-black leading-none tabular-nums">{fmt(mine)}</p>
            </div>
            <button type="button" onClick={syncNow} className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/[0.08] px-3 text-[13px] font-bold active:bg-white/15">
              <RefreshCw className="h-4 w-4" /> סנכרון
            </button>
          </div>
          {/* Last 7 days */}
          <div className="mt-4 flex h-20 items-end gap-2">
            {data.week.map((d, i) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div className={cn('w-full rounded-md', i === 6 ? 'bg-[#d4ff3a]' : 'bg-white/15')} style={{ height: `${Math.max(4, (d.steps / max) * 64)}px` }} />
                <span className="text-[10px] text-white/40">{DAY[new Date(d.day + 'T12:00:00').getDay()]}</span>
              </div>
            ))}
          </div>
          {data.today.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {data.today.slice(0, 5).map((r, i) => (
                <div key={r.member!.id} className={cn('flex items-center gap-2 rounded-xl px-2 py-1.5', r.member!.id === me.id && 'bg-[#d4ff3a]/[0.08]')}>
                  <span className="w-5 text-center text-[13px] font-bold text-white/40">{i + 1}</span>
                  <Avatar member={r.member!} size={26} />
                  <span className="flex-1 truncate text-[14px] font-semibold">{r.member!.name}</span>
                  <span className="text-[14px] font-bold tabular-nums">{fmt(r.steps)}</span>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setSetup(true)} className="mt-2 text-[12px] text-white/35 underline">
            הוראות חיבור
          </button>
        </div>
      )}
      <SetupSheet open={setup} onClose={() => { setSetup(false); void refetch(); }} link={data.link} />
    </>
  );
}

function SetupSheet({ open, onClose, link }: { open: boolean; onClose: () => void; link: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('הקישור הועתק');
    } catch {
      toast.error('לא הצלחנו להעתיק — לחץ לחיצה ארוכה על הקישור');
    }
  };
  const Step = ({ n, children }: { n: number; children: React.ReactNode }) => (
    <li className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#d4ff3a] text-[14px] font-black text-black">{n}</span>
      <div className="min-w-0 flex-1 pt-0.5 text-[15px] leading-relaxed text-white/85">{children}</div>
    </li>
  );
  const B = ({ children }: { children: React.ReactNode }) => <b className="font-extrabold text-white">{children}</b>;
  return (
    <Sheet open={open} onClose={onClose} title="חיבור צעדים — פעם אחת">
      <div className="max-h-[70dvh] space-y-5 overflow-y-auto pb-4">
        <div>
          <p className="mb-2 text-[13px] font-semibold text-white/45">הקישור האישי שלך (לא לשתף)</p>
          <button type="button" onClick={copy} className="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-start active:bg-white/10">
            <span className="min-w-0 flex-1 truncate text-[12px] text-white/50" dir="ltr">{link}</span>
            <span className="flex shrink-0 items-center gap-1 rounded-xl bg-[#d4ff3a] px-3 py-2 text-[13px] font-black text-black">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'הועתק' : 'העתקה'}
            </span>
          </button>
        </div>
        <ol className="space-y-4">
          <Step n={1}>פותחים את אפליקציית <B>קיצורים</B> (Shortcuts) ← <B>+</B> למעלה. קוראים לקיצור <B>{SHORTCUT}</B>.</Step>
          <Step n={2}>מוסיפים פעולה <B>מצא דגימות בריאות</B> (Find Health Samples). סוג: <B>צעדים</B>, ומסננים <B>תאריך התחלה הוא היום</B>.</Step>
          <Step n={3}>מוסיפים <B>חשב סטטיסטיקה</B> (Calculate Statistics) ← <B>סכום</B> (Sum).</Step>
          <Step n={4}>מוסיפים <B>קבל תוכן של כתובת URL</B> (Get Contents of URL). מדביקים את הקישור, ומיד אחרי <span dir="ltr">steps=</span> בסוף מוסיפים את המשתנה <B>סטטיסטיקה</B>.</Step>
          <Step n={5}>מריצים פעם אחת ▶️ ומאשרים גישה לבריאות. אמורה להופיע הודעה <B>✅ צעדים נשמרו</B>.</Step>
          <Step n={6}>בלשונית <B>אוטומציה</B> ← <B>+</B> ← <B>שעה ביום</B> ← 23:30, <B>כל יום</B> ← <B>הפעל מיד</B> ← בוחרים את <B>{SHORTCUT}</B>. מעכשיו זה קורה לבד 🎉</Step>
        </ol>
        <p className="rounded-2xl bg-white/[0.04] p-3 text-[13px] text-white/50">טיפ: אפשר להוסיף עוד אוטומציה בצהריים כדי לראות את הטבלה מתעדכנת במהלך היום. כפתור ״סנכרון״ בכרטיס מריץ את הקיצור מיד.</p>
        <GymButton onClick={() => (window.location.href = 'shortcuts://')}>פתיחת אפליקציית קיצורים</GymButton>
      </div>
    </Sheet>
  );
}
