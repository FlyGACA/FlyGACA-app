import type { FC, SVGProps } from 'react';

/** Lucide-style line icons for the mobile bottom dock. 24×24, stroke-based so
 *  they inherit `currentColor` and the dock's active/inactive colour states.
 *  Matches the inline-SVG convention already used by the search icon in
 *  Header.tsx (we deliberately avoid an icon-font/emoji dependency). */
type IconProps = SVGProps<SVGSVGElement>;

const Svg: FC<IconProps> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  />
);

const LibraryIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </Svg>
);

const AdelIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
  </Svg>
);

const ToolsIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" />
  </Svg>
);

const StudyIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M22 10 12 5 2 10l10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </Svg>
);

/** Grid glyph for the “More” entry. */
export const MoreIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Svg>
);

const GuidesIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </Svg>
);

const PricingIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M3 3.5h7l9.5 9.5a2 2 0 0 1 0 2.8l-4.7 4.7a2 2 0 0 1-2.8 0L3 11z" />
    <circle cx="7.5" cy="7.5" r="1.3" />
  </Svg>
);

const AboutIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </Svg>
);

const AccountIcon: FC<IconProps> = (p) => (
  <Svg {...p}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Svg>
);

const BY_ROUTE: Record<string, FC<IconProps>> = {
  '/library': LibraryIcon,
  '/chat': AdelIcon,
  '/tools': ToolsIcon,
  '/learn': GuidesIcon,
  '/study': StudyIcon,
  '/guides': GuidesIcon,
  '/pricing': PricingIcon,
  '/about': AboutIcon,
  '/account': AccountIcon,
};

/** Renders the dock glyph for a primary route (nothing if the route is unmapped). */
export const DockIcon: FC<IconProps & { route: string }> = ({ route, ...rest }) => {
  const Icon = BY_ROUTE[route];
  return Icon ? <Icon {...rest} /> : null;
};
