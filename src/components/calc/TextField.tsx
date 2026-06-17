import styles from './calc.module.css';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  type?: 'text' | 'email' | 'password';
  autoComplete?: string;
}

/** Labelled free-text input sharing the calculator field styling. */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
  autoComplete,
}: TextFieldProps) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <span className={styles.inputRow}>
        <input
          className={styles.input}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </span>
      {hint && <small className={styles.hint}>{hint}</small>}
    </label>
  );
}
