import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '../../lib/useFetchJson';
import type { GroundSchoolData, GsLesson } from '../../lib/content';
import { adelLink } from '../../lib/adel';
import { Disclaimer } from '../../components/Disclaimer';
import { SectionHeader } from '../../components/SectionHeader';
import styles from './GroundSchool.module.css';

/** Per-module accent — cycles the Falcon hues from the design-token map. */
const CAT_TOKENS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];

/** Legacy "document.html?type=regulations&id=part-61#x" → "/library/part-61". */
function readHref(url: string | undefined): string | null {
  if (!url) return null;
  const id = url.match(/[?&]id=([^&#]+)/)?.[1];
  return id ? `/library/${id}` : null;
}

const doneKey = (id: string) => `flygaca:gs:${id}`;

export function GroundSchool() {
  const { t } = useTranslation();
  const { data, error, loading } = useFetchJson<GroundSchoolData>('/data/groundschool.json');
  const [, force] = useState(0);
  const isDone = (id: string) => localStorage.getItem(doneKey(id)) === '1';
  const toggle = (id: string) => {
    if (isDone(id)) localStorage.removeItem(doneKey(id));
    else localStorage.setItem(doneKey(id), '1');
    force((n) => n + 1);
  };

  return (
    <section className={`container-narrow ${styles.page}`}>
      {loading && <p>{t('common.loading')}</p>}
      {error && <p role="alert">{t('common.loadError')}</p>}
      {data && (
        <>
          <header className={styles.head}>
            <h1>{data.title}</h1>
            <p className={styles.intro}>{data.intro}</p>
          </header>
          {data.modules.map((m, i) => {
            const done = m.lessons.filter((l) => isDone(l.id)).length;
            return (
              <section key={m.id} className={styles.module}>
                <SectionHeader
                  title={m.title}
                  tone={CAT_TOKENS[i % CAT_TOKENS.length]}
                  count={t('study.gsProgress', { done, total: m.lessons.length })}
                />
                <p className={styles.summary}>{m.summary}</p>
                <p className={styles.progress}>
                  {t('study.gsProgress', { done, total: m.lessons.length })}
                </p>
                <div
                  className={styles.progressBar}
                  role="progressbar"
                  aria-valuenow={done}
                  aria-valuemin={0}
                  aria-valuemax={m.lessons.length}
                >
                  <div
                    className={styles.progressFill}
                    style={{
                      inlineSize: `${m.lessons.length > 0 ? Math.round((done / m.lessons.length) * 100) : 0}%`,
                    }}
                  />
                </div>
                <ul className={styles.lessons}>
                  {m.lessons.map((l) => (
                    <Lesson
                      key={l.id}
                      lesson={l}
                      done={isDone(l.id)}
                      onToggle={() => toggle(l.id)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
          <Disclaimer compact />
        </>
      )}
    </section>
  );
}

function Lesson({
  lesson,
  done,
  onToggle,
}: {
  lesson: GsLesson;
  done: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const adel = adelLink(lesson.adel);
  const read = readHref(lesson.read?.url);
  return (
    <li className={`${styles.lesson} ${done ? styles.lessonDone : ''}`}>
      <div className={styles.lessonHead}>
        <label className={styles.check}>
          <input type="checkbox" checked={done} onChange={onToggle} />
          <span className={styles.lessonTitle}>{lesson.title}</span>
        </label>
      </div>
      <p className={styles.objective}>
        {t('study.gsObjective')}: {lesson.objective}
      </p>
      <div className={styles.actions}>
        {adel && (
          <Link to={adel} className={styles.action}>
            {t('study.gsAskAdel')}
          </Link>
        )}
        {read && (
          <Link to={read} className={styles.action}>
            {t('study.gsRead')}
          </Link>
        )}
      </div>
    </li>
  );
}
