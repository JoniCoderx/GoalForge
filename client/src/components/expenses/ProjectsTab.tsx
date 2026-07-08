import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  FolderKanban,
  Archive,
  ArchiveRestore,
  Trash2,
  Wallet,
  Repeat,
  Coins,
  Receipt,
} from 'lucide-react';
import { expensesApi, ApiError } from '@/lib/api';
import type { ExpenseProject } from '@/lib/types';
import { formatRelative } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDelete, ErrorState } from './shared';
import { ProjectDetail } from './ProjectDetail';
import { QK, formatMoney } from './utils';

export function ProjectsTab() {
  const qc = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ExpenseProject | null>(null);
  const [deleting, setDeleting] = useState<ExpenseProject | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...QK.projects, showArchived],
    queryFn: () => expensesApi.projects(showArchived),
  });

  const projects = data?.projects ?? [];

  const archiveMut = useMutation({
    mutationFn: (p: ExpenseProject) => expensesApi.updateProject(p.id, { archived: !p.archived }),
    onSuccess: (_res, p) => {
      qc.invalidateQueries({ queryKey: QK.projects });
      qc.invalidateQueries({ queryKey: QK.dashboard });
      toast.success(p.archived ? 'Project unarchived' : 'Project archived');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Update failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (p: ExpenseProject) => expensesApi.deleteProject(p.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.projects });
      qc.invalidateQueries({ queryKey: QK.dashboard });
      qc.invalidateQueries({ queryKey: QK.expenses });
      toast.success('Project deleted');
      setDeleting(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Delete failed'),
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-ink-900 accent-brand-500"
          />
          Show archived
        </label>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState label="Could not load projects." onRetry={() => refetch()} />
      ) : !projects.length ? (
        <EmptyState
          icon={<FolderKanban className="h-7 w-7" />}
          title={showArchived ? 'No projects' : 'No projects yet'}
          description="Create your first project to start tracking costs. Every expense belongs to a project."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> New project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <ProjectCard
              key={p.id}
              project={p}
              index={i}
              busy={archiveMut.isPending}
              onOpen={() => setOpenId(p.id)}
              onEdit={() => setEditing(p)}
              onArchive={() => archiveMut.mutate(p)}
              onDelete={() => setDeleting(p)}
            />
          ))}
        </div>
      )}

      {/* Create / edit */}
      <Modal open={creating} onClose={() => setCreating(false)} title="New project" size="md">
        {creating && <ProjectForm onClose={() => setCreating(false)} />}
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit project" size="md">
        {editing && <ProjectForm key={editing.id} project={editing} onClose={() => setEditing(null)} />}
      </Modal>

      {/* Delete */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete project" size="sm">
        {deleting && (
          <ConfirmDelete
            confirmLabel="Delete project"
            loading={deleteMut.isPending}
            onCancel={() => setDeleting(null)}
            onConfirm={() => deleteMut.mutate(deleting)}
            message={
              <>
                Delete <span className="font-medium text-white">{deleting.name}</span> and all of its expenses? This
                cannot be undone.
              </>
            }
          />
        )}
      </Modal>

      {/* Detail */}
      <Modal open={!!openId} onClose={() => setOpenId(null)} title="Project details" size="xl">
        {openId && <ProjectDetail id={openId} onClose={() => setOpenId(null)} />}
      </Modal>
    </div>
  );
}

function ProjectCard({
  project,
  index,
  busy,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
}: {
  project: ExpenseProject;
  index: number;
  busy: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const cur = project.currency || 'USD';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="card flex flex-col p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate font-display text-lg font-semibold text-white">{project.name}</h3>
        {project.archived && <Badge color="text-slate-400 bg-white/5 border-white/10">Archived</Badge>}
      </div>
      <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-slate-400">
        {project.notes || 'No notes.'}
      </p>

      <div className="mt-4">
        <p className="text-xs text-slate-500">Total spent</p>
        <p className="font-display text-2xl font-semibold tabular-nums text-white">{formatMoney(project.totalSpent, cur)}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-slate-400">
          <Repeat className="h-3.5 w-3.5 text-sky-400" /> {formatMoney(project.monthlyRecurring, cur)}/mo
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <Coins className="h-3.5 w-3.5 text-amber-400" /> {formatMoney(project.oneTime, cur)} one-time
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <Receipt className="h-3.5 w-3.5 text-slate-400" /> {project.expenseCount} expenses
        </span>
        <span className="flex items-center gap-1.5 text-slate-500">
          <Wallet className="h-3.5 w-3.5" /> Updated {formatRelative(project.updatedAt)}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-1.5 border-t border-white/5 pt-4">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onOpen}>
          Open
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${project.name}`}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={onArchive}
          aria-label={project.archived ? `Unarchive ${project.name}` : `Archive ${project.name}`}
        >
          {project.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} aria-label={`Delete ${project.name}`}>
          <Trash2 className="h-4 w-4 text-rose-300" />
        </Button>
      </div>
    </motion.div>
  );
}

function ProjectForm({ project, onClose }: { project?: ExpenseProject; onClose: () => void }) {
  const qc = useQueryClient();
  const editing = !!project;
  const [name, setName] = useState(project?.name ?? '');
  const [notes, setNotes] = useState(project?.notes ?? '');

  const mut = useMutation({
    mutationFn: () =>
      editing
        ? expensesApi.updateProject(project!.id, { name: name.trim(), notes: notes.trim() })
        : expensesApi.createProject({ name: name.trim(), notes: notes.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.projects });
      qc.invalidateQueries({ queryKey: QK.dashboard });
      if (editing) qc.invalidateQueries({ queryKey: QK.project(project!.id) });
      toast.success(editing ? 'Project updated' : 'Project created');
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Save failed'),
  });

  const valid = name.trim().length > 0;

  return (
    <div className="space-y-4">
      <div>
        <span className="label">
          Project name<span className="ml-0.5 text-rose-400">*</span>
        </span>
        <Input
          name="project-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g. "Website redesign"'
        />
      </div>
      <Textarea
        label="Notes"
        name="project-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What this project covers (optional)"
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} disabled={mut.isPending}>
          Cancel
        </Button>
        <Button onClick={() => mut.mutate()} loading={mut.isPending} disabled={!valid}>
          {editing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editing ? 'Save changes' : 'Create project'}
        </Button>
      </div>
    </div>
  );
}
