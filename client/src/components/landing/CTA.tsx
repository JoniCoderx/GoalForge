import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { FloatingBalls } from './FloatingBalls';

export function CTA() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-brand-500/30 bg-gradient-to-br from-brand-500/15 via-ink-900 to-accent-sky/10 p-12 text-center shadow-glow"
        >
          <FloatingBalls className="hidden sm:block" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold text-white text-balance sm:text-5xl">
              Start forging viral football content today
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-slate-300">
              Join creators automating their content pipeline. Your first shorts are on us.
            </p>
            <Link to="/register" className="btn-primary mx-auto mt-8 text-base">
              Create your free account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
