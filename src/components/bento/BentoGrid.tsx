import type { ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import styles from './BentoGrid.module.css';

interface BentoGridProps {
  children: ReactNode;
  /** Accessible label for the grid region (e.g. "Fly GACA dashboard"). */
  label?: string;
}

/**
 * The bento layout shell. As a framer-motion container it orchestrates the
 * staggered kinetic entry: each child `BentoCard` inherits the `hidden`→`show`
 * variant and settles in `--dur-stagger` after the previous one. Reduced-motion
 * collapses the stagger to a near-instant crossfade.
 */
export function BentoGrid({ children, label }: BentoGridProps) {
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: {
      transition: reduce ? { staggerChildren: 0 } : { staggerChildren: 0.07, delayChildren: 0.05 },
    },
  };

  return (
    <motion.section
      className={styles.grid}
      aria-label={label}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.section>
  );
}
