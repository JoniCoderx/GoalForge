import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Sparkles, Wand2, Rocket, Save, ChevronLeft, X, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import type { Template, Video, Scene } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { PhoneMock } from '@/components/landing/PhoneMock';
import { cn } from '@/lib/utils';

export default function Create() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const { data, isLoading } = useQuery({ queryKey: ['templates'], queryFn: api.templates.list });
  const templates = data?.templates ?? [];

  const [selected, setSelected] = useState<Template | null>(null);

  // Pre-select a template when arriving from the Templates gallery (?template=key).
  useEffect(() => {
    const key = searchParams.get('template');
    if (key && templates.length && !selected) {
      const match = templates.find((t) => t.key === key);
      if (match) setSelected(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates]);
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('');
  const [audience, setAudience] = useState('');
  const [generating, setGenerating] = useState(false);
  const [video, setVideo] = useState<Video | null>(null);

  const generate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const r = await api.videos.generate({
        templateKey: selected.key,
        topic: topic || undefined,
        tone: tone || undefined,
        audience: audience || undefined,
      });
      setVideo(r.video);
      qc.invalidateQueries({ queryKey: ['videos'] });
      toast.success(r.source === 'openai' ? 'Generated with OpenAI ✨' : 'Content generated ✨');
    } catch {
      toast.error('Generation failed. Try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (video) {
    return <Editor video={video} onBack={() => setVideo(null)} onChange={setVideo} />;
  }

  return (
    <div>
      <PageHeader
        icon={<Sparkles className="h-5 w-5" />}
        title="Create content"
        subtitle="Pick a template, add a topic, and forge a complete football short in one click."
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t, i) => (
            <motion.button
              key={t.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(t)}
              className={cn(
                'card group flex items-start gap-4 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-white/20',
                selected?.key === t.key && 'border-brand-500/50 ring-1 ring-brand-500/40'
              )}
            >
              <div className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-2xl', t.gradient)}>
                {t.icon}
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-semibold text-white">{t.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{t.description}</p>
                <span className="mt-2 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                  {t.category} · {t.sceneCount} scenes
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-900/95 backdrop-blur-xl lg:left-64"
          >
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                <div className="flex items-center gap-3">
                  <div className={cn('grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-xl', selected.gradient)}>
                    {selected.icon}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Selected template</p>
                    <p className="font-medium text-white">{selected.name}</p>
                  </div>
                </div>
                <div className="grid flex-1 gap-3 sm:grid-cols-3">
                  <Input
                    label="Topic (optional)"
                    placeholder="e.g. Real Madrid vs Barcelona"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <Input label="Tone (optional)" placeholder="energetic, bold" value={tone} onChange={(e) => setTone(e.target.value)} />
                  <Input label="Audience (optional)" placeholder="TikTok fans 16-30" value={audience} onChange={(e) => setAudience(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setSelected(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="lg" loading={generating} onClick={generate}>
                    <Wand2 className="h-4 w-4" /> Generate
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {selected && <div className="h-40" />}
      <div className="mt-6 text-center text-sm text-slate-500">
        Or browse your{' '}
        <button onClick={() => navigate('/app/videos')} className="text-brand-400 hover:text-brand-300">
          existing videos
        </button>
        .
      </div>
    </div>
  );
}

/* ─────────────────────────── Editor ─────────────────────────── */

function Editor({ video, onBack, onChange }: { video: Video; onBack: () => void; onChange: (v: Video) => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Video>(video);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(video), [draft, video]);

  const update = <K extends keyof Video>(key: K, value: Video[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const updateScene = (i: number, patch: Partial<Scene>) =>
    setDraft((d) => ({ ...d, scenes: d.scenes.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.videos.update(video.id, {
        title: draft.title,
        hook: draft.hook,
        script: draft.script,
        scenes: draft.scenes,
        caption: draft.caption,
        hashtags: draft.hashtags,
        tiktokDescription: draft.tiktokDescription,
        instagramDescription: draft.instagramDescription,
        youtubeDescription: draft.youtubeDescription,
        thumbnailText: draft.thumbnailText,
        cta: draft.cta,
      });
      onChange(r.video);
      setDraft(r.video);
      qc.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const exportVideo = async () => {
    setExporting(true);
    try {
      if (dirty) await save();
      await api.videos.export(video.id);
      qc.invalidateQueries({ queryKey: ['queue'] });
      toast.success('Added to the render queue 🎬');
      navigate('/app/queue');
    } catch {
      toast.error('Could not start export');
    } finally {
      setExporting(false);
    }
  };

  const scene = draft.scenes[previewIdx] ?? draft.scenes[0];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost text-sm">
          <ChevronLeft className="h-4 w-4" /> Back to templates
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" loading={saving} onClick={save} disabled={!dirty}>
            <Save className="h-4 w-4" /> {dirty ? 'Save changes' : 'Saved'}
          </Button>
          <Button loading={exporting} onClick={exportVideo}>
            <Rocket className="h-4 w-4" /> Render & Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Card>
            <Input label="Video title" value={draft.title} onChange={(e) => update('title', e.target.value)} />
            <div className="mt-4">
              <Textarea label="Viral hook" value={draft.hook} onChange={(e) => update('hook', e.target.value)} rows={2} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Input label="Thumbnail text" value={draft.thumbnailText} onChange={(e) => update('thumbnailText', e.target.value.toUpperCase())} />
              <Input label="Call to action" value={draft.cta} onChange={(e) => update('cta', e.target.value)} />
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display font-semibold text-white">Scenes ({draft.scenes.length})</h3>
              <span className="text-xs text-slate-500">Click a scene to preview it →</span>
            </div>
            <div className="space-y-3">
              {draft.scenes.map((s, i) => (
                <div
                  key={i}
                  onClick={() => setPreviewIdx(i)}
                  className={cn(
                    'cursor-pointer rounded-xl border p-4 transition',
                    previewIdx === i ? 'border-brand-500/40 bg-brand-500/5' : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-md bg-brand-500/15 px-2 py-0.5 text-xs font-semibold text-brand-300">
                      Scene {i + 1}
                    </span>
                    <input
                      value={s.heading}
                      onChange={(e) => updateScene(i, { heading: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-transparent text-sm font-medium text-white focus:outline-none"
                    />
                    {s.stat && <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-300">{s.stat}</span>}
                  </div>
                  <textarea
                    value={s.narration}
                    onChange={(e) => updateScene(i, { narration: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    rows={2}
                    className="w-full resize-none bg-transparent text-sm text-slate-300 focus:outline-none"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500">Caption:</span>
                    <input
                      value={s.caption}
                      onChange={(e) => updateScene(i, { caption: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 rounded bg-white/5 px-2 py-1 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <HashtagEditor tags={draft.hashtags} onChange={(t) => update('hashtags', t)} />

          <Card>
            <h3 className="mb-3 font-display font-semibold text-white">Platform descriptions</h3>
            <div className="space-y-4">
              <Textarea label="TikTok" value={draft.tiktokDescription} onChange={(e) => update('tiktokDescription', e.target.value)} rows={2} />
              <Textarea label="Instagram" value={draft.instagramDescription} onChange={(e) => update('instagramDescription', e.target.value)} rows={3} />
              <Textarea label="YouTube Shorts" value={draft.youtubeDescription} onChange={(e) => update('youtubeDescription', e.target.value)} rows={3} />
            </div>
          </Card>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <p className="mb-4 text-center text-xs font-medium uppercase tracking-wide text-slate-500">Live preview</p>
            <PhoneMock
              heading={(scene?.heading || draft.hook).slice(0, 14)}
              caption={(scene?.caption || draft.title).slice(0, 22)}
              stat={scene?.stat || draft.thumbnailText.slice(0, 8)}
            />
            <div className="mt-5 flex items-center justify-center gap-2">
              {draft.scenes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPreviewIdx(i)}
                  className={cn('h-1.5 rounded-full transition-all', previewIdx === i ? 'w-6 bg-brand-400' : 'w-1.5 bg-white/20')}
                />
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">
              {draft.width}×{draft.height} · {draft.fps} FPS · TikTok-ready
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function HashtagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const clean = input.replace(/^#/, '').trim().toLowerCase();
    if (clean && !tags.includes(clean) && tags.length < 20) onChange([...tags, clean]);
    setInput('');
  };
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-semibold text-white">Hashtags</h3>
        <span className="text-xs text-slate-500">{tags.length}/20</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t} className="chip border border-brand-500/20 bg-brand-500/10 text-brand-300">
            #{t}
            <button onClick={() => onChange(tags.filter((x) => x !== t))} className="ml-0.5 text-brand-400/60 hover:text-brand-300">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Add a hashtag…"
          className="input flex-1 py-2 text-sm"
        />
        <Button variant="secondary" size="sm" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
