/**
 * Pure role-aware dashboard layout: which widgets show, in what order, and
 * which quick actions each operational role gets. No React, no i18n — ids and
 * routes only, so ordering rules stay unit-testable.
 *
 * Glance hierarchy = risk hierarchy: currency (medical / flight review /
 * recency) is never pushed below engagement widgets for any role.
 */

export type WidgetId =
  | 'numbers'
  | 'currency'
  | 'logbook'
  | 'trend'
  | 'study'
  | 'tools'
  | 'bookmarks'
  | 'adel'
  | 'updates'
  | 'offline'
  | 'achievements';

/** Every widget, in the default (pilot) order. */
export const ALL_WIDGETS: WidgetId[] = [
  'numbers',
  'currency',
  'logbook',
  'trend',
  'study',
  'tools',
  'bookmarks',
  'adel',
  'updates',
  'offline',
  'achievements',
];

/** Widget order for a role ('' or unknown → pilot default). */
export function dashboardOrder(role: string): WidgetId[] {
  switch (role) {
    case 'student':
      // Training first: study progress, then what to read next, then flying.
      return [
        'study',
        'currency',
        'bookmarks',
        'adel',
        'numbers',
        'logbook',
        'trend',
        'tools',
        'updates',
        'offline',
        'achievements',
      ];
    case 'instructor':
      // Own currency/records risk first, then teaching material and references.
      return [
        'currency',
        'tools',
        'bookmarks',
        'study',
        'numbers',
        'logbook',
        'trend',
        'adel',
        'updates',
        'offline',
        'achievements',
      ];
    default:
      // Pilot (and legacy/unset roles): operational numbers and currency lead.
      return [
        'numbers',
        'currency',
        'logbook',
        'trend',
        'tools',
        'updates',
        'bookmarks',
        'adel',
        'study',
        'offline',
        'achievements',
      ];
  }
}

/** Drop hidden widgets, preserving role order. */
export function visibleWidgets(order: WidgetId[], hidden: string[]): WidgetId[] {
  return order.filter((id) => !hidden.includes(id));
}

export interface QuickAction {
  /** i18n key for the label. */
  labelKey: string;
  to: string;
}

/** Role-tuned quick-action links (labels resolve through i18n at render). */
export function quickActionsFor(role: string): QuickAction[] {
  const base: QuickAction[] = [
    { labelKey: 'dashboard.actions.addFlight', to: '/logbook?add=1' },
    { labelKey: 'dashboard.actions.askAdel', to: '/chat' },
  ];
  switch (role) {
    case 'student':
      return [
        ...base,
        { labelKey: 'dashboard.actions.practiceExam', to: '/study/exam' },
        { labelKey: 'dashboard.actions.flashcards', to: '/study/flashcards' },
        { labelKey: 'dashboard.actions.library', to: '/library' },
      ];
    case 'instructor':
      return [
        ...base,
        { labelKey: 'dashboard.actions.records', to: '/records' },
        { labelKey: 'dashboard.actions.study', to: '/study' },
        { labelKey: 'dashboard.actions.tools', to: '/tools' },
      ];
    default:
      return [
        ...base,
        { labelKey: 'dashboard.actions.tools', to: '/tools' },
        { labelKey: 'dashboard.actions.updates', to: '/updates' },
        { labelKey: 'dashboard.actions.library', to: '/library' },
      ];
  }
}
