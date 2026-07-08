import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Shield,
  Users,
  LayoutTemplate,
  Sparkles,
  ScrollText,
  Cpu,
  Video as VideoIcon,
  Film,
  Layers,
  Gauge,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  Info,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminUser, LogEntry, Prompt, Template } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/PageLoader';
import { cn, formatNumber, formatRelative } from '@/lib/utils';

/* ─────────────────────────── Shared helpers ─────────────────────────── */

type TabKey = 'users' | 'templates' | 'prompts' | 'logs';

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'users', label: 'Users', icon: Users },
  { key: 'templates', label: 'Templates', icon: LayoutTemplate },
  { key: 'prompts', label: 'Prompts', icon: Sparkles },
  { key: 'logs', label: 'Logs', icon: ScrollText },
];

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function ErrorNote({ label }: { label: string }) {
  return (
    <div className="card flex items-center gap-3 p-6 text-sm text-rose-300">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      {label}
    </div>
  );
}

function OpenAiPill({ configured, model }: { configured?: boolean; model?: string }) {
  if (configured === undefined) return <Skeleton className="h-8 w-36 rounded-full" />;
  return (
    <span
      className={cn(
        'chip border',
        configured
          ? 'border-brand-500/30 bg-brand-500/10 text-brand-300'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      )}
    >
      <Cpu className="h-3.5 w-3.5" />
      {configured ? model : 'local fallback'}
    </span>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function Admin() {
  const [tab, setTab] = useState<TabKey>('users');
  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: api.admin.stats,
  });

  return (
    <div>
      <PageHeader
        icon={<Shield className="h-5 w-5 text-violet-300" />}
        title="Admin Panel"
        subtitle="Manage users, templates, prompts, and inspect system activity."
        actions={<OpenAiPill configured={stats?.openai.configured} model={stats?.openai.model} />}
      />

      {/* Stats */}
      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : statsError || !stats ? (
        <ErrorNote label="Could not load admin stats." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Users" value={stats.users} icon={<Users className="h-5 w-5" />} accent="violet" delay={0} />
          <StatCard label="Videos" value={stats.videos} icon={<VideoIcon className="h-5 w-5" />} accent="sky" delay={0.04} />
          <StatCard label="Rendered" value={stats.rendered} icon={<Film className="h-5 w-5" />} accent="brand" delay={0.08} />
          <StatCard label="Exports" value={stats.jobs} icon={<Layers className="h-5 w-5" />} accent="amber" delay={0.12} />
          <StatCard label="Templates" value={stats.templates} icon={<LayoutTemplate className="h-5 w-5" />} accent="violet" delay={0.16} />
          <StatCard label="Queue depth" value={stats.queueDepth} icon={<Gauge className="h-5 w-5" />} accent="rose" delay={0.2} />
        </div>
      )}

      {/* Segmented control */}
      <div className="mt-8 mb-6">
        <div className="card inline-flex flex-wrap gap-1 p-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                  active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="admin-tab"
                    className="absolute inset-0 rounded-xl border border-violet-400/30 bg-violet-500/20"
                    transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                  />
                )}
                <t.icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'users' && <UsersTab />}
          {tab === 'templates' && <TemplatesTab />}
          {tab === 'prompts' && <PromptsTab />}
          {tab === 'logs' && <LogsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────── Users tab ─────────────────────────── */

function UsersTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin-users'], queryFn: api.admin.users });
  const [pendingId, setPendingId] = useState<string | null>(null);

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'USER' | 'ADMIN' }) => api.admin.setRole(id, role),
    onMutate: ({ id }) => setPendingId(id),
    onSuccess: (_, { role }) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success(`Role updated to ${role === 'ADMIN' ? 'Admin' : 'User'}`);
    },
    onError: () => toast.error('Could not update role'),
    onSettled: () => setPendingId(null),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorNote label="Could not load users." />;

  const users = data?.users ?? [];
  if (!users.length) {
    return <EmptyState icon={<Users className="h-7 w-7" />} title="No users yet" description="User accounts will appear here once people sign up." />;
  }

  return (
    <div className="space-y-3">
      {users.map((u, i) => (
        <UserRow
          key={u.id}
          user={u}
          index={i}
          pending={pendingId === u.id && roleMut.isPending}
          onRole={(role) => roleMut.mutate({ id: u.id, role })}
        />
      ))}
    </div>
  );
}

