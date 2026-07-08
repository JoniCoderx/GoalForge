import { motion } from 'framer-motion';
import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  children: ReactNode;
}

export function Card({ hover, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('card p-5', hover && 'transition-all hover:border-white/20 hover:bg-white/[0.06]', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function MotionCard({
  className,
  children,
  delay = 0,
}: {
  className?: string;
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn('card p-5', className)}
    >
      {children}
    </motion.div>
  );
}
