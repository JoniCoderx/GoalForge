import { cn } from '@/lib/utils';
import { STATUS_META } from '@/lib/utils';
import type { VideoStatus } from '@/lib/types';

export function Badge({
  children,
  className,
  color = 'text-slate-300 bg-white/5 border-white/10',
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
}) {
  return <span className={cn('chip border', color, className)}>{children}</span>;
}

export function StatusBadge({ status }: { status: VideoStatus | string }) {
  const meta = STATUS_META[status] ?? STATUS_META.DRAFT;
  const animate = status === 'RENDERING' || status === 'QUEUED';
  return (
    <span className={cn('chip border', meta.color)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot, animate && 'animate-pulse')} />
      {meta.label}
    </span>
  );
}
