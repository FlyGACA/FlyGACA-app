import { useTranslation } from 'react-i18next';
import { CalcShell } from '../../components/CalcShell';
import { OutputGrid } from '../../components/calc/Grids';
import { ResultStat } from '../../components/calc/ResultStat';
import { useUrlState } from '../../lib/useUrlState';
import { resolveCrosswind } from '../../calc/crosswind';
import { WindDiagram } from './WindDiagram';
import styles from './Crosswind.module.css';

const EXAMPLE = { rwy: '34', wdir: '290', wspd: '18' };

export function Crosswind() {
  const { t } = useTranslation();
  const [inputs, set] = useUrlState({ rwy: '', wdir: '', wspd: '' });

  const result = resolveCrosswind({
    runway: parseFloat(inputs.rwy),
    windDir: parseFloat(inputs.wdir),
    windSpeed: parseFloat(inputs.wspd),
  });

  const side = result
    ? Math.abs(result.crosswind) < 0.5
      ? t('crosswind.negligible')
      : result.crosswind >= 0
        ? t('crosswind.fromRight')
        : t('crosswind.fromLeft')
    : '—';

  const angleNote = result
    ? result.angle === 0
      ? t('crosswind.straightDown')
      : t('crosswind.offCentreline', {
          deg: Math.round(Math.abs(result.angle)),
          side: result.angle > 0 ? t('crosswind.right') : t('crosswind.left'),
        })
    : '';

  const diagramLabel = result
    ? Math.abs(result.crosswind) < 0.5
      ? t('crosswind.diagramLabelCalm', {
          rwy: result.runwayHeading,
          dir: Math.round(parseFloat(inputs.wdir)),
          spd: Math.round(parseFloat(inputs.wspd)),
        })
      : t('crosswind.diagramLabel', {
          rwy: result.runwayHeading,
          dir: Math.round(parseFloat(inputs.wdir)),
          spd: Math.round(parseFloat(inputs.wspd)),
          xw: Math.abs(result.crosswind).toFixed(1),
          side: result.crosswind >= 0 ? t('crosswind.right') : t('crosswind.left'),
        })
    : undefined;

  const adelPrompt = () => {
    if (!result) return null;
    return (
      `Explain this crosswind computation like a flight instructor. ` +
      `Runway ${inputs.rwy} (heading ${result.runwayHeading}°), wind ${inputs.wdir}° at ${inputs.wspd} kt: ` +
      `crosswind ${Math.abs(result.crosswind).toFixed(1)} kt from the ${result.crosswind >= 0 ? 'right' : 'left'}, ` +
      `${result.headwind >= 0 ? 'headwind' : 'tailwind'} ${Math.abs(result.headwind).toFixed(1)} kt. ` +
      `How do I fly the take-off and landing in this wind, and how do I check it against my ` +
      `aircraft's demonstrated crosswind? Cite the relevant GACAR guidance if any applies.`
    );
  };

  return (
    <CalcShell
      title={t('crosswind.title')}
      intro={t('crosswind.intro')}
      category={t('tools.categories.wind-runway')}
      formula={t('crosswind.formula')}
      onExample={() => {
        set('rwy', EXAMPLE.rwy);
        set('wdir', EXAMPLE.wdir);
        set('wspd', EXAMPLE.wspd);
      }}
      adelPrompt={adelPrompt}
      related={[
        { to: '/tools/wind-table', label: t('tools.items.wind-table.name') },
        { to: '/tools/takeoff-landing', label: t('tools.items.takeoff-landing.name') },
        { to: '/tools/wind-triangle', label: t('tools.items.wind-triangle.name') },
      ]}
    >
      <div className={styles.grid}>
        <div className={styles.inputs}>
          <label className={styles.field}>
            <span>{t('crosswind.runway')}</span>
            <input
              inputMode="numeric"
              value={inputs.rwy}
              onChange={(e) => set('rwy', e.target.value)}
              placeholder="34"
            />
          </label>
          <label className={styles.field}>
            <span>{t('crosswind.windDir')}</span>
            <input
              inputMode="numeric"
              value={inputs.wdir}
              onChange={(e) => set('wdir', e.target.value)}
              placeholder="290"
            />
          </label>
          <label className={styles.field}>
            <span>{t('crosswind.windSpeed')}</span>
            <input
              inputMode="numeric"
              value={inputs.wspd}
              onChange={(e) => set('wspd', e.target.value)}
              placeholder="18"
            />
          </label>
        </div>

        <div className={styles.diagram}>
          {result ? (
            <WindDiagram
              runwayHeading={result.runwayHeading}
              windDir={parseFloat(inputs.wdir)}
              windSpeed={parseFloat(inputs.wspd)}
              crosswind={result.crosswind}
              label={diagramLabel}
            />
          ) : (
            <p className={styles.diagramPlaceholder}>{t('crosswind.diagramHint')}</p>
          )}
        </div>
      </div>

      <OutputGrid>
        <ResultStat
          label={t('crosswind.runwayHeading')}
          value={result ? `${result.runwayHeading}°` : '—'}
        />
        <ResultStat
          label={t('crosswind.crosswind')}
          value={result ? `${Math.abs(result.crosswind).toFixed(1)} kt` : '—'}
          sub={result ? side : undefined}
          tone="headline"
        />
        <ResultStat
          label={result && result.headwind < 0 ? t('crosswind.tailwind') : t('crosswind.headwind')}
          value={result ? `${Math.abs(result.headwind).toFixed(1)} kt` : '—'}
          tone={result ? (result.headwind < 0 ? 'bad' : 'good') : undefined}
        />
        <ResultStat
          label={t('crosswind.angle')}
          value={result ? `${Math.round(Math.abs(result.angle))}°` : '—'}
        />
      </OutputGrid>
      {angleNote && <p className={styles.angleNote}>{angleNote}</p>}
    </CalcShell>
  );
}
