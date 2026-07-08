import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserPlan, UserStatus } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { initialsOf, USER_PLAN_META, USER_STATUS_META } from './console-utils';

/* ─────────── Avatar tile ─────────── */

export function Avatar({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-xl text-sm font-semibold text-white',
        className ?? 'h-11 w-11'
      )}
      style={{ background: color }}
    >
      {initialsOf(name)}
    </span>
  );
}

/* ─────────── Status + plan badges ─────────── */

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const meta = USER_STATUS_META[status] ?? USER_STATUS_META.active;
  return (
    <Badge color={meta.color}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </Badge>
  );
}

export function PlanBadge({ plan }: { plan: UserPlan }) {
  const meta = USER_PLAN_META[plan] ?? USER_PLAN_META.free;
  return <Badge color={meta.color}>{meta.label}</Badge>;
}

/* ─────────── Error state (with retry) ─────────── */

export function ErrorState({ label, onRetry }: { label: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<AlertTriangle className="h-7 w-7" />}
      title="Something went wrong"
      description={label}
      action={onRetry ? <Button onClick={onRetry}>Retry</Button> : undefined}
    />
  );
}
