import { useTranslation } from 'react-i18next';
import { CalcShell } from '../../components/CalcShell';
import table from './WindTable.module.css';

interface Row {
  cls: string;
  rules: string;
}

export function Airspace() {
  const { t } = useTranslation();
  const rows = t('airspace.rows', { returnObjects: true }) as unknown as Row[];

  return (
    <CalcShell
      title={t('tools.items.airspace.name')}
      intro={t('tools.items.airspace.blurb')}
      category={t('tools.categories.directory')}
      formula={t('airspace.formula')}
      related={[{ to: '/tools/vfr-minima', label: t('tools.items.vfr-minima.name') }]}
    >
      <table className={table.table}>
        <thead>
          <tr>
            <th>{t('airspace.classCol')}</th>
            <th>{t('airspace.rulesCol')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.cls}>
              <td style={{ fontWeight: 700, color: 'var(--accent-bright)' }}>{r.cls}</td>
              <td>{r.rules}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CalcShell>
  );
}
