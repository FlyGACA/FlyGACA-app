/**
 * Previously-0% dashboard bento widgets:
 *  - StatValue   — count-up metric (final value carried in an sr-only node)
 *  - ToolsWidget — live-calculator count read from the TOOLS registry
 *  - LearnWidget — guide count + (when loaded) question-bank size
 * renderWithRouter because each widget's BentoCard is a router Link.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, cleanup, waitFor } from '@testing-library/react';
import { renderWithRouter } from './helpers/render';
import { StatValue } from '@/components/bento/widgets/StatValue';
import { ToolsWidget } from '@/components/bento/widgets/ToolsWidget';
import { LearnWidget } from '@/components/bento/widgets/LearnWidget';
import { TOOLS } from '@/lib/tools';
import { GUIDE_SLUGS } from '@/pages/guides/guides';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('StatValue', () => {
  it('exposes the true final value to assistive tech regardless of the count-up animation', () => {
    renderWithRouter(<StatValue value={84} />);
    expect(screen.getByText('84')).toBeInTheDocument();
  });

  it('honours the decimals prop', () => {
    renderWithRouter(<StatValue value={12.5} decimals={1} />);
    expect(screen.getByText('12.5')).toBeInTheDocument();
  });
});

describe('ToolsWidget', () => {
  it('shows the live-tool count straight from the registry and links to /tools', () => {
    const liveCount = TOOLS.filter((tool) => tool.status === 'live').length;
    renderWithRouter(<ToolsWidget />);
    expect(screen.getByText(String(liveCount))).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/tools');
  });
});

describe('LearnWidget', () => {
  it('shows the guide count and links to /learn', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ banks: [] }) }),
    );
    renderWithRouter(<LearnWidget />);
    expect(screen.getByText(String(GUIDE_SLUGS.length))).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/learn');
  });

  it('adds the question-bank total once the quiz data loads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          banks: [{ questions: [{}, {}, {}] }, { questions: [{}, {}] }],
        }),
      }),
    );
    renderWithRouter(<LearnWidget />);
    await waitFor(() => expect(screen.getByText('5')).toBeInTheDocument());
  });
});
