/**
 * Builds the command-palette index from the app's own registries — static pages,
 * the live flight tools (`src/lib/tools.ts`), the guides (`pages/guides/guides.ts`)
 * and, once fetched, the GACAR Library Parts. Labels resolve through i18n so the
 * palette is bilingual; no separate search corpus is shipped.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { liveTools } from './tools';
import { GUIDE_SLUGS } from '../pages/guides/guides';
import { useFetchJson } from './useFetchJson';
import type { GacarIndex } from './content';

export type CommandGroup = 'page' | 'tool' | 'guide' | 'library';

export interface CommandItem {
  id: string;
  label: string;
  to: string;
  group: CommandGroup;
  /** Language-neutral search hints (abbreviations, alt names). */
  keywords?: string[];
}

/** The fixed top-level destinations, in palette order. */
const PAGES: { id: string; to: string; key: string; keywords?: string[] }[] = [
  { id: 'home', to: '/', key: 'nav.home', keywords: ['home', 'start'] },
  { id: 'library', to: '/library', key: 'nav.library' },
  { id: 'chat', to: '/chat', key: 'nav.captainAdel', keywords: ['adel', 'ai', 'ask'] },
  { id: 'tools', to: '/tools', key: 'nav.tools', keywords: ['calculator'] },
  { id: 'guides', to: '/guides', key: 'nav.guides' },
  { id: 'study', to: '/study', key: 'nav.study', keywords: ['quiz', 'exam', 'flashcards'] },
  { id: 'pricing', to: '/pricing', key: 'nav.pricing', keywords: ['plans', 'pro', 'subscribe'] },
  { id: 'about', to: '/about', key: 'nav.about' },
  {
    id: 'account',
    to: '/account',
    key: 'nav.account',
    keywords: ['settings', 'logbook', 'currency'],
  },
  { id: 'charts', to: '/library/charts', key: 'nav.charts', keywords: ['vfr', 'map'] },
];

export function useCommandItems(): CommandItem[] {
  const { t } = useTranslation();
  // The Library index is small and cached by the SW; loading it enriches the
  // palette with every GACAR Part without shipping a separate search corpus.
  const gacar = useFetchJson<GacarIndex>('/data/gacar-index.json');

  return useMemo(() => {
    const pages: CommandItem[] = PAGES.map((p) => ({
      id: `page:${p.id}`,
      label: t(p.key),
      to: p.to,
      group: 'page',
      keywords: p.keywords,
    }));

    const tools: CommandItem[] = liveTools().map((tool) => ({
      id: `tool:${tool.id}`,
      label: t(`tools.items.${tool.id}.name`),
      to: tool.route,
      group: 'tool',
      keywords: tool.keywords,
    }));

    const guides: CommandItem[] = GUIDE_SLUGS.map((slug) => ({
      id: `guide:${slug}`,
      label: t(`guides.items.${slug}.name`),
      to: `/guides/${slug}`,
      group: 'guide',
    }));

    const library: CommandItem[] = (gacar.data?.documents ?? []).map((d) => ({
      id: `lib:${d.slug}`,
      label: `${t('command.partPrefix')} ${d.part} — ${d.title}`,
      to: `/library/${d.slug}`,
      group: 'library',
      keywords: [`part ${d.part}`, d.slug],
    }));

    return [...pages, ...tools, ...guides, ...library];
  }, [t, gacar.data]);
}
