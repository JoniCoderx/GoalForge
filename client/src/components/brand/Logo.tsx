import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0a1120" />
      <rect width="64" height="64" rx="16" fill="url(#lg)" opacity="0.12" />
      <circle cx="32" cy="32" r="17" fill="none" stroke="url(#lg)" strokeWidth="3" />
      <path d="M32 17 L38 27 L32 33 L26 27 Z" fill="url(#lg)" />
      <path d="M32 33 L40 39 L36 47 L28 47 L24 39 Z" fill="url(#lg)" opacity="0.8" />
    </svg>
  );
}

export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link to={to} className={cn('flex items-center gap-2.5', className)}>
      <LogoMark className="h-8 w-8" />
      <span className="font-display text-lg font-semibold tracking-tight text-white">
        GoalForge<span className="text-brand-400"> AI</span>
      </span>
    </Link>
  );
}
