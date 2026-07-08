import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, Mail, PlayCircle, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate, cn } from '@/lib/utils';

/* ─────────────────────────── Toggle switch ─────────────────────────── */

function Toggle({
  checked,
  onChange,
  label,
  description,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      <span className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300">
            {icon}
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-100">{label}</span>
          {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
        </span>
      </span>
      <span
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
          checked ? 'border-brand-400/50 bg-brand-500/80' : 'border-white/10 bg-white/10'
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={cn('inline-block h-4 w-4 rounded-full bg-white shadow-sm', checked ? 'ml-6' : 'ml-1')}
        />
      </span>
    </button>
  );
}

/* ─────────────────────────── Preferences (device-local) ─────────────────────────── */

interface Prefs {
  emailOnRender: boolean;
  autoplayPreviews: boolean;
}

const PREFS_KEY = 'goalforge_prefs';
const DEFAULT_PREFS: Prefs = {
  emailOnRender: true,
  autoplayPreviews: true,
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setPref = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    toast.success('Preference saved on this device');
  };

  const signOut = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <div>
      <PageHeader
        icon={<SettingsIcon className="h-5 w-5" />}
        title="Settings"
        subtitle="Manage your account, on-device preferences and session."
      />

      <div className="mx-auto max-w-3xl space-y-6">
        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div
                className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl font-display text-2xl font-bold text-white shadow-lg"
                style={{ backgroundColor: user.avatarColor }}
              >
                {initials(user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl font-semibold text-white">{user.name}</h2>
                  <Badge
                    color={
                      user.role === 'ADMIN'
                        ? 'text-accent-sky bg-sky-500/10 border-sky-500/20'
                        : 'text-brand-300 bg-brand-500/10 border-brand-500/20'
                    }
                  >
                    {user.role === 'ADMIN' ? 'Admin' : 'Member'}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-sm text-slate-400">{user.email}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Member since {formatDate(user.createdAt)}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Preferences */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <div className="mb-4">
              <h3 className="font-display font-semibold text-white">Preferences</h3>
              <p className="text-xs text-slate-500">Saved on this device</p>
            </div>
            <div className="divide-y divide-white/5">
              <div className="pb-4">
                <Toggle
                  checked={prefs.emailOnRender}
                  onChange={(v) => setPref('emailOnRender', v)}
                  label="Email me when a render finishes"
                  description="Get a nudge the moment your short is export-ready."
                  icon={<Mail className="h-4 w-4" />}
                />
              </div>
              <div className="pt-4">
                <Toggle
                  checked={prefs.autoplayPreviews}
                  onChange={(v) => setPref('autoplayPreviews', v)}
                  label="Autoplay previews"
                  description="Play video previews automatically as you browse."
                  icon={<PlayCircle className="h-4 w-4" />}
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Danger zone */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-rose-500/20 bg-rose-500/[0.03]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-300">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-display font-semibold text-white">Danger zone</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Sign out of GoalForge AI on this device.
                  </p>
                </div>
              </div>
              <Button variant="danger" onClick={signOut} className="shrink-0">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
