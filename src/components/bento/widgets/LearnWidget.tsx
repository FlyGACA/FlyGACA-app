import { useTranslation } from 'react-i18next';
import { BentoCard } from '@/components/bento/BentoCard';
import { useFetchJson } from '@/lib/useFetchJson';
import { type QuizData } from '@/lib/content';
import { GUIDE_SLUGS } from '@/pages/guides/guides';
import shared from './widgets.module.css';

const FEATURED = ['saudi-ppl-requirements', 'airspace-explained', 'reading-metar-taf'];

/** Learn — the merged Guides + Study entry: explainer guides and practice in one
 *  hub. Surfaces the guide count, the question-bank size, and a few featured guides. */
export function LearnWidget() {
  const { t } = useTranslation();
  const { data, loading } = useFetchJson<QuizData>('/data/quiz.json');
  const questions = data?.banks.reduce((sum, bank) => sum + bank.questions.length, 0) ?? 0;

  return (
    <BentoCard span="wide" tone="cyan" to="/learn" label={t('home.dashboard.learn.cta')}>
      <p className={shared.eyebrow}>{t('home.dashboard.learn.eyebrow')}</p>
      <p className={shared.heading}>{t('home.dashboard.learn.heading')}</p>
      <div className={shared.statRow}>
        <span className={shared.statSecondary}>{GUIDE_SLUGS.length}</span>
        <span className={shared.unit}>{t('home.dashboard.learn.guides')}</span>
        {!loading && data && (
          <>
            <span className={shared.statSecondary}>{questions}</span>
            <span className={shared.unit}>{t('home.dashboard.learn.questions')}</span>
          </>
        )}
      </div>
      <div className={shared.chips}>
        {FEATURED.map((slug) => (
          <span key={slug} className={shared.chip}>
            {t(`guides.items.${slug}.name`)}
          </span>
        ))}
      </div>
      <span className={`${shared.foot} cardHoverArrow`}>
        {t('home.dashboard.learn.cta')}
        <span className={shared.arrow} aria-hidden="true">
          →
        </span>
      </span>
    </BentoCard>
  );
}
