import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { imageUrl, type Exercise, type GymMember } from '@/lib/gym';

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn('rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-4', onClick && 'cursor-pointer active:bg-white/[0.07]', className)}
    >
      {children}
    </div>
  );
}

export function Avatar({ member, size = 40 }: { member: Pick<GymMember, 'emoji' | 'color'>; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: `radial-gradient(circle at 30% 25%, ${member.color}55, ${member.color}1a 70%)`,
        boxShadow: `inset 0 0 0 1.5px ${member.color}66`,
      }}
      aria-hidden="true"
    >
      {member.emoji}
    </span>
  );
}

/** Exercise machine photo, or a placeholder when none was taken yet. */
export function Thumb({ exercise, size = 64, className }: { exercise: Exercise | null; size?: number; className?: string }) {
  return exercise?.hasImage ? (
    <img
      src={imageUrl(exercise)}
      alt=""
      loading="lazy"
      className={cn('shrink-0 rounded-2xl object-cover', className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className={cn('grid shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-white/25', className)}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      🏋️
    </span>
  );
}

export function GymButton({
  children,
  onClick,
  variant = 'lime',
  disabled,
  loading,
  type = 'button',
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'lime' | 'red' | 'ghost' | 'soft';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  const styles = {
    lime: 'bg-[#d4ff3a] text-black active:bg-[#c2ef22]',
    red: 'bg-[#ff3b5c] text-white active:bg-[#e8304f]',
    ghost: 'border border-white/10 bg-transparent text-white active:bg-white/[0.06]',
    soft: 'bg-white/[0.07] text-white active:bg-white/[0.12]',
  }[variant];
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'inline-flex min-h-[52px] select-none items-center justify-center gap-2 rounded-2xl px-5 text-[17px] font-bold transition-colors disabled:opacity-40',
        styles,
        className
      )}
    >
      {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : children}
    </motion.button>
  );
}

export function Empty({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="text-5xl">{icon}</span>
      <p className="mt-4 text-lg font-bold text-white">{title}</p>
      {text && <p className="mt-1 max-w-xs text-[15px] text-white/50">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-7 flex items-center justify-between px-1">
      <h2 className="text-[15px] font-bold text-white/50">{children}</h2>
      {action}
    </div>
  );
}

/** A/B style segmented control. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-2xl bg-white/[0.06] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'relative flex-1 rounded-xl py-2.5 text-[15px] font-bold transition-colors',
            value === o.value ? 'text-black' : 'text-white/60'
          )}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${options.map((x) => x.value).join('')}`} className="absolute inset-0 rounded-xl bg-[#d4ff3a]" transition={{ type: 'spring', damping: 28, stiffness: 380 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** iOS-style bottom sheet. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" dir="rtl">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] max-w-lg flex-col rounded-t-[28px] border-t border-white/10 bg-[#141518] sm:bottom-6 sm:rounded-[28px] sm:border"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-white/20" />
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <h3 className="text-xl font-extrabold text-white">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="סגירה"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.08] text-white/70"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-2">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
