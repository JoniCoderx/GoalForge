import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Copy,
  Download,
  Film,
  Hash,
  LayoutTemplate,
  Maximize2,
  Rocket,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { VideoThumb } from '@/components/dashboard/VideoThumb';
import { copyToClipboard, downloadUrl, formatDate, formatDuration } from '@/lib/utils';

export default function VideoDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['video', id],
    queryFn: () => api.videos.get(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.video.status;
      return status === 'QUEUED' || status === 'RENDERING' ? 2000 : false;
    },
  });

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: api.templates.list,
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  const video = data?.video;

  const exportMutation = useMutation({
    mutationFn: () => api.videos.export(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['queue'] });
      qc.invalidateQueries({ queryKey: ['videos'] });
      refetch();
      toast.success('Added to the render queue 🎬');
    },
    onError: () => toast.error('Could not start export'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.videos.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video deleted');
      navigate('/app/videos');
    },
    onError: () => toast.error('Could not delete video'),
  });

  const copy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    if (ok) toast.success(`${label} copied`);
    else toast.error('Copy failed');
  };

  if (isLoading) return <DetailSkeleton />;

  if (isError || !video) {
    return (
      <div>
        <BackLink />
        <EmptyState
          icon={<Film className="h-7 w-7" />}
          title="Video not found"
          description="This video may have been deleted or the link is incorrect."
          action={
            <Link to="/app/videos">
              <Button>Back to videos</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const templateName =
    templatesData?.templates.find((t) => t.key === video.templateKey)?.name ?? video.templateKey;
  const isReady = video.status === 'READY' && !!video.videoPath;
  const isBusy = video.status === 'QUEUED' || video.status === 'RENDERING';

  return (
    <div>
      <BackLink />
      <PageHeader
        icon={<Film className="h-5 w-5" />}
        title={video.title}
        subtitle={video.topic}
        actions={<StatusBadge status={video.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        {/* Left — player */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-3">
            {isReady ? (
              <video
                src={video.videoPath!}
                poster={video.thumbnailPath ?? undefined}
                controls
                playsInline
                className="aspect-[9/16] w-full rounded-xl border border-white/10 bg-ink-950"
              />
            ) : (
              <div className="relative">
                <VideoThumb video={video} />
                <div className="absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-ink-950/90 to-transparent p-4">
                  <p className="text-center text-xs font-medium text-slate-200">
                    {isBusy
                      ? video.status === 'QUEUED'
                        ? 'Queued for rendering…'
                        : 'Rendering your video…'
                      : video.status === 'FAILED'
                        ? video.error || 'Render failed — try exporting again'
                        : 'Not rendered yet — click Render & Export'}
                  </p>
                </div>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Button
              className="w-full"
              loading={exportMutation.isPending}
              disabled={isBusy}
              onClick={() => exportMutation.mutate()}
            >
              <Rocket className="h-4 w-4" /> {isReady ? 'Re-render' : 'Render & Export'}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={!isReady}
              onClick={() => downloadUrl(video.videoPath!, `goalforge-${video.id}.mp4`)}
            >
              <Download className="h-4 w-4" /> Download
            </Button>
            <Button
              variant="danger"
              className="w-full"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>

          <Card className="space-y-3 text-sm">
            <MetaRow icon={<LayoutTemplate className="h-4 w-4" />} label="Template" value={templateName} />
            <MetaRow icon={<Calendar className="h-4 w-4" />} label="Created" value={formatDate(video.createdAt)} />
            <MetaRow
              icon={<Clock className="h-4 w-4" />}
              label="Duration"
              value={video.durationSec > 0 ? formatDuration(video.durationSec) : '—'}
            />
            <MetaRow
              icon={<Maximize2 className="h-4 w-4" />}
              label="Dimensions"
              value={`${video.width}×${video.height} · ${video.fps} FPS`}
            />
          </Card>
        </div>

        {/* Right — content */}
        <div className="space-y-6">
          <Section title="Hook" onCopy={() => copy(video.hook, 'Hook')}>
            <p className="text-lg font-medium leading-relaxed text-white">{video.hook}</p>
          </Section>

          <Section title="Script" onCopy={() => copy(video.script, 'Script')}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{video.script}</p>
          </Section>

          <Card>
            <h3 className="mb-4 font-display font-semibold text-white">Scenes ({video.scenes.length})</h3>
            <div className="space-y-3">
              {video.scenes.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-brand-500/15 px-2 py-0.5 text-xs font-semibold text-brand-300">
                      Scene {i + 1}
                    </span>
                    <span className="text-sm font-medium text-white">{s.heading}</span>
                    {s.stat && (
                      <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-300">{s.stat}</span>
                    )}
                    <span className="ml-auto text-xs text-slate-500">{formatDuration(s.durationSec)}</span>
                  </div>
                  <p className="text-sm text-slate-300">{s.narration}</p>
                  {s.caption && (
                    <p className="mt-2 text-xs text-slate-500">
                      <span className="text-slate-400">Caption:</span> {s.caption}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </Card>

          <Section title="Caption" onCopy={() => copy(video.caption, 'Caption')}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{video.caption}</p>
          </Section>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display font-semibold text-white">
                <Hash className="h-4 w-4 text-brand-400" /> Hashtags ({video.hashtags.length})
              </h3>
              {video.hashtags.length > 0 && (
                <button
                  onClick={() => copy(video.hashtags.map((t) => `#${t}`).join(' '), 'Hashtags')}
                  className="btn-ghost px-2.5 py-1.5 text-xs"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy all
                </button>
              )}
            </div>
            {video.hashtags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {video.hashtags.map((t) => (
                  <span key={t} className="chip border border-brand-500/20 bg-brand-500/10 text-brand-300">
                    #{t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No hashtags.</p>
            )}
          </Card>

          <Card>
            <h3 className="mb-4 font-display font-semibold text-white">Platform descriptions</h3>
            <div className="space-y-4">
              <PlatformDesc label="TikTok" text={video.tiktokDescription} onCopy={copy} />
              <PlatformDesc label="Instagram" text={video.instagramDescription} onCopy={copy} />
              <PlatformDesc label="YouTube Shorts" text={video.youtubeDescription} onCopy={copy} />
            </div>
          </Card>
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete video" size="sm">
        <p className="text-sm text-slate-400">
          Are you sure you want to delete <span className="font-medium text-white">{video.title}</span>? This
          cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ─────────────────────────── helpers ─────────────────────────── */

function BackLink() {
  return (
    <Link to="/app/videos" className="btn-ghost mb-4 inline-flex text-sm">
      <ArrowLeft className="h-4 w-4" /> Back to videos
    </Link>
  );
}

function MetaRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-slate-400">
        {icon} {label}
      </span>
      <span className="truncate text-right font-medium text-white">{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
  onCopy,
}: {
  title: string;
  children: ReactNode;
  onCopy: () => void;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-semibold text-white">{title}</h3>
        <button onClick={onCopy} className="btn-ghost px-2.5 py-1.5 text-xs" aria-label={`Copy ${title}`}>
          <Copy className="h-3.5 w-3.5" /> Copy
        </button>
      </div>
      {children}
    </Card>
  );
}

function PlatformDesc({
  label,
  text,
  onCopy,
}: {
  label: string;
  text: string;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <button
          onClick={() => onCopy(text, `${label} description`)}
          className="text-slate-500 transition-colors hover:text-brand-300"
          aria-label={`Copy ${label} description`}
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{text}</p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="mb-4 h-8 w-32 rounded-lg" />
      <Skeleton className="mb-8 h-10 w-2/3 rounded-lg" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="space-y-4">
          <Skeleton className="aspect-[9/16] w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
