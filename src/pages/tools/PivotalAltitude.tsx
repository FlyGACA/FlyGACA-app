import { useTranslation } from 'react-i18next';
import { CalcShell } from '../../components/CalcShell';
import { NumberField } from '../../components/calc/NumberField';
import { ResultStat } from '../../components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '../../components/calc/Grids';
import { useNumericInputs } from '../../lib/useNumericInputs';
import { pivotalAltitude } from '../../calc/navigation';

const fmt = (n: number) => Math.round(n).toLocaleString();

export function PivotalAltitude() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ gs: '' });
  const alt = pivotalAltitude(nums.gs);

  return (
    <CalcShell
      title={t('tools.items.pivotal-altitude.name')}
      intro={t('tools.items.pivotal-altitude.blurb')}
      category={t('tools.categories.navigation')}
      formula={t('pivotalAlt.formula')}
      onExample={() => set('gs', '100')}
      adelPrompt={() =>
        alt != null
          ? `At ${inputs.gs} kt groundspeed the pivotal altitude is about ${Math.round(alt)} ft. Explain eights-on-pylons and why the pivotal altitude changes with groundspeed.`
          : null
      }
      related={[
        { to: '/tools/turn-performance', label: t('tools.items.turn-performance.name') },
        { to: '/tools/standard-rate-turn', label: t('tools.items.standard-rate-turn.name') },
        { to: '/tools/tas', label: t('tools.items.tas.name') },
      ]}
    >
      <FieldGrid>
        <NumberField
          label={t('pivotalAlt.gs')}
          value={inputs.gs}
          onChange={(v) => set('gs', v)}
          unit="kt"
          placeholder="100"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('pivotalAlt.altitude')}
          value={alt != null ? `${fmt(alt)} ft` : '—'}
          tone="headline"
        />
      </OutputGrid>
    </CalcShell>
  );
}