function UserRow({
  user,
  index,
  pending,
  onRole,
}: {
  user: AdminUser;
  index: number;
  pending: boolean;
  onRole: (role: 'USER' | 'ADMIN') => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="card flex flex-wrap items-center gap-4 p-4"
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-semibold text-white"
        style={{ background: user.avatarColor }}
      >
        {initialsOf(user.name)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-white">{user.name}</p>
          {user.role === 'ADMIN' && (
            <Badge color="text-violet-300 bg-violet-500/10 border-violet-500/20">
              <Shield className="h-3 w-3" /> Admin
            </Badge>
          )}
        </div>
        <p className="truncate text-sm text-slate-400">{user.email}</p>
      </div>

      <div className="hidden items-center gap-4 text-xs text-slate-400 sm:flex">
        <span className="flex items-center gap-1" title="Videos">
          <VideoIcon className="h-3.5 w-3.5" /> {formatNumber(user._count.videos)}
        </span>
        <span className="flex items-center gap-1" title="Exports">
          <Layers className="h-3.5 w-3.5" /> {formatNumber(user._count.exportJobs)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {pending && <Spinner className="h-4 w-4" />}
        <select
          value={user.role}
          disabled={pending}
          onChange={(e) => onRole(e.target.value as 'USER' | 'ADMIN')}
          className="input w-auto py-2 text-sm disabled:opacity-50"
          aria-label={`Role for ${user.name}`}
        >
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────── Templates tab ─────────────────────────── */

function TemplatesTab() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['templates'], queryFn: api.templates.list });
  const [editing, setEditing] = useState<Template | null>(null);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorNote label="Could not load templates." />;

  const templates = data?.templates ?? [];
  if (!templates.length) {
    return <EmptyState icon={<LayoutTemplate className="h-7 w-7" />} title="No templates" description="Content templates will show up here." />;
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t, i) => (
          <motion.button
            key={t.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => setEditing(t)}
            className="card group flex items-start gap-4 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-white/20"
          >
            <div className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-2xl', t.gradient)}>
              {t.icon}
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-white">{t.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{t.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                  {t.category} · {t.sceneCount} scenes
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: t.accentColor }} />
                  {t.accentColor}
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit template" size="lg">
        {editing && <TemplateForm key={editing.key} template={editing} onClose={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

function TemplateForm({ template, onClose }: { template: Template; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [category, setCategory] = useState(template.category);
  const [sceneCount, setSceneCount] = useState(template.sceneCount);
  const [promptTemplate, setPromptTemplate] = useState(template.promptTemplate);
  const [accentColor, setAccentColor] = useState(template.accentColor);

  const mut = useMutation({
    mutationFn: () =>
      api.admin.updateTemplate(template.key, { name, description, category, sceneCount, promptTemplate, accentColor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Template updated');
      onClose();
    },
    onError: () => toast.error('Update failed'),
  });

  const valid = name.trim().length > 0 && promptTemplate.trim().length > 0;

  return (
    <div className="space-y-4">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <Input
          label="Scene count"
          type="number"
          min={3}
          max={10}
          value={sceneCount}
          onChange={(e) => setSceneCount(Math.max(3, Math.min(10, Number(e.target.value) || 3)))}
          hint="Between 3 and 10"
        />
      </div>
      <Textarea
        label="Prompt template"
        value={promptTemplate}
        onChange={(e) => setPromptTemplate(e.target.value)}
        rows={5}
        className="font-mono text-xs"
      />
      <div>
        <label className="label">Accent color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent"
            aria-label="Accent color picker"
          />
          <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="font-mono" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={mut.isPending} disabled={!valid} onClick={() => mut.mutate()}>
          <Save className="h-4 w-4" /> Save changes
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Prompts tab ─────────────────────────── */

function PromptsTab() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['prompts'], queryFn: api.prompts.list });
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Prompt | null>(null);

  const prompts = data?.prompts ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-400">{prompts.length} prompt{prompts.length === 1 ? '' : 's'}</p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New prompt
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorNote label="Could not load prompts." />
      ) : !prompts.length ? (
        <EmptyState
          icon={<Sparkles className="h-7 w-7" />}
          title="No prompts yet"
          description="Create a reusable prompt to guide the AI."
          action={
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> New prompt
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {prompts.map((p, i) => (
            <motion.div
              key={p.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="card flex items-start gap-4 p-4"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{p.name}</p>
                  {p.isSystem && (
                    <Badge color="text-violet-300 bg-violet-500/10 border-violet-500/20">
                      <Shield className="h-3 w-3" /> System
                    </Badge>
                  )}
                  <Badge>{p.category}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-slate-400">{p.description}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-500">{p.key}</p>
              </div>
              {!p.isSystem && (
                <Button variant="ghost" size="sm" onClick={() => setDeleting(p)} aria-label={`Delete ${p.name}`}>
                  <Trash2 className="h-4 w-4 text-rose-300" />
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New prompt" size="lg">
        {creating && <CreatePromptForm onClose={() => setCreating(false)} />}
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete prompt" size="sm">
        {deleting && <DeletePromptConfirm prompt={deleting} onClose={() => setDeleting(null)} />}
      </Modal>
    </div>
  );
}

function CreatePromptForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');

  const mut = useMutation({
    mutationFn: () => api.admin.createPrompt({ key, name, description, category, content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Prompt created');
      onClose();
    },
    onError: () => toast.error('Could not create prompt'),
  });

  const valid = key.trim() && name.trim() && content.trim();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Key"
          value={key}
          onChange={(e) => setKey(e.target.value.replace(/\s+/g, '-').toLowerCase())}
          placeholder="e.g. hype-intro"
          className="font-mono"
        />
        <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. narration" />
      </div>
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Human-friendly name" />
      <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      <Textarea
        label="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={6}
        className="font-mono text-xs"
        placeholder="The prompt text…"
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button loading={mut.isPending} disabled={!valid} onClick={() => mut.mutate()}>
          <Plus className="h-4 w-4" /> Create prompt
        </Button>
      </div>
    </div>
  );
}

function DeletePromptConfirm({ prompt, onClose }: { prompt: Prompt; onClose: () => void }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => api.admin.deletePrompt(prompt.key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prompts'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Prompt deleted');
      onClose();
    },
    onError: () => toast.error('Could not delete prompt'),
  });

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm text-slate-300">
          Delete the prompt <span className="font-medium text-white">{prompt.name}</span>? This action cannot be undone.
        </p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" loading={mut.isPending} onClick={() => mut.mutate()}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Logs tab ─────────────────────────── */

type LevelFilter = 'all' | 'info' | 'warn' | 'error';
const LEVELS: LevelFilter[] = ['all', 'info', 'warn', 'error'];

const LEVEL_META: Record<string, { color: string; icon: LucideIcon }> = {
  info: { color: 'text-slate-300 bg-white/5 border-white/10', icon: Info },
  warn: { color: 'text-amber-300 bg-amber-500/10 border-amber-500/20', icon: AlertTriangle },
  error: { color: 'text-rose-300 bg-rose-500/10 border-rose-500/20', icon: XCircle },
};

function parseContext(ctx: string): Record<string, unknown> | null {
  if (!ctx) return null;
  try {
    const parsed = JSON.parse(ctx);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function LogsTab() {
  const [level, setLevel] = useState<LevelFilter>('all');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-logs', level],
    queryFn: () => api.admin.logs(level === 'all' ? undefined : level),
  });

  const logs = data?.logs ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={cn(
              'chip border capitalize transition',
              level === l
                ? 'border-violet-400/40 bg-violet-500/15 text-violet-200'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorNote label="Could not load logs." />
      ) : !logs.length ? (
        <EmptyState
          icon={<ScrollText className="h-7 w-7" />}
          title="No logs"
          description={level === 'all' ? 'System activity will appear here.' : `No ${level} logs recorded.`}
        />
      ) : (
        <div className="space-y-3">
          {logs.map((log, i) => (
            <LogRow key={log.id} log={log} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogRow({ log, index }: { log: LogEntry; index: number }) {
  const meta = LEVEL_META[log.level] ?? LEVEL_META.info;
  const context = parseContext(log.context);
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge color={meta.color}>
            <Icon className="h-3 w-3" />
            {log.level.toUpperCase()}
          </Badge>
          <p className="truncate text-sm text-white">{log.message}</p>
        </div>
        <span className="shrink-0 text-xs text-slate-500">{formatRelative(log.createdAt)}</span>
      </div>
      {context && (
        <pre className="mt-3 overflow-x-auto rounded-lg border border-white/5 bg-black/30 p-3 text-[11px] leading-relaxed text-slate-400">
          {JSON.stringify(context, null, 2)}
        </pre>
      )}
    </motion.div>
  );
}
