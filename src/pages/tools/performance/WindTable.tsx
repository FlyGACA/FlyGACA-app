import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { TextField } from '@/components/calc/TextField';
import { SelectField } from '@/components/calc/SelectField';
import { FieldGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { parseRunways, windTable } from '@/calc/windTable';
import { CompassRose } from './CompassRose';
import styles from './WindTable.module.css';

const AIRCRAFT_LIMITS = [
  { id: 'C172S', label: 'Cessna 172S (15 kt)', limit: 15 },
  { id: 'PA28', label: 'Piper Archer PA28 (17 kt)', limit: 17 },
  { id: 'DA40', label: 'Diamond DA40 (20 kt)', limit: 20 },
  { id: 'SR22', label: 'Cirrus SR22 (21 kt)', limit: 21 },
];

export function WindTable() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ dir: '', spd: '', rwys: '', aircraft: '' });
  const rows = windTable(parseRunways(inputs.rwys), nums.dir, nums.spd);

  const selectedAc = AIRCRAFT_LIMITS.find(a => a.id === inputs.aircraft);
  const limit = selectedAc ? selectedAc.limit : 0;

  return (
    <CalcShell
      title={t('tools.items.wind-table.name')}
      intro={t('tools.items.wind-table.blurb')}
      category={t('tools.categories.performance')}
      formula={t('windTable.formula')}
      onExample={() => {
        set('dir', '120');
        set('spd', '18');
        set('rwys', '16L/34R, 07/25');
        set('aircraft', 'C172S');
      }}
      related={[{ to: '/tools/crosswind', label: t('tools.items.crosswind.name') }]}
    >
      <FieldGrid>
        <NumberField
          label={t('windTable.windDir')}
          value={inputs.dir}
          onChange={(v) => set('dir', v)}
          unit="°"
          placeholder="120"
        />
        <NumberField
          label={t('windTable.windSpeed')}
          value={inputs.spd}
          onChange={(v) => set('spd', v)}
          unit="kt"
          placeholder="18"
        />
        <TextField
          label={t('windTable.runways')}
          value={inputs.rwys}
          onChange={(v) => set('rwys', v)}
          placeholder="16L/34R, 07/25"
          hint={t('windTable.runwaysHint')}
        />
        <SelectField
          label={t('crosswind.aircraft')}
          value={inputs.aircraft}
          onChange={(v) => set('aircraft', v)}
          placeholder={t('crosswind.aircraftNone')}
          options={AIRCRAFT_LIMITS.map(ac => ({ value: ac.id, label: ac.label }))}
        />
      </FieldGrid>

      {rows.length === 0 ? (
        <p className={styles.empty}>{t('windTable.empty')}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('windTable.runwayCol')}</th>
                <th>{t('windTable.headingCol')}</th>
                <th>{t('windTable.crosswindCol')}</th>
                <th>{t('windTable.headwindCol')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const xwBad = limit > 0 ? Math.abs(r.crosswind) > limit : Math.abs(r.crosswind) >= 15;
                return (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td>{r.heading}°</td>
                    <td className={xwBad ? styles.bad : undefined}>
                      {Math.abs(r.crosswind).toFixed(0)} kt {r.crosswind >= 0 ? '→R' : '←L'}
                      {limit > 0 && xwBad && (
                        <div style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: 'bold' }}>
                          {t('crosswind.limitBadge', { limit })}
                        </div>
                      )}
                    </td>
                    <td className={r.headwind < 0 ? styles.bad : undefined}>
                      {Math.abs(r.headwind).toFixed(0)} kt {r.headwind >= 0 ? 'H' : 'T'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && <CompassRose windDir={nums.dir} windSpeed={nums.spd} rows={rows} />}
    </CalcShell>
  );
}
