import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { cleanup, screen, act } from '@testing-library/react';
import i18n from '../src/i18n';
import { SubscriptionPanel } from '../src/components/account/SubscriptionPanel';
import { renderWithRouter } from './helpers/render';

// With no Firebase configured the account store starts on the default (free)
// entitlement. The Pro branch is server-written (no client setter), so it is
// covered by e2e/manual, not here.
beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  act(() => void i18n.changeLanguage('en'));
});

describe('<SubscriptionPanel />', () => {
  it('shows the free-plan prompt and a Go Pro link to /pricing', () => {
    renderWithRouter(<SubscriptionPanel />);
    expect(screen.getByText("You're on the free plan.")).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Go Pro' });
    expect(link).toHaveAttribute('href', '/pricing');
  });

  it('does not offer a Manage button while on the free plan', () => {
    renderWithRouter(<SubscriptionPanel />);
    expect(screen.queryByRole('button', { name: 'Manage subscription' })).toBeNull();
  });
});
