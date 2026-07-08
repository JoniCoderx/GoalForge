import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Search,
  Users as UsersIcon,
  Ban,
  ShieldCheck,
  Crown,
  Minus,
  RotateCcw,
  Video as VideoIcon,
  Rocket,
  Calendar,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react';
import { consoleApi, ApiError } from '@/lib/api';
import type { ConsoleUser, UserPlan, UserStatus } from '@/lib/types';
import { cn, formatNumber, formatDate, formatRelative } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/PageLoader';
import { StatusBadge } from '@/components/ui/Badge';
import { Avatar, UserStatusBadge, PlanBadge, ErrorState } from './shared';

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'trial', label: 'Trial' },
  { key: 'expired', label: 'Expired' },
  { key: 'banned', label: 'Banned' },
];

const PLAN_FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'free', label: 'Free' },
  { key: 'creator', label: 'Creator' },
  { key: 'studio', label: 'Studio' },
];

const PLAN_OPTIONS: UserPlan[] = ['free', 'creator', 'studio'];
const STATUS_OPTIONS: UserStatus[] = ['active', 'trial', 'expired', 'banned'];

function Chips({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            'chip border transition',
            value === o.key
              ? 'border-brand-400/40 bg-brand-500/15 text-brand-200'
              : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function UsersTab() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [plan, setPlan] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['console-users', { search, status, plan }],
    queryFn: () =>
      consoleApi.users({
        search: search || undefined,
        status: status === 'all' ? undefined : status,
        plan: plan === 'all' ? undefined : plan,
      }),
  });

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const users = data?.users ?? [];

  return (
    <div>
      {/* Controls */}
      <div className="card space-y-4 p-4">
        <form onSubmit={submitSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email…"
              className="input pl-10"
              aria-label="Search users"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
            <Chips options={STATUS_FILTERS} value={status} onChange={setStatus} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Plan</p>
            <Chips options={PLAN_FILTERS} value={plan} onChange={setPlan} />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState label="Could not load users." onRetry={() => refetch()} />
        ) : !users.length ? (
          <EmptyState
            icon={<UsersIcon className="h-7 w-7" />}
            title="No users found"
            description={
              search || status !== 'all' || plan !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'User accounts will appear here once people sign up.'
            }
          />
        ) : (
          <div className="space-y-3">
            {users.map((u, i) => (
              <UserRow key={u.id} user={u} index={i} onClick={() => setSelectedId(u.id)} />
            ))}
          </div>
        )}
      </div>

      <Modal open={!!selectedId} onClose={() => setSelectedId(null)} title="User details" size="xl">
        {selectedId && <UserDetail id={selectedId} onClose={() => setSelectedId(null)} />}
      </Modal>
    </div>
  );
}

