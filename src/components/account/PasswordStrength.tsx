import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './passwordStrength.module.css';

interface PasswordStrengthProps {
  password?: string;
}

export function PasswordStrength({ password = '' }: PasswordStrengthProps) {
  const { t } = useTranslation();

  const requirements = useMemo(() => {
    return [
      { id: 'length', label: t('account.ruleLength'), test: (val: string) => val.length >= 8 },
      { id: 'mixed', label: t('account.ruleMixed'), test: (val: string) => /[a-z]/.test(val) && /[A-Z]/.test(val) },
      { id: 'number', label: t('account.ruleNumber'), test: (val: string) => /\d/.test(val) },
      { id: 'special', label: t('account.ruleSpecial'), test: (val: string) => /[^A-Za-z0-9]/.test(val) }
    ];
  }, [t]);

  const results = useMemo(() => {
    return requirements.map(req => ({
      ...req,
      met: req.test(password)
    }));
  }, [password, requirements]);

  const score = useMemo(() => {
    if (!password) return -1;
    const lengthMet = results.find(r => r.id === 'length')?.met;
    if (!lengthMet) return 0;
    
    const metCount = results.filter(r => r.id !== 'length' && r.met).length;
    if (metCount === 0) return 1;
    if (metCount === 1 || metCount === 2) return 2;
    return 3;
  }, [password, results]);

  const strengthLabel = useMemo(() => {
    if (score === -1) return '';
    switch (score) {
      case 0: return t('account.passwordWeak');
      case 1: return t('account.passwordFair');
      case 2: return t('account.passwordGood');
      case 3: return t('account.passwordStrong');
      default: return '';
    }
  }, [score, t]);

  if (!password) return null;

  return (
    <div className={styles.container} aria-live="polite">
      <div className={`${styles.barWrapper} ${styles[`score-${score}`]}`}>
        <div className={styles.segment} />
        <div className={styles.segment} />
        <div className={styles.segment} />
        <div className={styles.segment} />
      </div>

      <div className={styles.textRow}>
        <span>{t('account.passwordStrength')}</span>
        <span className={styles.label}>{strengthLabel}</span>
      </div>

      <ul className={styles.rulesList}>
        {results.map((res) => (
          <li
            key={res.id}
            className={res.met ? styles.ruleMet : styles.ruleUnmet}
          >
            <span className={styles.bullet} aria-hidden="true">
              {res.met ? '✓' : '○'}
            </span>
            <span>{res.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
export default PasswordStrength;
