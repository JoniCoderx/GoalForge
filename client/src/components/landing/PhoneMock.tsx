import { motion } from 'framer-motion';

/** A stylised vertical short preview that mirrors the real rendered output. */
export function PhoneMock({
  heading = '#1',
  caption = 'Lionel Messi',
  stat = '93 OVR',
  watermark = '@goalforge',
}: {
  heading?: string;
  caption?: string;
  stat?: string;
  watermark?: string;
}) {
  return (
    <div className="relative mx-auto w-[248px]">
      <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.2rem] border-[6px] border-ink-700 bg-ink-950 shadow-[0_40px_120px_-30px_rgba(34,197,94,0.5)]">
        {/* Radial glow bg, matching the render engine */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 40% at 50% 30%, rgba(34,197,94,0.55), transparent 70%), linear-gradient(180deg,#0a1120,#050914)',
          }}
        />
        <div className="absolute inset-x-0 top-0 h-1.5 bg-brand-500" />
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-brand-500/60" />

        <div className="relative flex h-full flex-col items-center justify-center px-5 text-center">
          <motion.p
            key={heading}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-5xl font-bold text-white drop-shadow"
          >
            {heading}
          </motion.p>
          <motion.div
            key={caption}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-8 rounded-lg bg-brand-500/90 px-4 py-2.5"
          >
            <span className="font-display text-xl font-bold uppercase leading-tight text-white">{caption}</span>
          </motion.div>
          <div className="mt-3 rounded-md bg-white/90 px-3 py-1 font-display text-sm font-bold text-ink-950">
            {stat}
          </div>
          <p className="absolute bottom-8 text-sm font-medium text-white/80">{watermark}</p>
          {/* progress */}
          <motion.div
            className="absolute bottom-4 left-0 h-1 bg-brand-400"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>
      {/* floating badges */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="glass absolute -left-16 top-16 hidden rounded-xl px-3 py-2 text-xs font-medium text-white sm:block"
      >
        🎬 Auto captions
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="glass absolute -right-14 bottom-24 hidden rounded-xl px-3 py-2 text-xs font-medium text-white sm:block"
      >
        #15 hashtags ✓
      </motion.div>
    </div>
  );
}
