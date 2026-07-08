import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Palette, Save, RotateCcw, ImageUp, Film, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import type { BrandSettings } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

/* ─────────────────────────── Toggle switch ─────────────────────────── */

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-100">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
      </span>
      <span
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
          checked ? 'border-brand-400/50 bg-brand-500/80' : 'border-white/10 bg-white/10'
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow-sm',
            checked ? 'ml-6' : 'ml-1'
          )}
        />
      </span>
    </button>
  );
}

/* ─────────────────────────── Types & helpers ─────────────────────────── */

type BrandForm = Pick<
  BrandSettings,
  | 'brandName'
  | 'primaryColor'
  | 'secondaryColor'
  | 'accentColor'
  | 'backgroundColor'
  | 'fontFamily'
  | 'watermarkText'
  | 'watermarkEnabled'
  | 'ctaText'
>;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const isHex = (v: string) => HEX_RE.test(v);

const FONT_OPTIONS: { value: BrandForm['fontFamily']; label: string }[] = [
  { value: 'BigShoulders', label: 'Big Shoulders (bold)' },
  { value: 'BigShouldersRegular', label: 'Big Shoulders (regular)' },
  { value: 'Arsenal', label: 'Arsenal' },
];

function pickForm(b: BrandSettings): BrandForm {
  return {
    brandName: b.brandName,
    primaryColor: b.primaryColor,
    secondaryColor: b.secondaryColor,
    accentColor: b.accentColor,
    backgroundColor: b.backgroundColor,
    fontFamily: b.fontFamily,
    watermarkText: b.watermarkText,
    watermarkEnabled: b.watermarkEnabled,
    ctaText: b.ctaText,
  };
}

