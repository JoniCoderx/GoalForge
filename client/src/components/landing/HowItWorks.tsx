import { motion } from 'framer-motion';
import { MousePointerClick, PencilRuler, Download } from 'lucide-react';

const steps = [
  {
    icon: MousePointerClick,
    step: '01',
    title: 'Pick a template & topic',
    desc: 'Choose from predictions, rankings, facts, transfers and more. Add a topic or let the AI decide.',
  },
  {
    icon: PencilRuler,
    step: '02',
    title: 'Generate & refine',
    desc: 'GoalForge writes the hook, script, scenes, captions, hashtags and descriptions. Edit anything inline.',
  },
  {
    icon: Download,
    step: '03',
    title: 'Render & export',
    desc: 'One click renders a vertical 1080×1920 MP4 with your branding — download and post everywhere.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="chip mx-auto border border-white/10 bg-white/5 text-brand-300">How it works</p>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white text-balance">
            Three steps to a viral-ready short
          </h2>
        </div>

        <div className="relative mt-16 grid gap-8 md:grid-cols-3">
          <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block" />
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative text-center"
            >
              <div className="relative z-10 mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-ink-800 shadow-glow">
                <s.icon className="h-7 w-7 text-brand-400" />
              </div>
              <p className="mt-5 font-display text-sm font-semibold text-brand-400">STEP {s.step}</p>
              <h3 className="mt-1 font-display text-xl font-semibold text-white">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm text-slate-400">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
