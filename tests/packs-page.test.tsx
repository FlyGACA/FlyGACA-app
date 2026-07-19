import { describe, expect, it, afterEach, vi } from 'vitest';
import { screen, cleanup, within } from '@testing-library/react';
import i18n from '../src/i18n';
import { renderWithRouter } from './helpers/render';
import { Packs } from '../src/pages/study/Packs';

// The storefront renders purely from the prepCatalog + the account store (default
// signed-out: no plan, no owned packs), so no network stub is needed. It exercises
// the card states: free / paid-locked / coming-soon.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  void i18n.changeLanguage('en');
});

describe('<Packs /> storefront', () => {
  it('groups packs into Certificates and Subject sections', () => {
    renderWithRouter(<Packs />);
    expect(screen.getByRole('heading', { name: 'Certificates & ratings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Subject packs' })).toBeInTheDocument();
  });

  it('shows a paid, unowned pack as locked with the one-time price and a link to its page', () => {
    renderWithRouter(<Packs />);
    const link = screen.getByRole('link', { name: /Aviation medical/ });
    expect(link).toHaveAttribute('href', '/study/packs/medical');
    expect(within(link).getByText(/SAR 39 · one-time/)).toBeInTheDocument();
  });

  it('marks the free sampler pack as Free', () => {
    renderWithRouter(<Packs />);
    const link = screen.getByRole('link', { name: /Airspace & VFR/ });
    expect(within(link).getByText('Free')).toBeInTheDocument();
  });

  it('renders a coming-soon pack as a non-link card with a notify form', () => {
    renderWithRouter(<Packs />);
    // "Coming soon" appears, but the CPL pack is NOT a link (no detail route yet).
    expect(screen.getAllByText('Coming soon').length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /CPL exam prep/ })).not.toBeInTheDocument();
    // Its notify-me email capture is present.
    expect(screen.getAllByPlaceholderText('you@example.com').length).toBeGreaterThan(0);
  });
});
