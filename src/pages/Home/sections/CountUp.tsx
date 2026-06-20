import { useEffect, useRef, useState } from 'react';

/**
 * A dependency-free count-up number for the home hero. Deliberately avoids
 * framer-motion (which lives in the lazy bento chunk) so the landing critical
 * path stays lean. Animates with requestAnimationFrame, honours
 * prefers-reduced-motion, and exposes the true final value to assistive tech.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    let start = 0;
    const duration = 1100;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setDisplay(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">
        {display}
      </span>
    </span>
  );
}
