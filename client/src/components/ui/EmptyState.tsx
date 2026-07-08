import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card grid place-items-center px-6 py-16 text-center"
    >
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-500/10 text-brand-400">
        {icon}
      </div>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-400">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
