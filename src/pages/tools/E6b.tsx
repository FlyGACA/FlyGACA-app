import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '../../components/CalcShell';
import { NumberField } from '../../components/calc/NumberField';
import { ResultStat } from '../../components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '../../components/calc/Grids';
import { trueAirspeed } from '../../calc/tas';
import { windTriangle } from '../../calc/navigation';
import { solveTsd } from '../../calc/tsd';
import seg from '../../components/calc/calc.module.css';

type Tab = 'tas' | 'wind' | 'tsd';

export function E6b() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('tas');
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const n = (k: string) => parseFloat(f[k] ?? '');

  const tas = trueAirspeed({ cas: n('cas'), pa: n('pa'), oat: n('oat') });
  const wind = windTriangle(n('crs'), n('wtas'), n('wdir'), n('wspd'));
  const tsd = solveTsd(n('gs'), n('dist'), n('time'));

  return (
    <CalcShell
      title={t('tools.items.e6b.name')}
      intro={t('tools.items.e6b.blurb')}
      category={t('tools.categories.navigation')}
      formula={t('e6b.formula')}
      related={[
        { to: '/tools/tas', label: t('tools.items.tas.name') },
        { to: '/tools/wind-triangle', label: t('tools.items.wind-triangle.name') },
        { to: '/tools/tsd', label: t('tools.items.tsd.name') },
      ]}
    >
      <div className={seg.seg} role="tablist" aria-label="E6B">
        {(['tas', 'wind', 'tsd'] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`${seg.segBtn} ${tab === id ? seg.segActive : ''}`}
            onClick={() => setTab(id)}
          >
            {t(id === 'tas' ? 'e6b.tabsTas' : id === 'wind' ? 'e6b.tabsWind' : 'e6b.tabsTsd')}
          </button>
        ))}
      </div>

      {tab === 'tas' && (
        <>
          <FieldGrid>
            <NumberField
              label={t('tas.cas')}
              value={f.cas ?? ''}
              onChange={(v) => set('cas', v)}
              unit="kt"
              placeholder="110"
            />
            <NumberField
              label={t('tas.pa')}
              value={f.pa ?? ''}
              onChange={(v) => set('pa', v)}
              unit="ft"
              placeholder="8000"
            />
            <NumberField
              label={t('tas.oat')}
              value={f.oat ?? ''}
              onChange={(v) => set('oat', v)}
              unit="°C"
              placeholder="10"
            />
          </FieldGrid>
          <OutputGrid>
            <ResultStat
              label={t('tas.trueAirspeed')}
              value={tas ? `${Math.round(tas.tas)} kt` : '—'}
              tone="headline"
            />
            <ResultStat label={t('tas.mach')} value={tas ? `M ${tas.mach.toFixed(3)}` : '—'} />
          </OutputGrid>
        </>
      )}

      {tab === 'wind' && (
        <>
          <FieldGrid>
            <NumberField
              label={t('windTriangle.course')}
              value={f.crs ?? ''}
              onChange={(v) => set('crs', v)}
              unit="°"
              placeholder="270"
            />
            <NumberField
              label={t('windTriangle.tas')}
              value={f.wtas ?? ''}
              onChange={(v) => set('wtas', v)}
              unit="kt"
              placeholder="110"
            />
            <NumberField
              label={t('windTriangle.windDir')}
              value={f.wdir ?? ''}
              onChange={(v) => set('wdir', v)}
              unit="°"
              placeholder="320"
            />
            <NumberField
              label={t('windTriangle.windSpeed')}
              value={f.wspd ?? ''}
              onChange={(v) => set('wspd', v)}
              unit="kt"
              placeholder="25"
            />
          </FieldGrid>
          <OutputGrid>
            <ResultStat
              label={t('windTriangle.heading')}
              value={wind ? `${Math.round(wind.heading)}°` : '—'}
              tone="headline"
            />
            <ResultStat
              label={t('windTriangle.wca')}
              value={wind ? `${wind.wca >= 0 ? '+' : ''}${wind.wca.toFixed(0)}°` : '—'}
            />
            <ResultStat
              label={t('windTriangle.gs')}
              value={wind ? `${Math.round(wind.groundSpeed)} kt` : '—'}
            />
          </OutputGrid>
        </>
      )}

      {tab === 'tsd' && (
        <>
          <FieldGrid>
            <NumberField
              label={t('tsd.gs')}
              value={f.gs ?? ''}
              onChange={(v) => set('gs', v)}
              unit="kt"
              placeholder="120"
            />
            <NumberField
              label={t('tsd.distance')}
              value={f.dist ?? ''}
              onChange={(v) => set('dist', v)}
              unit="NM"
              placeholder="30"
            />
            <NumberField
              label={t('tsd.time')}
              value={f.time ?? ''}
              onChange={(v) => set('time', v)}
              unit="min"
              placeholder="—"
            />
          </FieldGrid>
          <OutputGrid>
            <ResultStat
              label={t('tsd.gs')}
              value={tsd ? `${Math.round(tsd.groundSpeed)} kt` : '—'}
            />
            <ResultStat
              label={t('tsd.distance')}
              value={tsd ? `${tsd.distanceNm.toFixed(1)} NM` : '—'}
            />
            <ResultStat
              label={t('tsd.time')}
              value={tsd ? `${tsd.timeMin.toFixed(1)} min` : '—'}
              tone="headline"
            />
          </OutputGrid>
        </>
      )}
    </CalcShell>
  );
}
