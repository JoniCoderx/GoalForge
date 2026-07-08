import { motion } from 'framer-motion';

const balls = [
  { emoji: '⚽', top: '12%', left: '8%', size: 44, dur: 8, delay: 0 },
  { emoji: '🏆', top: '20%', left: '80%', size: 38, dur: 10, delay: 0.5 },
  { emoji: '🥅', top: '65%', left: '15%', size: 40, dur: 9, delay: 1 },
  { emoji: '⚽', top: '75%', left: '78%', size: 52, dur: 7, delay: 0.2 },
  { emoji: '🔥', top: '40%', left: '90%', size: 30, dur: 11, delay: 0.8 },
  { emoji: '📈', top: '48%', left: '5%', size: 32, dur: 9.5, delay: 1.4 },
];

export function FloatingBalls({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {balls.map((b, i) => (
        <motion.div
          key={i}
          className="absolute select-none opacity-40 blur-[0.4px]"
          style={{ top: b.top, left: b.left, fontSize: b.size }}
          animate={{ y: [0, -26, 0], rotate: [0, 12, 0] }}
          transition={{ duration: b.dur, delay: b.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          {b.emoji}
        </motion.div>
      ))}
    </div>
  );
}
