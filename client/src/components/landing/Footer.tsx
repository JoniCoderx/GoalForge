import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';

export function Footer() {
  const cols = [
    { title: 'Product', links: [['Features', '#features'], ['How it works', '#how'], ['Pricing', '#pricing'], ['FAQ', '#faq']] },
    { title: 'Templates', links: [['Predictions', '#demo'], ['Top 10', '#demo'], ['Transfers', '#demo'], ['Facts', '#demo']] },
    { title: 'Account', links: [['Sign in', '/login'], ['Create account', '/register'], ['Dashboard', '/app']] },
  ];
  return (
    <footer className="relative border-t border-white/5 bg-ink-950 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-slate-400">
              The one-click football content engine for TikTok, Reels and YouTube Shorts.
            </p>
            <div className="mt-6 flex gap-2 text-xl">
              <span>⚽</span>
              <span>🏆</span>
              <span>🔥</span>
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <p className="font-display text-sm font-semibold text-white">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith('#') ? (
                      <a href={href} className="text-sm text-slate-400 transition hover:text-white">
                        {label}
                      </a>
                    ) : (
                      <Link to={href} className="text-sm text-slate-400 transition hover:text-white">
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} GoalForge AI. All rights reserved.</p>
          <p className="text-sm text-slate-500">Built for creators who move fast. ⚡</p>
        </div>
      </div>
    </footer>
  );
}
