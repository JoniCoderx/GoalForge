import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'How does GoalForge actually make the videos?',
    a: 'GoalForge generates a full script and scene breakdown, then renders a vertical 1080×1920 video with FFmpeg — animated captions, stat chips, brand watermark and a progress bar. No editing software required.',
  },
  {
    q: 'Do I need an OpenAI API key?',
    a: 'It’s optional. With a key, scripts are written by OpenAI for maximum variety. Without one, GoalForge falls back to a built-in generator grounded in curated football data, so the app works end-to-end for free.',
  },
  {
    q: 'Is the content original?',
    a: 'Yes. Every hook, script, caption and hashtag set is generated fresh from prompts and data you control. Nothing is scraped or copied.',
  },
  {
    q: 'Can I edit before exporting?',
    a: 'Absolutely. Every field — hook, title, each scene, captions, hashtags and platform descriptions — is fully editable before you render.',
  },
  {
    q: 'What platforms are the videos optimised for?',
    a: 'TikTok, Instagram Reels and YouTube Shorts. Exports are vertical 1080×1920 at 60 FPS with faststart encoding, plus tailored descriptions per platform.',
  },
  {
    q: 'Can I use my own branding?',
    a: 'Yes — set your colours, font, watermark and call-to-action once and they’re applied automatically to every export.',
  },
];

export function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="relative py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="chip mx-auto border border-white/10 bg-white/5 text-brand-300">FAQ</p>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white text-balance">
            Questions, answered
          </h2>
        </div>
        <div className="mt-12 space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="card overflow-hidden p-0">
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-medium text-white">{f.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
