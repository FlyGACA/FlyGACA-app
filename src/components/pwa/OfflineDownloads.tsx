import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { clearAll, loadSaved, offlineSupported, storageEstimate } from '../../lib/offlineCache';
import { formatBytes } from '../../calc/offlineManifest';
import styles from './OfflineDownloads.module.css';

/**
 * Compact "saved for offline" summary for the Library index: how many docs are
 * saved, the on-device storage estimate, and a remove-all. Renders nothing until
 * something is saved (or when the Cache API is unavailable).
 */
export function OfflineDownloads() {
  const { t } = useTranslation();
  const [saved, setSaved] = useState<string[]>([]);
  const [bytes, setBytes] = useState(0);

  useEffect(() => {
    if (!offlineSupported()) return;
    setSaved(loadSaved());
    void storageEstimate().then(setBytes);
  }, []);

  if (!offlineSupported() || saved.length === 0) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.info}>
        <span className={styles.title}>{t('offline.downloads')}</span>
        <span className={styles.meta}>
          {t('offline.count', { n: saved.length })}
          {bytes > 0 && ` · ${t('offline.size', { size: formatBytes(bytes) })}`}
        </span>
      </div>
      <button
        type="button"
        className={styles.remove}
        onClick={() => {
          void clearAll().then(() => setSaved([]));
        }}
      >
        {t('offline.removeAll')}
      </button>
    </div>
  );
}
