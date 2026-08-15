import { useTranslation } from 'react-i18next';
import { useStudyProgress, togglePathStep } from '@/lib/studyProgress';
import { usePageMeta } from '@/hooks/usePageMeta';
import { HubBackLink } from '@/components/HubBackLink';
import { ProgressBar } from '@/components/ProgressBar';
import styles from './Paths.module.css';

const ROADMAPS = [
  {
    id: 'ppl',
    i18nKey: 'ppl',
    title: 'Private Pilot License (PPL - GACAR 61 Subpart C)',
    steps: [
      { i18nKey: 'ppl_age', label: 'Minimum age of 17' },
      { i18nKey: 'ppl_med', label: 'Hold at least a Class 2 Medical Certificate' },
      { i18nKey: 'ppl_lang', label: 'GACA English Language Proficiency (Level 4+)' },
      { i18nKey: 'ppl_ground', label: 'Complete PPL Ground School & pass knowledge test' },
      { i18nKey: 'ppl_flight', label: '40 hours total flight time (35h minimum in approved Part 141)' },
      { i18nKey: 'ppl_xc', label: '5 hours solo cross-country flight' },
      { i18nKey: 'ppl_check', label: 'Pass the PPL Practical Test (Checkride)' }
    ]
  },
  {
    id: 'ir',
    i18nKey: 'ir',
    title: 'Instrument Rating (IR - GACAR 61 Subpart G)',
    steps: [
      { i18nKey: 'ir_med', label: 'Hold PPL and Class 1 or 2 Medical' },
      { i18nKey: 'ir_ground', label: 'Complete IR Ground School & pass knowledge test' },
      { i18nKey: 'ir_xc', label: '50 hours of Cross-Country (XC) PIC time' },
      { i18nKey: 'ir_inst', label: '40 hours of actual or simulated instrument time' },
      { i18nKey: 'ir_check', label: 'Pass the IR Practical Test' }
    ]
  },
  {
    id: 'cpl',
    i18nKey: 'cpl',
    title: 'Commercial Pilot License (CPL - GACAR 61 Subpart E)',
    steps: [
      { i18nKey: 'cpl_age', label: 'Minimum age of 18' },
      { i18nKey: 'cpl_med', label: 'Hold a Class 1 Medical Certificate' },
      { i18nKey: 'cpl_ground', label: 'Complete CPL Ground School & pass knowledge test' },
      { i18nKey: 'cpl_flight', label: '250 hours total flight time (190h minimum in approved Part 141)' },
      { i18nKey: 'cpl_pic', label: '100 hours Pilot-in-Command (PIC) time' },
      { i18nKey: 'cpl_xc', label: '50 hours PIC cross-country' },
      { i18nKey: 'cpl_check', label: 'Pass the CPL Practical Test' }
    ]
  },
  {
    id: 'atpl',
    i18nKey: 'atpl',
    title: 'Airline Transport Pilot (ATPL - GACAR 61 Subpart F)',
    steps: [
      { i18nKey: 'atpl_age', label: 'Minimum age of 21' },
      { i18nKey: 'atpl_med', label: 'Hold a Class 1 Medical Certificate' },
      { i18nKey: 'atpl_ground', label: 'Pass ATPL knowledge test (ATP CTP usually required)' },
      { i18nKey: 'atpl_flight', label: '1,500 hours total flight time' },
      { i18nKey: 'atpl_xc', label: '500 hours cross-country flight time' },
      { i18nKey: 'atpl_night', label: '100 hours night flight time' },
      { i18nKey: 'atpl_inst', label: '75 hours instrument time' },
      { i18nKey: 'atpl_check', label: 'Pass the ATPL Practical Test' }
    ]
  }
];

export function Pathways() {
  const { t } = useTranslation();
  usePageMeta(t('pathways.title'), t('pathways.desc'));
  const { pathDone } = useStudyProgress();

  return (
    <section className={`container ${styles.page}`}>
      <HubBackLink to="/learn" label={t('nav.learn')} />
      <header className={styles.head}>
        <h1>{t('pathways.title')}</h1>
        <p className={styles.subtitle}>{t('pathways.desc')}</p>
      </header>
      {ROADMAPS.map((r) => {
        const done = new Set(pathDone[r.id] ?? []);
        const pct = r.steps.length ? Math.round((done.size / r.steps.length) * 100) : 0;
        return (
          <section key={r.id} className={styles.path}>
            <h2>{t(`pathways.${r.i18nKey}.title`, r.title)}</h2>
            <div className={styles.pathProgress}>
              <ProgressBar percent={pct} label={t(`pathways.${r.i18nKey}.title`, r.title)} />
              <span className={styles.pathProgressLabel}>
                {done.size} / {r.steps.length}
              </span>
            </div>
            <ol className={styles.steps}>
              {r.steps.map((s, i) => {
                const isDone = done.has(i);
                return (
                  <li key={i} className={`${styles.step} ${isDone ? styles.stepDone : ''}`}>
                    <button
                      type="button"
                      className={styles.check}
                      role="checkbox"
                      aria-checked={isDone}
                      onClick={() => togglePathStep(r.id, i)}
                      title={t(`pathways.${r.i18nKey}.${s.i18nKey}`, s.label)}
                    >
                      {isDone ? '✓' : ''}
                    </button>
                    <div className={styles.stepBody}>
                      <span className={styles.stepLabel}>{t(`pathways.${r.i18nKey}.${s.i18nKey}`, s.label)}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </section>
  );
}
