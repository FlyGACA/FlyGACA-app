import { useTranslation } from 'react-i18next';
import { BentoCard } from '../BentoCard';
import { useFetchJson } from '../../../lib/useFetchJson';
import { type QuizData } from '../../../lib/content';
import shared from './widgets.module.css';

/** Study hub — size of the question bank, links to the study section. */
export function StudyWidget() {
  const { t } = useTranslation();
  const { data, loading } = useFetchJson<QuizData>('/data/quiz.json');
  const questions = data?.banks.reduce((sum, bank) => sum + bank.questions.length, 0) ?? 0;

  return (
    <BentoCard span="sm" tone="default" to="/study" label={t('home.dashboard.study.cta')}>
      <p className={shared.eyebrow}>{t('home.dashboard.study.eyebrow')}</p>
      {loading || !data ? (
        <div className={shared.skeleton} />
      ) : (
        <div className={shared.statRow}>
          <span className={shared.stat}>{questions}</span>
          <span className={shared.unit}>{t('home.dashboard.study.questions')}</span>
        </div>
      )}
      <span className={`${shared.foot} cardHoverArrow`}>
        {t('home.dashboard.study.cta')}
        <span className={shared.arrow} aria-hidden="true">
          →
        </span>
      </span>
    </BentoCard>
  );
}
