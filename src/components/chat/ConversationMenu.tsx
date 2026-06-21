import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Conversation } from '../../calc/conversations';
import styles from './ConversationMenu.module.css';

/**
 * The conversation switcher in the chat header: a "New chat" button plus a
 * History menu (native <details> for keyboard/AT support) listing recent threads
 * to revisit or delete. Pure presentational — the page owns the archive state and
 * persistence; this just renders and reports intent.
 */
export function ConversationMenu({
  conversations,
  activeId,
  onNew,
  onSelect,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const menuRef = useRef<HTMLDetailsElement>(null);

  function select(id: string) {
    if (menuRef.current) menuRef.current.open = false;
    onSelect(id);
  }

  return (
    <div className={styles.bar}>
      <button type="button" className={styles.newBtn} onClick={onNew}>
        <span aria-hidden="true">＋</span> {t('chat.newChat')}
      </button>

      <details className={styles.menu} ref={menuRef}>
        <summary className={styles.summary}>{t('chat.history')}</summary>
        <div className={styles.panel}>
          {conversations.length === 0 ? (
            <p className={styles.empty}>{t('chat.historyEmpty')}</p>
          ) : (
            <ul className={styles.list}>
              {conversations.map((c) => (
                <li
                  key={c.id}
                  className={`${styles.row} ${c.id === activeId ? styles.active : ''}`}
                >
                  <button type="button" className={styles.pick} onClick={() => select(c.id)}>
                    <span className={styles.title}>{c.title || t('chat.untitled')}</span>
                    <span className={styles.when}>
                      {new Date(c.updatedAt).toLocaleDateString(i18n.language, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.del}
                    onClick={() => onDelete(c.id)}
                    aria-label={t('chat.deleteConversation')}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}
