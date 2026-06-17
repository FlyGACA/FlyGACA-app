import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import i18n from '../src/i18n';
import { LangToggle } from '../src/components/LangToggle';

// LangToggle shows the *other* language's glyph and flips the whole document to
// RTL on switch — the bilingual entry point in the chrome.

afterEach(async () => {
  cleanup();
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

describe('<LangToggle />', () => {
  it('shows the Arabic glyph and an accessible label while on English', () => {
    render(<LangToggle />);
    const btn = screen.getByRole('button', { name: 'Switch language' });
    expect(btn).toHaveTextContent('ع');
  });

  it('switches to Arabic, flips the document to RTL, and shows the EN glyph', async () => {
    render(<LangToggle className="x" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('EN'));
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('passes the className through to the button', () => {
    render(<LangToggle className="lang-toggle" />);
    expect(screen.getByRole('button')).toHaveClass('lang-toggle');
  });
});
