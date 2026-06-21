import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RequireSession } from './RequireSession';
import { StatusPill, type StatusTone } from '../../components/StatusPill';
import { RecordForm, type RecordDraft } from '../../components/account/RecordForm';
import {
  addRecord,
  updateRecord,
  deleteRecord,
  useAccount,
  type RecordCategory,
} from '../../lib/account';
import { usePageMeta } from '../../lib/usePageMeta';
import { parseISO } from '../../calc/recency';
import account from './account.module.css';
import styles from './records.module.css';

const CATS: RecordCategory[] = ['rating', 'aircraft', 'document', 'endorsement'];
const DAY = 86400000;

const blank = (category: RecordCategory): RecordDraft => ({
  category,
  title: '',
  ref: '',
  issued: '',
  expires: '',
  remarks: '',
});

const fmt = (s: string) => {
  const d = parseISO(s);
  return d
    ? d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';
};

function expiryStatus(expires: string): { tone: StatusTone; key: string } | null {
  const d = parseISO(expires);
  if (!d) return null;
  const days = Math.ceil((d.getTime() - Date.now()) / DAY);
  if (days < 0) return { tone: 'danger', key: 'validity.expired' };
  if (days <= 30) return { tone: 'warning', key: 'validity.expiring' };
  return { tone: 'success', key: 'validity.current' };
}

export function Records() {
  const { t } = useTranslation();
  usePageMeta(t('records.title'));
  return (
    <RequireSession>
      <Inner />
    </RequireSession>
  );
}

function Inner() {
  const { t } = useTranslation();
  const { records } = useAccount();
  const [cat, setCat] = useState<RecordCategory>('rating');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const list = records.filter((r) => r.category === cat);
  const editing = editId ? records.find((r) => r.id === editId) : undefined;

  return (
    <section className={`container ${account.page}`}>
      <header className={account.head}>
        <h1>{t('records.title')}</h1>
        <p className={account.sub}>{t('records.intro')}</p>
      </header>

      <div className={styles.tabs} role="tablist" aria-label={t('records.title')}>
        {CATS.map((c) => {
          const n = records.filter((r) => r.category === c).length;
          return (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={cat === c}
              className={`${styles.tab} ${cat === c ? styles.tabActive : ''}`}
              onClick={() => {
                setCat(c);
                setAdding(false);
                setEditId(null);
              }}
            >
              {t(`records.categories.${c}`)}
              {n > 0 && <span className={styles.count}>{n}</span>}
            </button>
          );
        })}
      </div>

      <div className={account.actions}>
        <button
          type="button"
          className={`${account.btn} ${account.btnPrimary}`}
          onClick={() => {
            setEditId(null);
            setAdding((a) => !a);
          }}
        >
          {t(`records.add.${cat}`)}
        </button>
      </div>

      {adding && (
        <RecordForm
          initial={blank(cat)}
          submitLabel={t('account.save')}
          onSubmit={(d) => {
            addRecord(d);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {editing && (
        <RecordForm
          key={editing.id}
          initial={editing}
          submitLabel={t('account.update')}
          onSubmit={(d) => {
            updateRecord(editing.id, d);
            setEditId(null);
          }}
          onCancel={() => setEditId(null)}
        />
      )}

      {list.length === 0 ? (
        <p className={account.sub}>{t('records.empty')}</p>
      ) : (
        <ul className={styles.list}>
          {list.map((r) => {
            const st = expiryStatus(r.expires);
            return (
              <li key={r.id} className={styles.item}>
                <div className={styles.main}>
                  <span className={styles.itemTitle}>{r.title || '—'}</span>
                  {r.ref && <span className={styles.itemRef}>{r.ref}</span>}
                  <span className={styles.itemMeta}>
                    {r.issued && (
                      <span>
                        {t('records.fields.issued')}: <bdi dir="ltr">{fmt(r.issued)}</bdi>
                      </span>
                    )}
                    {r.expires && (
                      <span>
                        {t('records.fields.expires')}: <bdi dir="ltr">{fmt(r.expires)}</bdi>
                      </span>
                    )}
                  </span>
                  {r.remarks && <span className={styles.itemRemarks}>{r.remarks}</span>}
                </div>
                <div className={styles.side}>
                  {st && <StatusPill tone={st.tone}>{t(st.key)}</StatusPill>}
                  <div className={account.rowActions}>
                    <button
                      type="button"
                      className={account.rowBtn}
                      aria-label={t('account.edit')}
                      onClick={() => {
                        setAdding(false);
                        setEditId(r.id);
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className={account.del}
                      aria-label={t('account.delete')}
                      onClick={() => deleteRecord(r.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
