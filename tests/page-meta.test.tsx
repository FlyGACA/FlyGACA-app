import type { ReactElement } from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { usePageMeta } from '../src/lib/usePageMeta';

const DEFAULT_TITLE = 'Fly GACA — Saudi Aviation Library';

function Probe({ title, desc }: { title?: string; desc?: string }) {
  usePageMeta(title, desc);
  return null;
}

function LdProbe() {
  usePageMeta('Crosswind', 'desc', [
    { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Crosswind' },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [] },
  ]);
  return null;
}

const managedLd = () =>
  document.head.querySelector('script[data-managed-ld]')?.textContent ?? null;

// usePageMeta reads useLocation, so it must render inside a Router.
const renderProbe = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

const ogTitle = () =>
  document.head.querySelector('meta[property="og:title"]')?.getAttribute('content');
const metaDesc = () =>
  document.head.querySelector('meta[name="description"]')?.getAttribute('content');

afterEach(cleanup);

describe('usePageMeta', () => {
  it('sets a suffixed title and mirrors it into Open Graph', () => {
    renderProbe(<Probe title="Crosswind" desc="Headwind and crosswind components." />);
    expect(document.title).toBe('Crosswind — Fly GACA');
    expect(ogTitle()).toBe('Crosswind — Fly GACA');
    expect(metaDesc()).toBe('Headwind and crosswind components.');
  });

  it('falls back to the default title when no title is given', () => {
    renderProbe(<Probe />);
    expect(document.title).toBe(DEFAULT_TITLE);
  });

  it('restores the default title on unmount', () => {
    const { unmount } = renderProbe(<Probe title="Pricing" />);
    expect(document.title).toBe('Pricing — Fly GACA');
    unmount();
    expect(document.title).toBe(DEFAULT_TITLE);
    expect(ogTitle()).toBe(DEFAULT_TITLE);
  });

  it('injects a single managed JSON-LD script and removes it on unmount', () => {
    const { unmount } = renderProbe(<LdProbe />);
    const json = managedLd();
    expect(json).toBeTruthy();
    const parsed = JSON.parse(json as string);
    expect(parsed.map((x: { '@type': string }) => x['@type'])).toEqual([
      'SoftwareApplication',
      'BreadcrumbList',
    ]);
    expect(document.head.querySelectorAll('script[data-managed-ld]')).toHaveLength(1);
    unmount();
    expect(managedLd()).toBeNull();
  });
});
