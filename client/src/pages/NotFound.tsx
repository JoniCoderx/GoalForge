import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 bg-grid-glow px-4 text-center">
      <div>
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <p className="font-display text-7xl font-bold gradient-text">404</p>
        <h1 className="mt-4 font-display text-2xl font-semibold text-white">Off the pitch</h1>
        <p className="mt-2 text-slate-400">This page didn’t make the squad.</p>
        <Link to="/" className="btn-primary mt-8">
          Back to home
        </Link>
      </div>
    </div>
  );
}
