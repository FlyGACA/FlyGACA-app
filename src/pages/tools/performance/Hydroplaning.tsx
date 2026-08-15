import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { SelectField } from '@/components/calc/SelectField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { dynamicHydroplaningSpeed, viscousHydroplaningSpeed, AIRCRAFT_PRESETS } from '@/calc/pilot/hydroplaning';

export function Hydroplaning() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ psi: '', landingSpeed: '' });
  const dynKt = dynamicHydroplaningSpeed(nums.psi);
  const visKt = viscousHydroplaningSpeed(nums.psi);
  const landingSpeed = nums.landingSpeed;

  const isDynRisk = landingSpeed != null && dynKt != null && landingSpeed >= dynKt;
  const isVisRisk = landingSpeed != null && visKt != null && landingSpeed >= visKt;

  const presetOptions = AIRCRAFT_PRESETS.map((p) => ({
    value: p.psi.toString(),
    label: p.name,
  }));

  const currentPreset = AIRCRAFT_PRESETS.find((p) => p.psi.toString() === inputs.psi);
  const selectValue = currentPreset ? currentPreset.psi.toString() : '';

  return (
    <CalcShell
      title={t('tools.items.hydroplaning.name')}
      intro={t('tools.items.hydroplaning.blurb')}
      category={t('tools.categories.performance')}
      formula={t('hydroplaning.formula')}
      onExample={() => {
        set('psi', '120');
        set('landingSpeed', '100');
      }}
      adelPrompt={() =>
        dynKt != null
          ? `With ${inputs.psi} psi tyre pressure the dynamic hydroplaning speed is about ${Math.round(dynKt)} kt. How do I avoid hydroplaning on a wet runway in the landing roll?`
          : null
      }
      related={[{ to: '/tools/crosswind', label: t('tools.items.crosswind.name') }]}
    >
      <FieldGrid>
        <SelectField
          label={t('hydroplaning.preset')}
          value={selectValue}
          onChange={(v) => {
            if (v) set('psi', v);
          }}
          options={presetOptions}
          placeholder={t('hydroplaning.custom_preset')}
        />
        <NumberField
          label={t('hydroplaning.pressure')}
          value={inputs.psi}
          onChange={(v) => set('psi', v)}
          unit="psi"
          placeholder="120"
        />
        <NumberField
          label={t('hydroplaning.landingSpeed')}
          value={inputs.landingSpeed}
          onChange={(v) => set('landingSpeed', v)}
          unit="kt"
          placeholder="100"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('hydroplaning.dynamic_speed')}
          value={dynKt != null ? `${Math.round(dynKt)} kt` : '—'}
          sub={
            <>
              {dynKt != null ? t('hydroplaning.kmh', { kmh: Math.round(dynKt * 1.852) }) : undefined}
              {isDynRisk && (
                <span style={{ color: 'red', fontWeight: 'bold', display: 'block', marginTop: 4 }}>
                  {t('hydroplaning.alert_risk')}
                </span>
              )}
            </>
          }
          tone={isDynRisk ? 'bad' : 'headline'}
        />
        <ResultStat
          label={t('hydroplaning.viscous_speed')}
          value={visKt != null ? `${Math.round(visKt)} kt` : '—'}
          sub={
            <>
              {visKt != null ? t('hydroplaning.kmh', { kmh: Math.round(visKt * 1.852) }) : undefined}
              {isVisRisk && (
                <span style={{ color: 'red', fontWeight: 'bold', display: 'block', marginTop: 4 }}>
                  {t('hydroplaning.alert_risk')}
                </span>
              )}
            </>
          }
          tone={isVisRisk ? 'bad' : 'headline'}
        />
      </OutputGrid>
    </CalcShell>
  );
}
