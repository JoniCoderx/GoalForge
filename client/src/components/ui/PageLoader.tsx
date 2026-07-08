export function PageLoader() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-ink-950">
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative h-16 w-16">
          <span className="absolute inset-0 rounded-full border-2 border-brand-500/30" />
          <span className="absolute inset-0 rounded-full border-t-2 border-brand-400 animate-spin" />
          <span className="absolute inset-0 grid place-items-center text-2xl">⚽</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
          <span className="gradient-text font-display text-base font-semibold">GoalForge AI</span>
        </div>
      </div>
    </div>
  );
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <span
      className={`inline-block ${className} rounded-full border-2 border-white/20 border-t-white animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}
