import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { PhoneMock } from './PhoneMock';
import { FloatingBalls } from './FloatingBalls';

const rotating = [
  { heading: '#1', caption: 'Lionel Messi', stat: '93 OVR' },
  { heading: 'FACT', caption: 'Fastest Goal Ever', stat: '2.0s' },
  { heading: 'VS', caption: 'El Clásico', stat: 'LIVE' },
  { heading: 'TOP 10', caption: 'Best Wingers', stat: 'RANKED' },
];

export function Hero() {
  const root = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-reveal', {
        y: 28,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.12,
      });
      gsap.from('.hero-phone', { scale: 0.85, opacity: 0, duration: 1.1, ease: 'power3.out', delay: 0.2 });
    }, root);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % rotating.length), 2600);
    return () => clearInterval(t);
  }, []);

  const current = rotating[idx];

  return (
    <section ref={root} className="relative overflow-hidden pt-36 pb-24 sm:pt-44">
      <div className="pointer-events-none absolute inset-0 bg-grid-glow" />
      <FloatingBalls />
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-2">
        <div>
          <div className="hero-reveal inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            AI football content, forged in one click
          </div>
          <h1 className="hero-reveal mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-white text-balance sm:text-6xl">
            Go viral with <span className="gradient-text">football content</span> on autopilot.
          </h1>
          <p className="hero-reveal mt-6 max-w-lg text-lg text-slate-300">
            GoalForge AI writes the script, designs the scenes, animates the captions and exports a TikTok-ready
            vertical video — from a single prompt. Predictions, rankings, facts, transfers and more.
          </p>
          <div className="hero-reveal mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/register" className="btn-primary text-base">
              Start creating free <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#demo" className="btn-secondary text-base">
              <Play className="h-4 w-4" /> Watch it work
            </a>
          </div>
          <div className="hero-reveal mt-10 flex items-center gap-6 text-sm text-slate-400">
            <div>
              <p className="font-display text-2xl font-semibold text-white">10+</p>
              <p>Content templates</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="font-display text-2xl font-semibold text-white">60 FPS</p>
              <p>1080×1920 exports</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="font-display text-2xl font-semibold text-white">1-click</p>
              <p>Full pipeline</p>
            </div>
          </div>
        </div>

        <div className="hero-phone relative">
          <motion.div
            aria-hidden
            className="absolute left-1/2 top-1/2 -z-10 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/30 blur-[100px]"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <PhoneMock heading={current.heading} caption={current.caption} stat={current.stat} />
        </div>
      </div>
    </section>
  );
}
