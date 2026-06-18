import type { ReactNode } from 'react';
import styles from './calc.module.css';

interface ResultStatProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'headline' | 'good' | 'bad';
}

/** A single dt/dd result stat with optional sub-text and tone. */
export function ResultStat({ label, value, sub, tone }: ResultStatProps) {
  return (
    <div className={`${styles.stat} ${tone ? styles[tone] : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {sub != null && <span className={styles.sub}>{sub}</span>}
    </div>
  );
}
