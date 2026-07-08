import { useEffect } from 'react';
import { Nav } from '@/components/landing/Nav';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Demo } from '@/components/landing/Demo';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Pricing } from '@/components/landing/Pricing';
import { FAQ } from '@/components/landing/FAQ';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';

export default function Landing() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink-950">
      <div className="pointer-events-none fixed inset-0 noise opacity-60" />
      <Nav />
      <main>
        <Hero />
        <Features />
        <Demo />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