/* ─────────────────────────── Color row ─────────────────────────── */

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = isHex(value);
  // Native color input requires a valid 6-digit hex; fall back to a neutral when invalid.
  const swatchValue = valid ? value : '#000000';
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-3">
        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10">
          <input
            type="color"
            value={swatchValue}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label} swatch`}
            className="absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)] cursor-pointer border-0 bg-transparent p-0"
          />
        </span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#22c55e"
          spellCheck={false}
          error={value.length > 0 && !valid ? 'Use a 6-digit hex' : undefined}
          className="font-mono"
        />
      </div>
    </div>
  );
}

/* ─────────────────────────── Live preview ─────────────────────────── */

function BrandPreview({ form }: { form: BrandForm }) {
  const bg = isHex(form.backgroundColor) ? form.backgroundColor : '#050914';
  const primary = isHex(form.primaryColor) ? form.primaryColor : '#22c55e';
  const secondary = isHex(form.secondaryColor) ? form.secondaryColor : '#ffffff';
  const accent = isHex(form.accentColor) ? form.accentColor : '#38bdf8';

  const headingWeight = form.fontFamily === 'BigShouldersRegular' ? 500 : 800;
  const headingStyle =
    form.fontFamily === 'Arsenal'
      ? { fontFamily: 'Georgia, "Times New Roman", serif' }
      : undefined;

  return (
    <div className="relative mx-auto w-full max-w-[248px]">
      <div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] border-[6px] border-ink-700 bg-ink-950 shadow-[0_40px_120px_-40px_rgba(34,197,94,0.35)]">
        {/* Radial gradient background: primary glow over the brand background */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(65% 45% at 50% 32%, ${primary}, ${bg} 74%)`,
          }}
        />
        {/* Accent bars top & bottom */}
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: accent }} />
        <div
          className="absolute inset-x-0 bottom-0 h-1.5"
          style={{ backgroundColor: accent, opacity: 0.6 }}
        />

        <div className="relative flex h-full flex-col items-center justify-center px-5 text-center">
          <motion.p
            key={`${form.brandName}-${headingWeight}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-3xl leading-tight drop-shadow"
            style={{ color: secondary, fontWeight: headingWeight, ...headingStyle }}
          >
            {form.brandName || 'GoalForge'}
          </motion.p>

          <motion.div
            key={form.accentColor + form.ctaText}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08 }}
            className="mt-6 rounded-lg px-4 py-2.5"
            style={{ backgroundColor: accent }}
          >
            <span className="font-display text-sm font-bold uppercase leading-tight text-white drop-shadow">
              {form.ctaText || 'Follow for more'}
            </span>
          </motion.div>

          {form.watermarkEnabled && form.watermarkText && (
            <p className="absolute bottom-6 text-xs font-medium text-white/80">
              {form.watermarkText}
            </p>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-slate-500">
        Live preview · mirrors the FFmpeg render
      </p>
    </div>
  );
}

/* ─────────────────────────── Dropzone (coming soon) ─────────────────────────── */

function ComingSoonDrop({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
      <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400">
        <Lock className="h-3 w-3" /> Coming soon
      </span>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-slate-400">
        {icon}
      </span>
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <span className="text-xs text-slate-500">PNG or MP4 · drag &amp; drop</span>
    </div>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function Brand() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['brand'], queryFn: api.brand.get });
  const brand = data?.brand ?? null;

  const [form, setForm] = useState<BrandForm | null>(null);

  useEffect(() => {
    if (brand) setForm(pickForm(brand));
  }, [brand]);

  const dirty = useMemo(
    () => !!brand && !!form && JSON.stringify(form) !== JSON.stringify(pickForm(brand)),
    [brand, form]
  );

  const hexValid = useMemo(
    () =>
      !!form &&
      [form.primaryColor, form.secondaryColor, form.accentColor, form.backgroundColor].every(isHex),
    [form]
  );

  const mutation = useMutation({
    mutationFn: (payload: Partial<BrandSettings>) => api.brand.update(payload),
    onSuccess: (r) => {
      qc.setQueryData(['brand'], r);
      qc.invalidateQueries({ queryKey: ['brand'] });
      setForm(pickForm(r.brand));
      toast.success('Brand settings saved ✨');
    },
    onError: () => toast.error('Could not save brand settings'),
  });

  const set = <K extends keyof BrandForm>(key: K, value: BrandForm[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = () => {
    if (!form || !dirty || !hexValid) return;
    mutation.mutate(form);
  };

  const reset = () => {
    if (brand) setForm(pickForm(brand));
  };

  return (
    <div>
      <PageHeader
        icon={<Palette className="h-5 w-5" />}
        title="Brand settings"
        subtitle="Tune the colors, type and watermark used across every rendered short."
        actions={
          !isLoading && form ? (
            <>
              <Button variant="ghost" onClick={reset} disabled={!dirty || mutation.isPending}>
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
              <Button
                onClick={save}
                loading={mutation.isPending}
                disabled={!dirty || !hexValid}
              >
                <Save className="h-4 w-4" /> Save changes
              </Button>
            </>
          ) : undefined
        }
      />

      {isLoading || !form ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
          <Skeleton className="h-[440px] rounded-2xl" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left — form */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <Card>
              <h3 className="mb-4 font-display font-semibold text-white">Identity</h3>
              <div className="space-y-4">
                <Input
                  label="Brand name"
                  value={form.brandName}
                  onChange={(e) => set('brandName', e.target.value)}
                  placeholder="GoalForge"
                />
                <Input
                  label="Call to action"
                  value={form.ctaText}
                  onChange={(e) => set('ctaText', e.target.value)}
                  placeholder="Follow for daily football"
                />
                <div>
                  <label htmlFor="fontFamily" className="label">
                    Font family
                  </label>
                  <select
                    id="fontFamily"
                    className="input"
                    value={form.fontFamily}
                    onChange={(e) => set('fontFamily', e.target.value as BrandForm['fontFamily'])}
                  >
                    {FONT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} className="bg-ink-900 text-slate-100">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 font-display font-semibold text-white">Palette</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorRow
                  label="Primary color"
                  value={form.primaryColor}
                  onChange={(v) => set('primaryColor', v)}
                />
                <ColorRow
                  label="Secondary color"
                  value={form.secondaryColor}
                  onChange={(v) => set('secondaryColor', v)}
                />
                <ColorRow
                  label="Accent color"
                  value={form.accentColor}
                  onChange={(v) => set('accentColor', v)}
                />
                <ColorRow
                  label="Background color"
                  value={form.backgroundColor}
                  onChange={(v) => set('backgroundColor', v)}
                />
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 font-display font-semibold text-white">Watermark</h3>
              <div className="space-y-4">
                <Input
                  label="Watermark text"
                  value={form.watermarkText}
                  onChange={(e) => set('watermarkText', e.target.value)}
                  placeholder="@goalforge"
                />
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <Toggle
                    checked={form.watermarkEnabled}
                    onChange={(v) => set('watermarkEnabled', v)}
                    label="Show watermark on renders"
                    description="Overlaid at the bottom of every exported short."
                  />
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="mb-1 font-display font-semibold text-white">Assets</h3>
              <p className="mb-4 text-xs text-slate-500">
                Bring your own logo and outro clip. Storage is ready — upload lands soon.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <ComingSoonDrop label="Upload logo" icon={<ImageUp className="h-5 w-5" />} />
                <ComingSoonDrop label="Upload outro" icon={<Film className="h-5 w-5" />} />
              </div>
            </Card>
          </motion.div>

          {/* Right — live preview */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card>
              <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
                Preview
              </p>
              <BrandPreview form={form} />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
