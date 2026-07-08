import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-4">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="card flex items-center gap-4 p-4">
      <Skeleton className="h-14 w-10 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );
}