function UserRow({ user, index, onClick }: { user: ConsoleUser; index: number; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      onClick={onClick}
      className="card w-full p-4 text-left transition-all hover:-translate-y-0.5 hover:border-white/20"
    >
      {/* Desktop grid / mobile stack */}
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={user.name} color={user.avatarColor} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-white">{user.name}</p>
          <p className="truncate text-sm text-slate-400">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <PlanBadge plan={user.plan} />
          <UserStatusBadge status={user.status} />
        </div>
        <div className="hidden items-center gap-4 text-xs text-slate-400 md:flex">
          <span className="flex items-center gap-1" title="Videos">
            <VideoIcon className="h-3.5 w-3.5" /> {formatNumber(user.videos)}
          </span>
          <span className="flex items-center gap-1" title="Exports">
            <Rocket className="h-3.5 w-3.5" /> {formatNumber(user.exports)}
          </span>
        </div>
        <div className="hidden text-right text-xs text-slate-500 lg:block">
          <p>Joined {formatDate(user.createdAt)}</p>
          <p>Active {formatRelative(user.lastActivityAt)}</p>
        </div>
      </div>
      {/* Mobile-only meta row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 md:hidden">
        <span className="flex items-center gap-1">
          <VideoIcon className="h-3.5 w-3.5" /> {formatNumber(user.videos)} videos
        </span>
        <span className="flex items-center gap-1">
          <Rocket className="h-3.5 w-3.5" /> {formatNumber(user.exports)} exports
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {formatRelative(user.lastActivityAt)}
        </span>
      </div>
    </motion.button>
  );
}

type ConfirmKind = 'ban' | 'removePremium' | null;

function UserDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['console-user', id],
    queryFn: () => consoleApi.user(id),
  });

  const [premiumDays, setPremiumDays] = useState(30);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);

  const mut = useMutation({
    mutationFn: (payload: Parameters<typeof consoleApi.updateUser>[1]) => consoleApi.updateUser(id, payload),
    onSuccess: (_res, payload) => {
      qc.invalidateQueries({ queryKey: ['console-users'] });
      qc.invalidateQueries({ queryKey: ['console-metrics'] });
      qc.invalidateQueries({ queryKey: ['console-user', id] });
      toast.success(labelForAction(payload));
      setConfirm(null);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Update failed'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }
  if (isError || !data) {
    return <ErrorState label="Could not load user details." onRetry={() => refetch()} />;
  }

  const { user, videos, activity, failedRenders } = data;
  const busy = mut.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={user.name} color={user.avatarColor} className="h-14 w-14 text-base" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-white">{user.name}</p>
          <p className="truncate text-sm text-slate-400">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <PlanBadge plan={user.plan} />
          <UserStatusBadge status={user.status} />
        </div>
      </div>

      {/* Key facts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact icon={<VideoIcon className="h-4 w-4" />} label="Videos" value={formatNumber(user.videos)} />
        <Fact icon={<Rocket className="h-4 w-4" />} label="Exports" value={formatNumber(user.exports)} />
        <Fact icon={<AlertTriangle className="h-4 w-4" />} label="Failed renders" value={formatNumber(failedRenders)} />
        <Fact
          icon={<Crown className="h-4 w-4" />}
          label="Premium until"
          value={user.premiumUntil ? formatDate(user.premiumUntil) : '—'}
        />
        <Fact icon={<Calendar className="h-4 w-4" />} label="Registered" value={formatDate(user.createdAt)} />
        <Fact icon={<Clock className="h-4 w-4" />} label="Last activity" value={formatRelative(user.lastActivityAt)} />
        <Fact icon={<RotateCcw className="h-4 w-4" />} label="Usage reset" value={formatDate(user.usageResetAt)} />
        <Fact icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={user.role === 'ADMIN' ? 'Admin' : 'User'} />
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center gap-2">
          <h4 className="text-sm font-semibold text-white">Actions</h4>
          {busy && <Spinner className="h-4 w-4" />}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {/* Ban / Unban */}
          {user.status === 'banned' ? (
            <Button variant="secondary" disabled={busy} onClick={() => mut.mutate({ action: 'unban' })}>
              <ShieldCheck className="h-4 w-4" /> Unban
            </Button>
          ) : (
            <Button variant="danger" disabled={busy} onClick={() => setConfirm('ban')}>
              <Ban className="h-4 w-4" /> Ban user
            </Button>
          )}

          {/* Grant premium with day selector */}
          <div className="flex items-end gap-2">
            <div className="w-24">
              <label className="label" htmlFor="premium-days">
                Days
              </label>
              <Input
                id="premium-days"
                type="number"
                min={1}
                max={365}
                value={premiumDays}
                onChange={(e) => setPremiumDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
              />
            </div>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => mut.mutate({ action: 'grantPremium', premiumDays })}
            >
              <Crown className="h-4 w-4" /> Grant premium
            </Button>
          </div>

          {/* Remove premium */}
          <Button variant="ghost" disabled={busy} onClick={() => setConfirm('removePremium')}>
            <Minus className="h-4 w-4" /> Remove premium
          </Button>

          {/* Reset limits */}
          <Button variant="ghost" disabled={busy} onClick={() => mut.mutate({ action: 'resetLimits' })}>
            <RotateCcw className="h-4 w-4" /> Reset limits
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="user-plan">
              Change plan
            </label>
            <select
              id="user-plan"
              value={user.plan}
              disabled={busy}
              onChange={(e) => mut.mutate({ plan: e.target.value as UserPlan })}
              className="input capitalize disabled:opacity-50"
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p} className="capitalize">
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="user-status">
              Set status
            </label>
            <select
              id="user-status"
              value={user.status}
              disabled={busy}
              onChange={(e) => mut.mutate({ status: e.target.value as UserStatus })}
              className="input capitalize disabled:opacity-50"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Recent videos */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-white">Recent videos</h4>
        {videos.length ? (
          <div className="space-y-2">
            {videos.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{v.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {v.templateKey} · {formatDate(v.createdAt)}
                  </p>
                </div>
                <StatusBadge status={v.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No videos yet.</p>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-white">Recent activity</h4>
        {activity.length ? (
          <div className="space-y-2">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-slate-200">{a.message}</p>
                  <p className="text-xs text-slate-500">{a.type}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">{formatRelative(a.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No recent activity.</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" /> Close
        </Button>
      </div>

      {/* Confirmation modals */}
      <Modal open={confirm === 'ban'} onClose={() => setConfirm(null)} title="Ban user" size="sm">
        <ConfirmBody
          message={
            <>
              Ban <span className="font-medium text-white">{user.name}</span>? They will lose access until unbanned.
            </>
          }
          confirmLabel="Ban user"
          confirmIcon={<Ban className="h-4 w-4" />}
          loading={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => mut.mutate({ action: 'ban' })}
        />
      </Modal>

      <Modal open={confirm === 'removePremium'} onClose={() => setConfirm(null)} title="Remove premium" size="sm">
        <ConfirmBody
          message={
            <>
              Remove premium from <span className="font-medium text-white">{user.name}</span>? Premium access will end
              immediately.
            </>
          }
          confirmLabel="Remove premium"
          confirmIcon={<Minus className="h-4 w-4" />}
          loading={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => mut.mutate({ action: 'removePremium' })}
        />
      </Modal>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function ConfirmBody({
  message,
  confirmLabel,
  confirmIcon,
  loading,
  onCancel,
  onConfirm,
}: {
  message: React.ReactNode;
  confirmLabel: string;
  confirmIcon: React.ReactNode;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm text-slate-300">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>
          {confirmIcon} {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

function labelForAction(payload: Parameters<typeof consoleApi.updateUser>[1]): string {
  if (payload.action === 'ban') return 'User banned';
  if (payload.action === 'unban') return 'User unbanned';
  if (payload.action === 'grantPremium') return 'Premium granted';
  if (payload.action === 'removePremium') return 'Premium removed';
  if (payload.action === 'resetLimits') return 'Usage limits reset';
  if (payload.plan) return 'Plan updated';
  if (payload.status) return 'Status updated';
  return 'User updated';
}
