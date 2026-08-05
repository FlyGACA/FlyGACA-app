import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import '@/i18n';
import { Document } from '@/pages/library/Document';

// A reference-index entry can legitimately have no body: `citeOnly` documents
// (third-party copyright — Cessna, ICAO) are cited but never reproduced. The
// reader must still render the title and send the user to the rights holder.
// The regression this guards: an entry with no body used to render breadcrumbs
// over blank space, because an empty-but-200 body never sets `error` and every
// block below is gated on `html`.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const CITE_ONLY = {
  slug: 'icao-doc-7030',
  title: 'ICAO Doc 7030 — Regional Supplementary Procedures',
  category: 'icao',
  badge: 'ICAO',
  citeOnly: true,
  source: 'ICAO (free, icao.int)',
  sourceUrl: 'https://www.icao.int/EURNAT/',
};

const WITH_BODY = { slug: 'ac-00-6', title: 'AC 00-6 Aviation Weather', category: 'faa-rules' };

/** Serves the reference index for any *.json, and `body` for the doc's .html. */
function stubFetch(docs: unknown[], body: string) {
  const fetchMock = vi.fn((url: string) =>
    Promise.resolve(
      String(url).endsWith('.json')
        ? ({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                generated: '2026-08-04',
                count: docs.length,
                categories: [],
                documents: docs,
              }),
          } as unknown as Response)
        : ({ ok: true, status: 200, text: () => Promise.resolve(body) } as unknown as Response),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const renderDoc = (slug: string) =>
  render(
    <MemoryRouter initialEntries={[`/library/reference/${slug}`]}>
      <Routes>
        <Route path="/library/reference/:slug" element={<Document kind="reference" />} />
      </Routes>
    </MemoryRouter>,
  );

describe('<Document /> with no body', () => {
  it('shows the title and an outbound source link for a cite-only doc', async () => {
    stubFetch([CITE_ONLY], '');
    renderDoc(CITE_ONLY.slug);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: CITE_ONLY.title })).toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: 'Not reproduced here' })).toBeInTheDocument();
    // The rights holder is named, so the omission reads as deliberate.
    expect(screen.getByText(/ICAO \(free, icao\.int\)/)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Read at the official source/ });
    expect(link).toHaveAttribute('href', CITE_ONLY.sourceUrl);
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('never requests a body for a cite-only doc', async () => {
    const fetchMock = stubFetch([CITE_ONLY], '');
    renderDoc(CITE_ONLY.slug);

    await waitFor(() => expect(screen.getByText('Not reproduced here')).toBeInTheDocument());
    const asked = fetchMock.mock.calls.map(([u]) => String(u));
    expect(asked.some((u) => u.endsWith('.html'))).toBe(false);
  });

  it('falls back to an unavailable notice when a body file is empty', async () => {
    // A 0-byte file: fetch resolves 200 with '', so there is no error to show.
    stubFetch([WITH_BODY], '');
    renderDoc(WITH_BODY.slug);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: WITH_BODY.title })).toBeInTheDocument(),
    );
    expect(screen.getByText(/text of this document isn’t available yet/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the document normally when a body exists', async () => {
    stubFetch([WITH_BODY], '<h2 id="s1">Section one</h2><p>Weather theory.</p>');
    renderDoc(WITH_BODY.slug);

    await waitFor(() => expect(screen.getByText('Weather theory.')).toBeInTheDocument());
    expect(screen.queryByText('Not reproduced here')).not.toBeInTheDocument();
  });
});
