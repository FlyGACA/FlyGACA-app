import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import shared from './widgets.module.css';

interface StatValueProps {
  value: number;
  className?: string;
}

/**
 * A big dashboard metric that counts up from zero on mount — a cockpit-gauge
 * micro-interaction on the shared kinetic-entry easing. The text node is driven
 * imperatively (no per-frame React render). Under reduced motion it shows the
 * final value immediately and never animates.
 */
export function StatValue({ value, className }: StatValueProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce) {
      node.textContent = String(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  // The animated digits are hidden from assistive tech (they'd otherwise be
  // announced mid-count); a visually-hidden sibling carries the true final value.
  // Initial paint shows 0 while animating (avoids a flash of the final value),
  // or the value itself when motion is reduced.
  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true">
        {reduce ? value : 0}
      </span>
      <span className={shared.srOnly}>{value}</span>
    </span>
  );
}
