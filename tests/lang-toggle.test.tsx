import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import i18n from '../src/i18n';
import { LangToggle } from '../src/components/LangToggle';

// The Arabic variant of a page lives at a real /ar URL, so LangToggle is a
// cross-language <a> link (a full navigation), not a client-side toggle. It
// shows the *other* language's glyph and points at that language's URL — the
// crawlable link between the English and Arabic documents.

// Reset to English after any test that switches language.
afterEach(async () => {
  cleanup();
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

const renderAt = (path: string, className?: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <LangToggle className={className} />
    </MemoryRouter>,
  );

describe('<LangToggle />', () => {
  it('on English, links to the /ar variant of the current path with the Arabic glyph', () => {
    renderAt('/tools/crosswind');
    const link = screen.getByRole('link', { name: 'Switch language' });
    expect(link).toHaveTextContent('ع');
    expect(link).toHaveAttribute('href', '/ar/tools/crosswind');
  });

  it('preserves the query string and hash on the alternate URL', () => {
    renderAt('/learn?tab=practice#top');
    expect(screen.getByRole('link')).toHaveAttribute('href', '/ar/learn?tab=practice#top');
  });

  it('on Arabic, links back to the clean English path with the EN glyph', async () => {
    await act(async () => {
      await i18n.changeLanguage('ar');
    });
    // On a real /ar page the router basename strips the prefix, so useLocation
    // returns the logical path; mirror that here.
    renderAt('/tools/crosswind');
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('EN');
    expect(link).toHaveAttribute('href', '/tools/crosswind');
  });

  it('passes the className through to the link', () => {
    renderAt('/', 'lang-toggle');
    expect(screen.getByRole('link')).toHaveClass('lang-toggle');
  });
});
