import { motion } from 'framer-motion';
import { PhoneMock } from './PhoneMock';

const templates = [
  { icon: '🔮', name: 'Match Predictions' },
  { icon: '🏆', name: 'Top 10 Players' },
  { icon: '🤯', name: 'Football Facts' },
  { icon: '📰', name: 'Transfer News' },
  { icon: '📊', name: 'Tactical Analysis' },
  { icon: '⚡', name: 'Best Goals' },
  { icon: '🌟', name: 'Player Spotlight' },
  { icon: '❓', name: 'Quiz Videos' },
];

export function Demo() {
  return (
    <section id="demo" className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-mesh opacity-40" />
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="chip border border-white/10 bg-white/5 text-brand-300">Live demo</p>
            <h2 className="mt-4 font-display text-4xl font-semibold text-white text-balance">
              From prompt to post in three seconds
            </h2>
            <p className="mt-4 text-slate-400">
              Choose one of ten pro templates and GoalForge composes the full short — heading animations, caption
              cards, stat chips, brand watermark and a live progress bar.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-2">
              {templates.map((t, i) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="text-sm font-medium text-slate-200">{t.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="relative">
            <PhoneMock heading="TOP 10" caption="Best Strikers" stat="🔥 2024" />
          </div>
        </div>
      </div>
    </section>
  );
}
