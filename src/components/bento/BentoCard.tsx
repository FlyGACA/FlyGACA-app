import type { ReactNode } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useCardGlow } from './useCardGlow';
import styles from './BentoCard.module.css';

const MotionLink = motion.create(Link);

export type BentoSpan = 'sm' | 'md' | 'lg' | 'tall';
export type BentoTone = 'default' | 'cyan' | 'green';

interface BentoCardProps {
  /** Grid footprint. Maps to a span class; collapses responsively. */
  span?: BentoSpan;
  /** Which neon glow tints the cursor-follow border illumination. */
  tone?: BentoTone;
  /** When set, the whole card is a router Link to this route. */
  to?: string;
  /** Accessible label when the card is a link (e.g. "Open the library"). */
  label?: string;
  children: ReactNode;
}

const spanClass: Record<BentoSpan, string> = {
  sm: styles.spanSm,
  md: styles.spanMd,
  lg: styles.spanLg,
  tall: styles.spanTall,
};

const toneClass: Record<BentoTone, string> = {
  default: styles.toneDefault,
  cyan: styles.toneCyan,
  green: styles.toneGreen,
};

/**
 * A single bento tile. Inherits the parent grid's `hidden`→`show` variant so it
 * settles in on the staggered kinetic entry, lifts subtly on hover, and renders
 * a cursor-following perimeter glow. All transform/opacity-only so it composites
 * on the GPU; `useReducedMotion` flattens entry and hover to honour the user's
 * OS preference (belt-and-braces with the global prefers-reduced-motion reset).
 */
export function BentoCard({
  span = 'md',
  tone = 'default',
  to,
  label,
  children,
}: BentoCardProps) {
  const reduce = useReducedMotion();
  const glow = useCardGlow<HTMLDivElement & HTMLAnchorElement>();

  const itemVariants: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2 } } }
    : {
        hidden: { opacity: 0, scale: 0.94, y: 24 },
        show: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] },
        },
      };

  const hover = reduce ? undefined : { scale: 1.015 };

  const className = `${styles.card} ${spanClass[span]} ${toneClass[tone]}`;

  const inner = <span className={styles.glow} aria-hidden="true" />;

  if (to) {
    return (
      <MotionLink
        ref={glow.ref}
        to={to}
        aria-label={label}
        className={`${className} ${styles.link}`}
        variants={itemVariants}
        whileHover={hover}
        whileTap={reduce ? undefined : { scale: 0.995 }}
        onPointerMove={glow.onPointerMove}
        onPointerLeave={glow.onPointerLeave}
      >
        {inner}
        <span className={styles.body}>{children}</span>
      </MotionLink>
    );
  }

  return (
    <motion.div
      ref={glow.ref}
      className={className}
      variants={itemVariants}
      whileHover={hover}
      onPointerMove={glow.onPointerMove}
      onPointerLeave={glow.onPointerLeave}
    >
      {inner}
      <div className={styles.body}>{children}</div>
    </motion.div>
  );
}
