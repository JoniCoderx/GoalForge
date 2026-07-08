import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logo } from '@/components/brand/Logo';
import { FloatingBalls } from '@/components/landing/FloatingBalls';

const perks = [
  'One-click viral football shorts',
  '10 pro content templates',
  'AI scripts, captions & hashtags',
  'TikTok-ready 1080×1920 exports',
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="relative flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Logo className="mb-10" />
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-3xl font-semibold text-white">{title}</h1>
            <p className="mt-2 text-slate-400">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <div className="mt-6 text-sm text-slate-400">{footer}</div>
          </motion.div>
        </div>
      </div>

      {/* Visual side */}
      <div className="relative hidden overflow-hidden border-l border-white/5 bg-ink-900 lg:block">
        <div className="absolute inset-0 bg-mesh opacity-80" />
        <FloatingBalls />
        <div className="relative flex h-full flex-col justify-center px-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-strong max-w-md rounded-3xl p-8"
          >
            <p className="chip border border-brand-500/30 bg-brand-500/10 text-brand-300">⚽ GoalForge AI</p>
            <h2 className="mt-5 font-display text-3xl font-semibold leading-tight text-white text-balance">
              Turn one prompt into scroll-stopping football content.
            </h2>
            <ul className="mt-8 space-y-3">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-3 text-slate-200">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500/20 text-xs text-brand-300">
                    ✓
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <Link to="/" className="mt-8 inline-block text-sm text-brand-300 hover:text-brand-200">
              ← Back to homepage
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
