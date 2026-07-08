import { motion } from 'framer-motion';
import {
  Sparkles,
  Captions,
  Hash,
  Wand2,
  Clapperboard,
  Palette,
  BarChart3,
  Rocket,
  ShieldCheck,
} from 'lucide-react';

const features = [
  { icon: Wand2, title: 'One-click generation', desc: 'Pick a template, hit generate — get a complete, editable content package in seconds.', accent: 'text-brand-400 bg-brand-500/10' },
  { icon: Clapperboard, title: 'Automated video engine', desc: 'Scenes, subtitles, animated captions, motion graphics, transitions and a watermark — rendered with FFmpeg.', accent: 'text-accent-sky bg-sky-500/10' },
  { icon: Captions, title: 'Hooks & scripts', desc: 'Scroll-stopping hooks, tight scripts and scene breakdowns tuned for retention.', accent: 'text-accent-violet bg-violet-500/10' },
  { icon: Hash, title: '15–20 smart hashtags', desc: 'Platform-native descriptions for TikTok, Instagram and YouTube plus a balanced hashtag set.', accent: 'text-accent-amber bg-amber-500/10' },
  { icon: Palette, title: 'Your brand, baked in', desc: 'Colours, fonts, watermark and CTA applied automatically to every export.', accent: 'text-accent-rose bg-rose-500/10' },
  { icon: BarChart3, title: 'Analytics dashboard', desc: 'Track your library, export queue and engagement with modern, animated charts.', accent: 'text-brand-400 bg-brand-500/10' },
  { icon: Rocket, title: 'TikTok-optimised export', desc: 'Vertical 1080×1920 at 60 FPS, faststart-encoded and ready to post.', accent: 'text-accent-sky bg-sky-500/10' },
  { icon: ShieldCheck, title: 'Original & yours', desc: 'Every asset is generated fresh from data and prompts you control — no scraping.', accent: 'text-accent-violet bg-violet-500/10' },
  { icon: Sparkles, title: 'Editable everything', desc: 'Tweak any hook, caption, scene or hashtag before you export. Full control.', accent: 'text-accent-amber bg-amber-500/10' },
];

export function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="chip mx-auto border border-white/10 bg-white/5 text-brand-300">Features</p>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white text-balance">
            Everything you need to run a football content machine
          </h2>
          <p className="mt-4 text-slate-400">
            A complete pipeline from idea to export — no editing skills, no expensive tools, no manual work.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="card group p-6 transition-all hover:-translate-y-1 hover:border-white/20 hover:shadow-glow"
            >
              <div className={`grid h-12 w-12 place-items-center rounded-xl ${f.accent}`}>
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
