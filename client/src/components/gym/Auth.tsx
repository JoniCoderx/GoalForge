import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronRight, Delete, UserPlus } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { MEMBER_COLORS, MEMBER_EMOJIS, gym, inputClass, saveSession, type GymMember, type RosterMember } from '@/lib/gym';
import { cn } from '@/lib/utils';
import { Avatar, GymButton } from './shared';

const errText = (e: unknown) => (e instanceof ApiError ? (e.status === 429 ? 'יותר מדי ניסיונות — נסו בעוד כמה דקות' : e.message) : 'משהו השתבש');

export function GymAuth({ onSignedIn }: { onSignedIn: (m: GymMember) => void }) {
  const [picked, setPicked] = useState<RosterMember | null>(null);
  const [registering, setRegistering] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['gym', 'roster'], queryFn: gym.roster });
  const members = data?.members ?? [];

  const done = (token: string, member: GymMember) => {
    saveSession(token, member);
    onSignedIn(member);
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pb-10 pt-[max(48px,env(safe-area-inset-top))]">
      {picked ? (
        <PinScreen member={picked} onBack={() => setPicked(null)} onDone={done} />
      ) : registering ? (
        <Register onBack={() => setRegistering(false)} onDone={done} />
      ) : (
        <>
          <div className="mt-6 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-[#d4ff3a] text-4xl shadow-[0_0_60px_-10px_rgba(212,255,58,0.7)]">🏋️</div>
            <h1 className="mt-6 text-4xl font-black tracking-tight" dir="ltr">
              GYM<span className="text-[#d4ff3a]">·</span>LOG
            </h1>
            <p className="mt-2 text-white/50">מי מתאמן היום?</p>
          </div>

          <div className="mt-10 space-y-3">
            {isLoading && <div className="h-20 animate-pulse rounded-3xl bg-white/[0.05]" />}
            {isError && (
              <p className="text-center text-white/50">
                לא הצלחנו לטעון.{' '}
                <button type="button" className="font-bold text-[#d4ff3a]" onClick={() => refetch()}>
                  נסו שוב
                </button>
              </p>
            )}
            {members.map((m) => (
              <motion.button
                key={m.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setPicked(m)}
                className="flex w-full items-center gap-4 rounded-3xl border border-white/[0.08] bg-white/[0.04] p-4 text-start"
              >
                <Avatar member={m} size={52} />
                <span className="flex-1 text-xl font-bold">{m.name}</span>
                <ChevronRight className="h-5 w-5 rotate-180 text-white/30" />
              </motion.button>
            ))}
            {!isLoading && members.length < 6 && (
              <button
                type="button"
                onClick={() => setRegistering(true)}
                className="flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-white/15 p-5 font-bold text-white/60"
              >
                <UserPlus className="h-5 w-5" /> משתמש חדש
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="-ms-2 flex items-center gap-1 self-start px-2 py-2 text-[17px] font-semibold text-[#d4ff3a]">
      <ChevronRight className="h-5 w-5" /> חזרה
    </button>
  );
}

function PinScreen({
  member,
  onBack,
  onDone,
}: {
  member: RosterMember;
  onBack: () => void;
  onDone: (token: string, m: GymMember) => void;
}) {
  const needsSetup = !member.hasPin;
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pin.length !== 4 || busy) return;
    if (needsSetup && !code.trim()) {
      setError('קודם הכניסו את קוד ההצטרפות של הקבוצה');
      setPin('');
      return;
    }
    setBusy(true);
    setError('');
    gym
      .login({ memberId: member.id, pin, code: needsSetup ? code : undefined })
      .then((r) => onDone(r.token, r.member))
      // On success the screen unmounts; `busy` stays true so it can't re-submit.
      .catch((e) => {
        setError(errText(e));
        setPin('');
        setBusy(false);
        navigator.vibrate?.(120);
      });
  }, [pin, busy, needsSetup, code, member.id, onDone]);

  const press = (d: string) => setPin((p) => (p.length < 4 ? p + d : p));

  return (
    <div className="flex flex-1 flex-col">
      <BackButton onClick={onBack} />
      <div className="mt-6 flex flex-col items-center text-center">
        <Avatar member={member} size={80} />
        <h1 className="mt-4 text-3xl font-black">{member.name}</h1>
        <p className="mt-1 text-white/50">{needsSetup ? 'בחרו קוד אישי בן 4 ספרות' : 'הקוד האישי שלך'}</p>
      </div>

      {needsSetup && (
        <input
          className={cn(inputClass, 'mt-6 text-center')}
          placeholder="קוד הצטרפות של הקבוצה"
          aria-label="קוד הצטרפות"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      )}

      <motion.div
        key={error}
        animate={error ? { x: [0, -12, 12, -8, 8, 0] } : undefined}
        transition={{ duration: 0.4 }}
        className="mt-8 flex justify-center gap-4"
        aria-label={`${pin.length} מתוך 4 ספרות`}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn('h-4 w-4 rounded-full transition-colors', i < pin.length ? 'bg-[#d4ff3a]' : 'bg-white/15')}
          />
        ))}
      </motion.div>
      <p className="mt-4 h-6 text-center text-[15px] font-medium text-[#ff5573]">{error}</p>

      <div className="mx-auto mt-4 grid w-full max-w-[300px] grid-cols-3 gap-4" dir="ltr">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) =>
          k === '' ? (
            <span key="blank" />
          ) : (
            <motion.button
              key={k}
              type="button"
              whileTap={{ scale: 0.9, backgroundColor: 'rgba(255,255,255,0.2)' }}
              disabled={busy}
              onClick={() => (k === 'del' ? setPin((p) => p.slice(0, -1)) : press(k))}
              aria-label={k === 'del' ? 'מחיקה' : k}
              className={cn(
                'grid aspect-square place-items-center rounded-full text-3xl font-semibold',
                k === 'del' ? 'text-white/60' : 'bg-white/[0.07] text-white'
              )}
            >
              {k === 'del' ? <Delete className="h-7 w-7" /> : k}
            </motion.button>
          )
        )}
      </div>
    </div>
  );
}

