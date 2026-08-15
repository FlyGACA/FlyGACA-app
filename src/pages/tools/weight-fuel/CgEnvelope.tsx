import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { fin } from '@/calc/guards';
import { cgEnvelopeStatus, type CgLimits } from '@/calc/weightBalance';
import type { FuelWeightPoints } from '@/calc/pilot/fuel-weight';
import styles from './CgEnvelope.module.css';

interface CgEnvelopeProps {
  points: FuelWeightPoints;
  cgFwd: number;
  cgAft: number;
  mtow: number;
  limits: CgLimits;
}

const VW = 240;
const VH = 200;
const M = { l: 12, r: 30, t: 14, b: 22 };
const PLOT = { x: M.l, y: M.t, w: VW - M.l - M.r, h: VH - M.t - M.b };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function CgEnvelope({ points, cgFwd, cgAft, mtow, limits }: CgEnvelopeProps) {
  const { t } = useTranslation();
  const hasBox = fin(cgFwd) && fin(cgAft) && cgAft > cgFwd;

  const pts = [
    { id: 'zfw', p: points.zfw, label: 'ZFW' },
    { id: 'ramp', p: points.ramp, label: 'Ramp' },
    { id: 'tow', p: points.tow, label: 'TOW' },
    { id: 'ldw', p: points.ldw, label: 'LDW' },
  ].filter(x => x.p != null) as { id: string, p: { weight: number, cg: number }, label: string }[];

  if (pts.length === 0) return null;

  const minCg = Math.min(...pts.map(x => x.p.cg));
  const maxCg = Math.max(...pts.map(x => x.p.cg));
  
  const widthSpan = hasBox ? Math.max(cgAft, maxCg) - Math.min(cgFwd, minCg) : maxCg - minCg;
  const padding = widthSpan * 0.3 || 3;

  const [xLo, xHi] = hasBox
    ? [Math.min(cgFwd, minCg) - padding, Math.max(cgAft, maxCg) + padding]
    : [minCg - padding, maxCg + padding];

  const maxWt = Math.max(...pts.map(x => x.p.weight));
  const yHi = (fin(mtow) ? Math.max(mtow, maxWt) : maxWt) * 1.08 || 1;

  const px = (v: number) => PLOT.x + ((v - xLo) / (xHi - xLo || 1)) * PLOT.w;
  const py = (v: number) => PLOT.y + PLOT.h - (v / yHi) * PLOT.h;

  const boxTop = fin(mtow) ? py(mtow) : PLOT.y;

  return (
    <figure className={styles.wrap}>
      <svg viewBox={`0 0 ${VW} ${VH}`} className={styles.svg} role="img">
        {/* plot frame */}
        <line
          x1={PLOT.x}
          y1={PLOT.y + PLOT.h}
          x2={PLOT.x + PLOT.w}
          y2={PLOT.y + PLOT.h}
          className={styles.axis}
        />
        <line x1={PLOT.x} y1={PLOT.y} x2={PLOT.x} y2={PLOT.y + PLOT.h} className={styles.axis} />

        {hasBox && (
          <rect
            x={px(cgFwd)}
            y={boxTop}
            width={px(cgAft) - px(cgFwd)}
            height={PLOT.y + PLOT.h - boxTop}
            className={styles.box}
            rx="2"
          />
        )}
        {fin(mtow) && (
          <line x1={PLOT.x} y1={boxTop} x2={PLOT.x + PLOT.w} y2={boxTop} className={styles.limit} />
        )}

        {pts.length > 1 && (
          <path
            d={`M ${pts.map(x => `${px(x.p.cg)} ${py(x.p.weight)}`).join(' L ')}`}
            fill="none"
            stroke="var(--border-bright, #888)"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
        )}

        {pts.map((pt) => {
          const status = cgEnvelopeStatus(pt.p.weight, pt.p.cg, limits);
          const markX = clamp(px(pt.p.cg), PLOT.x, PLOT.x + PLOT.w);
          const markY = clamp(py(pt.p.weight), PLOT.y, PLOT.y + PLOT.h);
          const markClass =
            status === 'out'
              ? `${styles.mark} ${styles.markOut}`
              : status === 'in'
                ? `${styles.mark} ${styles.markIn}`
                : styles.mark;

          return (
            <g
              key={pt.id}
              className={markClass}
              style={{ '--px': `${markX}px`, '--py': `${markY}px` } as CSSProperties}
            >
              <circle r="4" className={styles.dot} />
              {status === 'out' && <circle r="7.5" className={styles.ring} />}
              <text x="8" y="3" fontSize="10" fill="currentColor" fontWeight="bold">
                {pt.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className={styles.caption}>
        <span className={styles.axisLabel}>{t('weightBalance.envelopeCgAxis')}</span>
        {hasBox && (
          <span className={styles.legend}>
            <bdi dir="ltr">
              {Math.round(cgFwd)}–{Math.round(cgAft)}
            </bdi>{' '}
            {t('weightBalance.cg')}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
