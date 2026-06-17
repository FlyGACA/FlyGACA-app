import styles from './calc.module.css';

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  placeholder?: string;
}

/** Labelled numeric input with an optional unit affix. Used by every calculator. */
export function NumberField({ label, value, onChange, unit, placeholder }: NumberFieldProps) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <span className={styles.inputRow}>
        <input
          className={styles.input}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        {unit && <span className={styles.unit}>{unit}</span>}
      </span>
    </label>
  );
}
