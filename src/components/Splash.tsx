import { useEffect, useState } from 'react';
import logoUrl from '../assets/logo-128.png';

const SPLASH_MS = 1300;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Short startup intro: the Shadow logo appears while a blue/orange ring
 * sweeps round it, then the overlay fades away to reveal the calculator.
 * Purely decorative — it never blocks input and is skipped for people who
 * ask their system for reduced motion.
 */
export function Splash() {
  const [visible, setVisible] = useState(() => !prefersReducedMotion());

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => setVisible(false), SPLASH_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="splash" aria-hidden="true" data-testid="splash">
      <div className="splash__badge">
        <span className="splash__ring" />
        <img className="splash__logo" src={logoUrl} alt="" width={112} height={112} />
      </div>
      <p className="splash__name">
        Shadow<span>Calc</span>
      </p>
    </div>
  );
}
