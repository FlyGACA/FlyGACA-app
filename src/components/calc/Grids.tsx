import type { ReactNode } from 'react';
import styles from './calc.module.css';

/** Responsive grid of NumberFields. */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className={styles.fieldGrid}>{children}</div>;
}

/** Responsive <dl> grid of ResultStats. */
export function OutputGrid({ children }: { children: ReactNode }) {
  return <dl className={styles.outputGrid}>{children}</dl>;
}