function Register({ onBack, onDone }: { onBack: () => void; onDone: (token: string, m: GymMember) => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [emoji, setEmoji] = useState(MEMBER_EMOJIS[0]);
  const [color, setColor] = useState(MEMBER_COLORS[1]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = code && name.trim() && /^\d{4}$/.test(pin);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError('');
    try {
      const r = await gym.register({ code, name: name.trim(), pin, emoji, color });
      onDone(r.token, r.member);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <BackButton onClick={onBack} />
      <div className="mt-4 flex flex-col items-center">
        <Avatar member={{ emoji, color }} size={84} />
        <h1 className="mt-3 text-3xl font-black">{name.trim() || 'משתמש חדש'}</h1>
      </div>

      <div className="mt-6 space-y-3">
        <input className={inputClass} placeholder="השם שלך" aria-label="שם" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
        <input
          className={inputClass}
          placeholder="קוד אישי — 4 ספרות"
          aria-label="קוד אישי"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        />
        <input className={inputClass} placeholder="קוד הצטרפות של הקבוצה" aria-label="קוד הצטרפות" value={code} onChange={(e) => setCode(e.target.value)} />
      </div>

      <div className="mt-5 grid grid-cols-6 gap-2">
        {MEMBER_EMOJIS.map((em) => (
          <button
            key={em}
            type="button"
            onClick={() => setEmoji(em)}
            aria-label={em}
            className={cn('grid aspect-square place-items-center rounded-2xl text-2xl', emoji === em ? 'bg-[#d4ff3a]/15 ring-2 ring-[#d4ff3a]' : 'bg-white/[0.05]')}
          >
            {em}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-3">
        {MEMBER_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`צבע ${c}`}
            className={cn('h-10 w-10 rounded-full', color === c && 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0b0d]')}
            style={{ background: c }}
          />
        ))}
      </div>

      <p className="mt-4 h-6 text-center text-[15px] text-[#ff5573]">{error}</p>
      <GymButton type="submit" loading={busy} disabled={!valid} className="mt-2 w-full">
        יצירת משתמש
      </GymButton>
    </form>
  );
}
