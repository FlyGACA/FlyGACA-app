import { useTranslation } from 'react-i18next';
import { CalcShell } from '../../components/CalcShell';
import { useUrlState } from '../../lib/useUrlState';
import { trueAirspeed } from '../../calc/tas';
import shared from './CalcFields.module.css';

const EXAMPLE = { cas: '110', pa: '8000', oat: '10' };

export function Tas() {
  const { t } = useTranslation();
  const [inputs, set] = useUrlState({ cas: '', pa: '', oat: '' });

  const r = trueAirspeed({
    cas: parseFloat(inputs.cas),
    pa: parseFloat(inputs.pa),
    oat: parseFloat(inputs.oat),
  });

  const adelPrompt = () => {
    if (!r) return null;
    return (
      `Explain this true-airspeed computation like a flight instructor. ` +
      `CAS ${inputs.cas} kt at pressure altitude ${inputs.pa} ft, OAT ${inputs.oat}°C → ` +
      `TAS ${Math.round(r.tas)} kt (M ${r.mach.toFixed(3)}, ISA ${r.isaDev >= 0 ? '+' : ''}${Math.round(r.isaDev)}°C). ` +
      `Why does TAS grow with altitude, and when do I use TAS vs CAS vs groundspeed in planning?`
    );
  };

  return (
    <CalcShell
      title={t('tas.title')}
      intro={t('tas.intro')}
      category={t('tools.categories.speed')}
      formula={t('tas.formula')}
      onExample={() => {
        set('cas', EXAMPLE.cas);
        set('pa', EXAMPLE.pa);
        set('oat', EXAMPLE.oat);
      }}
      adelPrompt={adelPrompt}
      related={[
        { to: '/tools/mach', label: t('tools.items.mach.name') },
        { to: '/tools/isa', label: t('tools.items.isa.name') },
        { to: '/tools/wind-triangle', label: t('tools.items.wind-triangle.name') },
      ]}
    >
      <div className={shared.inputs}>
        <label className={shared.field}>
          <span>{t('tas.cas')}</span>
          <input
            inputMode="numeric"
            value={inputs.cas}
            onChange={(e) => set('cas', e.target.value)}
            placeholder="110"
          />
        </label>
        <label className={shared.field}>
          <span>{t('tas.pa')}</span>
          <input
            inputMode="numeric"
            value={inputs.pa}
            onChange={(e) => set('pa', e.target.value)}
            placeholder="8000"
          />
        </label>
        <label className={shared.field}>
          <span>{t('tas.oat')}</span>
          <input
            inputMode="numeric"
            value={inputs.oat}
            onChange={(e) => set('oat', e.target.value)}
            placeholder="10"
          />
        </label>
      </div>

      <dl className={shared.outputs}>
        <div>
          <dt>{t('tas.trueAirspeed')}</dt>
          <dd className={shared.headline}>{r ? `${Math.round(r.tas)} kt` : '—'}</dd>
        </div>
        <div>
          <dt>{t('tas.mach')}</dt>
          <dd>{r ? `M ${r.mach.toFixed(3)}` : '—'}</dd>
        </div>
        <div>
          <dt>{t('tas.isaDev')}</dt>
          <dd>{r ? `${r.isaDev >= 0 ? 'ISA+' : 'ISA'}${Math.round(r.isaDev)}°C` : '—'}</dd>
        </div>
      </dl>
    </CalcShell>
  );
}
