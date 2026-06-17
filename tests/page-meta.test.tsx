import { describe, expect, it, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { usePageMeta } from '../src/lib/usePageMeta';

const DEFAULT_TITLE = 'Fly GACA — Saudi Aviation Library';

function Probe({ title, desc }: { title?: string; desc?: string }) {
  usePageMeta(title, desc);
  return null;
}

const ogTitle = () =>
  document.head.querySelector('meta[property="og:title"]')?.getAttribute('content');
const metaDesc = () =>
  document.head.querySelector('meta[name="description"]')?.getAttribute('content');

afterEach(cleanup);

describe('usePageMeta', () => {
  it('sets a suffixed title and mirrors it into Open Graph', () => {
    render(<Probe title="Crosswind" desc="Headwind and crosswind components." />);
    expect(document.title).toBe('Crosswind — Fly GACA');
    expect(ogTitle()).toBe('Crosswind — Fly GACA');
    expect(metaDesc()).toBe('Headwind and crosswind components.');
  });

  it('falls back to the default title when no title is given', () => {
    render(<Probe />);
    expect(document.title).toBe(DEFAULT_TITLE);
  });

  it('restores the default title on unmount', () => {
    const { unmount } = render(<Probe title="Pricing" />);
    expect(document.title).toBe('Pricing — Fly GACA');
    unmount();
    expect(document.title).toBe(DEFAULT_TITLE);
    expect(ogTitle()).toBe(DEFAULT_TITLE);
  });
});
