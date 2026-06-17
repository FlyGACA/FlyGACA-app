import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BentoCard } from '../BentoCard';
import shared from './widgets.module.css';
import styles from './RadarWidget.module.css';

/** Seeded "contacts" — fixed polar positions so the scene is deterministic. */
const BLIPS = [
  { angle: 0.6, radius: 0.55 },
  { angle: 2.1, radius: 0.78 },
  { angle: 3.4, radius: 0.4 },
  { angle: 4.7, radius: 0.66 },
  { angle: 5.6, radius: 0.85 },
];

/** Read a CSS custom property off :root so canvas paint stays token-driven. */
function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * The "active canvas element" — a decorative radar sweep. It does NOT track real
 * flights (the app has no live feed); it is an ambient visual that links through
 * to the charts library, and is labelled as a concept. Anti-aliased via devicePixel
 * scaling; a continuous sweep leaves a fading cyan trail and lights contacts as it
 * passes. Honours reduced-motion by painting a single static frame.
 */
export function RadarWidget() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cyan = cssVar('--neon-cyan', '#3fe0ff');
    const ring = cssVar('--border-bright', '#26384a');
    const green = cssVar('--neon-green', '#2bffb0');

    let dpr = Math.max(1, window.devicePixelRatio || 1);
    let cssW = 0;
    let cssH = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (sweep: number) => {
      const cx = cssW / 2;
      const cy = cssH / 2;
      const maxR = Math.min(cssW, cssH) / 2 - 6;
      if (maxR <= 0) return;

      ctx.clearRect(0, 0, cssW, cssH);

      // Range rings + cross-hairs
      ctx.strokeStyle = ring;
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i += 1) {
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, (maxR * i) / 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(cx - maxR, cy);
      ctx.lineTo(cx + maxR, cy);
      ctx.moveTo(cx, cy - maxR);
      ctx.lineTo(cx, cy + maxR);
      ctx.stroke();

      // Bearing ticks around the perimeter (every 30°, longer on the cardinals)
      ctx.globalAlpha = 0.6;
      for (let a = 0; a < 360; a += 30) {
        const rad = (a * Math.PI) / 180;
        const inner = a % 90 === 0 ? maxR - 10 : maxR - 5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
        ctx.lineTo(cx + Math.cos(rad) * maxR, cy + Math.sin(rad) * maxR);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Sweep wedge with a fading trailing gradient
      const trail = 1.1; // radians of trail behind the leading edge
      const grad = ctx.createConicGradient(sweep - trail, cx, cy);
      grad.addColorStop(0, 'rgba(63, 224, 255, 0)');
      grad.addColorStop(trail / (Math.PI * 2), cyan);
      grad.addColorStop(trail / (Math.PI * 2) + 0.001, 'rgba(63, 224, 255, 0)');
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, sweep - trail, sweep);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      // Leading edge line
      ctx.strokeStyle = cyan;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * maxR, cy + Math.sin(sweep) * maxR);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Contacts — brighten as the sweep passes, then fade
      for (const b of BLIPS) {
        const bx = cx + Math.cos(b.angle) * b.radius * maxR;
        const by = cy + Math.sin(b.angle) * b.radius * maxR;
        let delta = sweep - b.angle;
        delta = ((delta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const lit = Math.max(0, 1 - delta / 1.4); // recently swept → bright
        const r = 2 + lit * 3;
        ctx.beginPath();
        ctx.fillStyle = green;
        ctx.globalAlpha = 0.25 + lit * 0.75;
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
        if (lit > 0.05) {
          ctx.globalAlpha = lit * 0.4;
          ctx.strokeStyle = green;
          ctx.beginPath();
          ctx.arc(bx, by, r + 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Centre hub
      ctx.globalAlpha = 1;
      ctx.fillStyle = cyan;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    };

    resize();

    const observer = new ResizeObserver(() => {
      resize();
      if (reduce) draw(-Math.PI / 4);
    });
    observer.observe(canvas);

    if (reduce) {
      draw(-Math.PI / 4); // single static frame
      return () => observer.disconnect();
    }

    let raf = 0;
    let last = performance.now();
    let sweep = 0;
    const speed = 1.1; // radians / second
    const loop = (now: number) => {
      sweep = (sweep + ((now - last) / 1000) * speed) % (Math.PI * 2);
      last = now;
      draw(sweep);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [reduce]);

  return (
    <BentoCard span="tall" tone="cyan" to="/library/charts" label={t('home.dashboard.radar.title')}>
      <p className={shared.eyebrow}>{t('home.dashboard.radar.eyebrow')}</p>
      <div className={styles.scope}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        {/* A decorative data node with an elastic, spring tooltip on hover. It is
            part of the concept visual (hidden from the a11y tree) so it never
            becomes interactive content nested inside the card's link. */}
        <motion.span
          className={styles.node}
          aria-hidden="true"
          whileHover={reduce ? undefined : { scale: 1.4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
        >
          <span className={styles.tooltip}>{t('home.dashboard.radar.node')}</span>
        </motion.span>
      </div>
      <p className={styles.concept}>{t('home.dashboard.radar.concept')}</p>
      <span className={`${shared.foot} cardHoverArrow`}>
        {t('home.dashboard.radar.cta')}
        <span className={shared.arrow} aria-hidden="true">
          →
        </span>
      </span>
    </BentoCard>
  );
}
