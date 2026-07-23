import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/lib/useNumericInputs';
import { percentMac, weightBalance } from '@/calc/weightBalance';
import styles from './WeightBalance.module.css';

const STATIONS = ['empty', 'front', 'rear', 'baggage', 'fuelStation'] as const;

export function WeightBalance() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({
    ew: '',
    ea: '',
    fw: '',
    fa: '',
    rw: '',
    ra: '',
    bw: '',
    ba: '',
    uw: '',
    ua: '',
    lemac: '',
    mac: '',
  });

  const stations = [
    { weight: nums.ew, arm: nums.ea },
    { weight: nums.fw, arm: nums.fa },
    { weight: nums.rw, arm: nums.ra },
    { weight: nums.bw, arm: nums.ba },
    { weight: nums.uw, arm: nums.ua },
  ];
  const wKeys = ['ew', 'fw', 'rw', 'bw', 'uw'] as const;
  const aKeys = ['ea', 'fa', 'ra', 'ba', 'ua'] as const;

  const r = weightBalance(stations);
  const pmac = r != null ? percentMac(r.cg, nums.lemac, nums.mac) : null;

  return (
    <CalcShell
      title={t('tools.items.weight-balance.name')}
      intro={t('tools.items.weight-balance.blurb')}
      category={t('tools.categories.weight-fuel')}
      formula={t('weightBalance.formula')}
      onExample={() => {
        set('ew', '1000');
        set('ea', '36');
        set('fw', '340');
        set('fa', '37');
        set('bw', '40');
        set('ba', '48');
        set('uw', '160');
        set('ua', '48');
        set('lemac', '35');
        set('mac', '5');
      }}
      adelPrompt={() =>
        r != null
          ? `My loaded weight is ${Math.round(r.weight)} with CG at arm ${r.cg.toFixed(1)}${pmac != null ? ` (${pmac.toFixed(0)}% MAC)` : ''}. How do I check this against the weight & balance envelope?`
          : null
      }
      related={[{ to: '/tools/fuel', label: t('tools.items.fuel.name') }]}
    >
      <div className={styles.stations}>
        {STATIONS.map((s, i) => (
          <div key={s} className={styles.row}>
            <span className={styles.rowLabel}>{t(`weightBalance.${s}`)}</span>
            <NumberField
              label={t('weightBalance.weight')}
              value={inputs[wKeys[i]]}
              onChange={(v) => set(wKeys[i], v)}
            />
            <NumberField
              label={t('weightBalance.arm')}
              value={inputs[aKeys[i]]}
              onChange={(v) => set(aKeys[i], v)}
            />
          </div>
        ))}
        <div className={styles.row}>
          <span className={styles.rowLabel} />
          <NumberField
            label={t('weightBalance.lemac')}
            value={inputs.lemac}
            onChange={(v) => set('lemac', v)}
          />
          <NumberField
            label={t('weightBalance.mac')}
            value={inputs.mac}
            onChange={(v) => set('mac', v)}
          />
        </div>
      </div>

      <OutputGrid>
        <ResultStat
          label={t('weightBalance.totalWeight')}
          value={r != null ? Math.round(r.weight).toLocaleString() : '—'}
          tone="headline"
        />
        <ResultStat label={t('weightBalance.cg')} value={r != null ? r.cg.toFixed(2) : '—'} />
        <ResultStat
          label={t('weightBalance.percentMac')}
          value={pmac != null ? `${pmac.toFixed(1)} %` : '—'}
        />
      </OutputGrid>
    </CalcShell>
  );
}
