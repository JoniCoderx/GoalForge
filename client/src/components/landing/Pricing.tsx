import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Starter',
    price: '$0',
    period: '/forever',
    desc: 'Explore the full pipeline and export your first shorts.',
    features: ['5 renders / month', 'All 10 templates', 'Local AI generator', '1080×1920 exports', 'Community support'],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Creator',
    price: '$129',
    period: '/month',
    desc: 'For creators shipping football content daily.',
    features: [
      'Unlimited renders',
      'OpenAI-powered scripts',
      'Full brand kit & watermark',
      'Priority render queue',
      'Analytics dashboard',
      'Export history',
    ],
    cta: 'Go Creator',
    highlight: true,
  },
  {
    name: 'Studio',
    price: '$199',
    period: '/month',
    desc: 'For teams and agencies running multiple channels.',
    features: ['Everything in Creator', 'Team members', 'Admin panel & logs', 'Custom prompts & templates', 'Cloud storage ready', 'Dedicated support'],
    cta: 'Go Studio',
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="chip mx-auto border border-white/10 bg-white/5 text-brand-300">Pricing</p>
          <h2 className="mt-4 font-display text-4xl font-semibold text-white text-balance">
            Priced like a tool you’ll actually use
          </h2>
          <p className="mt-4 text-slate-400">Start free. Upgrade when you’re ready to scale your channel.</p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={cn(
                'card relative flex flex-col p-7',
                plan.highlight && 'border-brand-500/40 shadow-glow ring-1 ring-brand-500/30'
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-lg font-semibold text-white">{plan.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{plan.desc}</p>
              <div className="mt-5 flex items-end gap-1">
                <span className="font-display text-4xl font-bold text-white">{plan.price}</span>
                <span className="mb-1 text-sm text-slate-400">{plan.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-500/15 text-brand-400">
                      <Check className="h-3 w-3" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={cn('mt-8 w-full text-center', plan.highlight ? 'btn-primary' : 'btn-secondary')}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
