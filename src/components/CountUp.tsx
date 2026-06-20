import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';

interface CountUpProps {
  /** The final value to count to. */
  to: number;
  /** Duration of the count in ms. */
  duration?: number;
}

/**
 * Counts from zero to `to` once, when it first scrolls into view — the hero
 * "proof" stats from the animated landing comp. Honours reduced-motion by
 * rendering the final value immediately, and is wrapped so the live number is
 * announced to assistive tech only as its settled value.
 */
export function CountUp({ to, duration = 1300 }: CountUpProps) {
  const reduce = usePrefersReducedMotion();
  const [value, setValue] = useState(reduce ? to : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (reduce) {
      setValue(to);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        // easeOutCubic — fast then settling, matching the comp's counters.
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(to * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
      run();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [to, duration, reduce]);

  return <span ref={ref}>{value}</span>;
}
