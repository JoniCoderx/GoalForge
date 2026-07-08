import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-400">{icon}</div>
        )}
        <div>
          <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  );
}
