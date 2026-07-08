import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Sparkles,
  Clapperboard,
  ListVideo,
  FileText,
  LayoutTemplate,
  Terminal,
  Palette,
  History,
  BarChart3,
  Settings,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/store/auth';
import { Logo } from '@/components/brand/Logo';
import { UserMenu } from './UserMenu';
import { AiStatusPill } from './AiStatusPill';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/create', label: 'Create', icon: Sparkles, highlight: true },
  { to: '/app/videos', label: 'Videos', icon: Clapperboard },
  { to: '/app/queue', label: 'Export Queue', icon: ListVideo },
  { to: '/app/drafts', label: 'Drafts', icon: FileText },
  { to: '/app/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/app/prompts', label: 'Prompt Editor', icon: Terminal },
  { to: '/app/brand', label: 'Brand', icon: Palette },
  { to: '/app/exports', label: 'Export History', icon: History },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
              isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
              item.highlight && !isActive && 'text-brand-300'
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-brand-400"
                />
              )}
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
              {item.highlight && (
                <span className="ml-auto rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-300">
                  AI
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
      {user?.role === 'ADMIN' && (
        <NavLink
          to="/app/admin"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
              isActive ? 'bg-accent-violet/15 text-accent-violet' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            )
          }
        >
          <Shield className="h-[18px] w-[18px]" />
          Admin Panel
        </NavLink>
      )}
    </nav>
  );
}

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-ink-950 text-slate-200">
      <div className="pointer-events-none fixed inset-0 bg-grid-glow opacity-60" />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/5 bg-ink-900/60 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <NavItems />
        <div className="p-3">
          <AiStatusPill />
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-ink-900 lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            >
              <div className="flex h-16 items-center justify-between px-5">
                <Logo />
                <button onClick={() => setMobileOpen(false)} className="btn-ghost rounded-lg p-1.5">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <NavItems onNavigate={() => setMobileOpen(false)} />
              <div className="p-3">
                <AiStatusPill />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/5 bg-ink-950/70 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="btn-ghost rounded-lg p-2 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <UserMenu />
        </header>

        <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
