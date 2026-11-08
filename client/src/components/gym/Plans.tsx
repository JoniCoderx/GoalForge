import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowDown, ArrowUp, Camera, Check, ImagePlus, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { compressImage, gym, imageUrl, inputClass, repsRange, type Exercise, type Plan } from '@/lib/gym';
import { cn } from '@/lib/utils';
import { Card, Empty, GymButton, Segmented, Sheet, Thumb } from './shared';

const errText = (e: unknown) => (e instanceof ApiError ? e.message : 'משהו השתבש');

export function Plans({ plans, planKey, onPlanKey }: { plans: Plan[]; planKey: 'A' | 'B'; onPlanKey: (k: 'A' | 'B') => void }) {
  const qc = useQueryClient();
  const plan = plans.find((p) => p.key === planKey);
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');

  const refresh = () => qc.invalidateQueries({ queryKey: ['gym', 'plans'] });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => gym.reorder(planKey, ids),
    onSuccess: (r) => qc.setQueryData(['gym', 'plans'], r),
    onError: (e) => toast.error(errText(e)),
  });
  const rename = useMutation({
    mutationFn: () => gym.renamePlan(planKey, name.trim()),
    onSuccess: (r) => {
      qc.setQueryData(['gym', 'plans'], r);
      setRenaming(false);
    },
    onError: (e) => toast.error(errText(e)),
  });

  const move = (i: number, dir: -1 | 1) => {
    if (!plan) return;
    const ids = plan.exercises.map((e) => e.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    // Optimistic: reorder locally right away, the server confirms.
    qc.setQueryData<{ plans: Plan[] }>(['gym', 'plans'], (old) =>
      old && {
        plans: old.plans.map((p) =>
          p.key === planKey ? { ...p, exercises: ids.map((id) => p.exercises.find((e) => e.id === id)!) } : p
        ),
      }
    );
    reorder.mutate(ids);
  };

  return (
    <div>
      <h1 className="mb-4 text-[34px] font-black">תוכניות</h1>
      <Segmented
        value={planKey}
        onChange={(k) => {
          onPlanKey(k);
          setOrdering(false);
          setRenaming(false);
        }}
        options={plans.map((p) => ({ value: p.key, label: `אימון ${p.key}` }))}
      />

      {plan && (
        <>
          <div className="mt-5 flex items-center justify-between gap-3">
            {renaming ? (
              <form
                className="flex flex-1 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (name.trim()) rename.mutate();
                }}
              >
                <input autoFocus className={inputClass} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="שם התוכנית" />
                <GymButton type="submit" loading={rename.isPending} className="px-4" disabled={!name.trim()}>
                  <Check className="h-5 w-5" />
                </GymButton>
              </form>
            ) : (
              <button
                type="button"
                className="flex items-center gap-2 text-2xl font-extrabold"
                onClick={() => {
                  setName(plan.name);
                  setRenaming(true);
                }}
              >
                {plan.name} <Pencil className="h-4 w-4 text-white/35" />
              </button>
            )}
            {!renaming && plan.exercises.length > 1 && (
              <button
                type="button"
                onClick={() => setOrdering(!ordering)}
                className={cn('rounded-full px-4 py-2 text-[15px] font-bold', ordering ? 'bg-[#d4ff3a] text-black' : 'bg-white/[0.07] text-white')}
              >
                {ordering ? 'סיום' : 'שינוי סדר'}
              </button>
            )}
          </div>

          <div className="mt-4 space-y-2.5">
            {plan.exercises.length === 0 && (
              <Card>
                <Empty icon="📋" title="התוכנית ריקה" text="הוסיפו תרגילים — עם תמונה של המכשיר בחדר הכושר." />
              </Card>
            )}
            <AnimatePresence initial={false}>
              {plan.exercises.map((e, i) => (
                <motion.div key={e.id} layout transition={{ type: 'spring', damping: 30, stiffness: 400 }}>
                  <Card className="flex items-center gap-3.5 p-3" onClick={ordering ? undefined : () => setEditing(e)}>
                    <span className="w-5 text-center text-[15px] font-bold text-white/30">{i + 1}</span>
                    <Thumb exercise={e} size={64} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px] font-bold">{e.name}</p>
                      <p className="text-[15px] text-white/55">
                        {e.sets} סטים × {repsRange(e)} חזרות
                      </p>
                      {e.notes && <p className="truncate text-[13px] text-white/35">{e.notes}</p>}
                    </div>
                    {ordering && (
                      <div className="flex flex-col gap-1.5">
                        <button type="button" aria-label="למעלה" disabled={i === 0} onClick={() => move(i, -1)} className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.08] disabled:opacity-25">
                          <ArrowUp className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          aria-label="למטה"
                          disabled={i === plan.exercises.length - 1}
                          onClick={() => move(i, 1)}
                          className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.08] disabled:opacity-25"
                        >
                          <ArrowDown className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {!ordering && (
            <GymButton variant="soft" className="mt-3 w-full border border-dashed border-white/15" onClick={() => setEditing('new')}>
              <Plus className="h-5 w-5" /> הוספת תרגיל
            </GymButton>
          )}
        </>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'תרגיל חדש' : 'עריכת תרגיל'}>
        {editing !== null && (
          <ExerciseForm
            key={editing === 'new' ? 'new' : editing.id}
            planKey={planKey}
            exercise={editing === 'new' ? null : editing}
            onDone={() => {
              setEditing(null);
              refresh();
            }}
          />
        )}
      </Sheet>
    </div>
  );
}

function Stepper({ value, onChange, min, max, label }: { value: number; onChange: (n: number) => void; min: number; max: number; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/[0.05] p-1.5">
      <button type="button" aria-label={`פחות ${label}`} onClick={() => onChange(Math.max(min, value - 1))} className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.08]">
        <Minus className="h-5 w-5" />
      </button>
      <span className="text-center">
        <span className="block text-2xl font-black tabular-nums leading-none">{value}</span>
        <span className="text-xs text-white/45">{label}</span>
      </span>
      <button type="button" aria-label={`יותר ${label}`} onClick={() => onChange(Math.min(max, value + 1))} className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.08]">
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

function ExerciseForm({ planKey, exercise, onDone }: { planKey: 'A' | 'B'; exercise: Exercise | null; onDone: () => void }) {
  const [name, setName] = useState(exercise?.name ?? '');
  const [sets, setSets] = useState(exercise?.sets ?? 3);
  const [repsMin, setRepsMin] = useState(exercise?.repsMin ?? 8);
  const [repsMax, setRepsMax] = useState(exercise?.repsMax ?? 12);
  const [notes, setNotes] = useState(exercise?.notes ?? '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const valid = name.trim().length > 0 && repsMax >= repsMin;
  const shownImage = preview ?? (!removePhoto && exercise?.hasImage ? imageUrl(exercise) : null);

  const pick = (f: File | undefined) => {
    if (!f) return;
    setPhoto(f);
    setRemovePhoto(false);
  };

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      const body = { name: name.trim(), sets, repsMin, repsMax, notes: notes.trim() };
      const saved = exercise ? (await gym.updateExercise(exercise.id, body)).exercise : (await gym.addExercise(planKey, body)).exercise;
      if (photo) {
        const { data, type } = await compressImage(photo);
        await gym.uploadImage(saved.id, data, type);
      } else if (removePhoto && exercise?.hasImage) {
        await gym.deleteImage(saved.id);
      }
      toast.success(exercise ? 'נשמר' : 'התרגיל נוסף');
      onDone();
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!exercise) return;
    setBusy(true);
    try {
      await gym.deleteExercise(exercise.id);
      toast.success('התרגיל נמחק');
      onDone();
    } catch (e) {
      toast.error(errText(e));
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {/* Photo */}
      <div className="overflow-hidden rounded-3xl bg-white/[0.05]">
        {shownImage ? (
          <div className="relative">
            <img src={shownImage} alt="תמונת המכשיר" className="aspect-[4/3] w-full object-cover" />
            <div className="absolute inset-x-3 bottom-3 flex gap-2">
              <GymButton variant="soft" className="flex-1 bg-black/60 backdrop-blur" onClick={() => cameraRef.current?.click()}>
                <Camera className="h-5 w-5" /> צילום מחדש
              </GymButton>
              <GymButton
                variant="soft"
                className="bg-black/60 px-4 backdrop-blur"
                onClick={() => {
                  setPhoto(null);
                  setRemovePhoto(true);
                }}
              >
                <Trash2 className="h-5 w-5" />
              </GymButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-5">
            <span className="text-4xl">📸</span>
            <p className="text-[15px] text-white/55">צלמו את המכשיר כדי לזהות אותו מהר</p>
            <div className="flex w-full gap-2">
              <GymButton className="flex-1" onClick={() => cameraRef.current?.click()}>
                <Camera className="h-5 w-5" /> צילום
              </GymButton>
              <GymButton variant="soft" className="flex-1" onClick={() => galleryRef.current?.click()}>
                <ImagePlus className="h-5 w-5" /> מהגלריה
              </GymButton>
            </div>
          </div>
        )}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>

      <input className={inputClass} placeholder="שם התרגיל (למשל: לחיצת חזה במכונה)" aria-label="שם התרגיל" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />

      <Stepper label="סטים" value={sets} onChange={setSets} min={1} max={12} />
      <div className="grid grid-cols-2 gap-3">
        <Stepper label="חזרות מ־" value={repsMin} onChange={(n) => { setRepsMin(n); if (n > repsMax) setRepsMax(n); }} min={1} max={100} />
        <Stepper label="עד" value={repsMax} onChange={(n) => { setRepsMax(n); if (n < repsMin) setRepsMin(n); }} min={1} max={100} />
      </div>

      <textarea
        className={cn(inputClass, 'min-h-[88px] resize-none')}
        placeholder="הערות — מושב בגובה 4, אחיזה רחבה…"
        aria-label="הערות"
        maxLength={400}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <GymButton type="submit" loading={busy} disabled={!valid} className="w-full">
        {exercise ? 'שמירה' : 'הוספה לתוכנית'}
      </GymButton>

      {exercise &&
        (confirmDelete ? (
          <div className="flex gap-2">
            <GymButton variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>
              ביטול
            </GymButton>
            <GymButton variant="red" className="flex-1" loading={busy} onClick={remove}>
              כן, למחוק
            </GymButton>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="w-full py-2 text-[15px] font-semibold text-[#ff5573]">
            מחיקת התרגיל מהתוכנית
          </button>
        ))}
      {exercise && confirmDelete && <p className="text-center text-[13px] text-white/45">ההיסטוריה של האימונים הקודמים תישמר.</p>}
    </form>
  );
}
