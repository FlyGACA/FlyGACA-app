import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '../components/Disclaimer';
import { usePageMeta } from '../lib/usePageMeta';
import styles from './Schools.module.css';

interface Section {
  h: string;
  p: string;
}
interface Faq {
  q: string;
  a: string;
}

export function Schools() {
  const { t } = useTranslation();
  usePageMeta(t('meta.schools'), t('metaDesc.schools'));
  const sections = t('schools.sections', { returnObjects: true }) as unknown as Section[];
  const faqs = t('schools.faq', { returnObjects: true }) as unknown as Faq[];
  const email = t('schools.email');

  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [seats, setSeats] = useState('');
  const [message, setMessage] = useState('');

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const subject = t('schools.mailSubject', { school: school || t('schools.title') });
    const body = t('schools.mailBody', { name, school, seats, message });
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>{t('schools.eyebrow')}</p>
        <h1>{t('schools.title')}</h1>
        <p className={styles.subtitle}>{t('schools.subtitle')}</p>
      </header>

      <ul className={`${styles.benefits} stagger-grid`}>
        {sections.map((s, i) => (
          <li key={i} className={styles.benefit}>
            <h2 className={styles.benefitTitle}>{s.h}</h2>
            <p>{s.p}</p>
          </li>
        ))}
      </ul>

      <section className={styles.formWrap} aria-labelledby="schools-form-head">
        <h2 id="schools-form-head" className={styles.sectionHead}>
          {t('schools.formHead')}
        </h2>
        <p className={styles.formIntro}>{t('schools.formIntro')}</p>
        <form className={styles.form} onSubmit={submit}>
          <label className={styles.field}>
            <span>{t('schools.form.name')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('schools.form.namePh')}
              autoComplete="name"
            />
          </label>
          <label className={styles.field}>
            <span>{t('schools.form.school')}</span>
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder={t('schools.form.schoolPh')}
            />
          </label>
          <label className={styles.field}>
            <span>{t('schools.form.seats')}</span>
            <input
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              placeholder={t('schools.form.seatsPh')}
              inputMode="numeric"
            />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>{t('schools.form.message')}</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('schools.form.messagePh')}
              rows={4}
            />
          </label>
          <button type="submit" className={styles.send}>
            {t('schools.form.send')}
          </button>
        </form>
        <p className={styles.orEmail}>
          {t('schools.orEmail')} <a href={`mailto:${email}`}>{email}</a>
        </p>
      </section>

      <section className={styles.faqWrap} aria-labelledby="schools-faq-head">
        <h2 id="schools-faq-head" className={styles.sectionHead}>
          {t('schools.faqHead')}
        </h2>
        <div className={styles.faqList}>
          {faqs.map((item) => (
            <details key={item.q} className={styles.faq}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <Disclaimer />
    </section>
  );
}
