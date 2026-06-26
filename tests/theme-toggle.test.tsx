import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '../src/i18n';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { setTheme } from '../src/lib/theme';

// ThemeToggle flips the Cockpit / Night-Ops dark theme on <html> and reflects
// pressed state via aria-pressed — the night-ops entry point in the chrome.

afterEach(() => {
  cleanup();
  setTheme('falcon');
  document.documentElement.removeAttribute('data-theme');
  localStorage.clear();
});

describe('<ThemeToggle />', () => {
  it('renders an accessible toggle button, unpressed on the default theme', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: 'Toggle night-ops theme' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('engages cockpit mode on click — sets data-theme and aria-pressed', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: 'Toggle night-ops theme' });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('cockpit');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('passes the className through to the button', () => {
    render(<ThemeToggle className="theme-toggle" />);
    expect(screen.getByRole('button')).toHaveClass('theme-toggle');
  });
});
