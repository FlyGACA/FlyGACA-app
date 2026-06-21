import { useTranslation } from 'react-i18next';
import { CalcShell } from '../../components/CalcShell';
import { useUrlState } from '../../lib/useUrlState';
import { densityAltitude } from '../../calc/isa';
import shared from './CalcFields.module.css';

const EXAMPLE = { elev: '5000', qnh: '1013', oat: '30' };
const fmt = (n: number) => Math.round(n).toLocaleString();

export function DensityAltitude() {
  const { t } = useTranslation();
  const [inputs, set] = useUrlState({ elev: '', qnh: '', oat: '' });

  const r = densityAltitude(
    parseFloat(inputs.elev),
    parseFloat(inputs.qnh),
    parseFloat(inputs.oat),
  );

  const adelPrompt = () => {
    if (!r) return null;
    return (
      `Explain this density-altitude computation like a flight instructor. ` +
      `Field elevation ${inputs.elev} ft, QNH ${inputs.qnh} hPa, OAT ${inputs.oat}°C → ` +
      `pressure altitude ${Math.round(r.pa)} ft, ISA ${r.isaDev >= 0 ? '+' : ''}${Math.round(r.isaDev)}°C, ` +
      `density altitude ${Math.round(r.da)} ft. How does density altitude affect take-off and climb ` +
      `performance, and how should I use it with the POH/AFM? Cite the relevant GACAR guidance if any applies.`
    );
  };

  return (
    <CalcShell
      title={t('densityAltitude.title')}
      intro={t('densityAltitude.intro')}
      category={t('tools.categories.atmosphere')}
      formula={t('densityAltitude.formula')}
      onExample={() => {
        set('elev', EXAMPLE.elev);
        set('qnh', EXAMPLE.qnh);
        set('oat', EXAMPLE.oat);
      }}
      adelPrompt={adelPrompt}
      related={[
        { to: '/tools/isa', label: t('tools.items.isa.name') },
        { to: '/tools/true-altitude', label: t('tools.items.true-altitude.name') },
        { to: '/tools/takeoff-landing', label: t('tools.items.takeoff-landing.name') },
      ]}
    >
      <div className={shared.inputs}>
        <label className={shared.field}>
          <span>{t('densityAltitude.elevation')}</span>
          <input
            inputMode="numeric"
            value={inputs.elev}
            onChange={(e) => set('elev', e.target.value)}
            placeholder="5000"
          />
        </label>
        <label className={shared.field}>
          <span>{t('densityAltitude.qnh')}</span>
          <input
            inputMode="numeric"
            value={inputs.qnh}
            onChange={(e) => set('qnh', e.target.value)}
            placeholder="1013"
          />
        </label>
        <label className={shared.field}>
          <span>{t('densityAltitude.oat')}</span>
          <input
            inputMode="numeric"
            value={inputs.oat}
            onChange={(e) => set('oat', e.target.value)}
            placeholder="30"
          />
        </label>
      </div>

      <dl className={shared.outputs}>
        <div>
          <dt>{t('densityAltitude.pressureAltitude')}</dt>
          <dd>{r ? `${fmt(r.pa)} ft` : '—'}</dd>
        </div>
        <div>
          <dt>{t('densityAltitude.isaDev')}</dt>
          <dd>{r ? `${r.isaDev >= 0 ? 'ISA+' : 'ISA'}${Math.round(r.isaDev)}°C` : '—'}</dd>
        </div>
        <div>
          <dt>{t('densityAltitude.densityAltitude')}</dt>
          <dd className={shared.headline}>{r ? `${fmt(r.da)} ft` : '—'}</dd>
        </div>
      </dl>
    </CalcShell>
  );
}
