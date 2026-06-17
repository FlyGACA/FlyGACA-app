import styles from './calc.module.css';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}

/** Labelled free-text input sharing the calculator field styling. */
export function TextField({ label, value, onChange, placeholder, hint }: TextFieldProps) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <span className={styles.inputRow}>
        <input
          className={styles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </span>
      {hint && <small className={styles.hint}>{hint}</small>}
    </label>
  );
}
