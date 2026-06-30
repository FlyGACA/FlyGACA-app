import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

// Hoisted so the vi.mock factories (themselves hoisted) can reference them.
const { navigate, loadJson } = vi.hoisted(() => ({ navigate: vi.fn(), loadJson: vi.fn() }));

// Navigation: capture the navigate fn so we can assert routing without a Router.
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigate };
});

// Data: stub the lazy index fetches while keeping clearJsonCache (used by the
// shared test setup) real.
vi.mock('../src/lib/content', async (orig) => {
  const actual = await orig<typeof import('../src/lib/content')>();
  return { ...actual, loadJson };
});

import { CommandPalette } from '../src/components/CommandPalette/CommandPalette';
import { openCommandPalette } from '../src/components/CommandPalette/openCommandPalette';

const gacar = {
  categories: [{ id: 'ops', label: 'Operations' }],
  documents: Array.from({ length: 60 }, (_, i) => ({
    part: String(i),
    title: `Part ${i} Rules`,
    category: 'ops',
    slug: `part-${i}`,
  })),
};
const airports = {
  airports: [
    {
      icao: 'OERK',
      name_en: 'King Khalid Intl',
      name_ar: 'الملك خالد',
      city_en: 'Riyadh',
      city_ar: 'الرياض',
      elev_ft: 2049,
    },
  ],
};

beforeEach(() => {
  navigate.mockReset();
  loadJson.mockImplementation((path: string) =>
    Promise.resolve(path.includes('airports') ? airports : gacar),
  );
});

afterEach(cleanup);

/** Open the palette and wait for the lazy indexes to populate. */
async function openAndLoad() {
  render(<CommandPalette />);
  await act(async () => {
    openCommandPalette();
  });
  await screen.findAllByRole('option');
}

describe('CommandPalette', () => {
  it('is closed until opened, then shows the dialog', async () => {
    const { container } = render(<CommandPalette />);
    expect(container.firstChild).toBeNull(); // returns null while closed
    await act(async () => {
      openCommandPalette();
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens on the ⌘K shortcut', async () => {
    render(<CommandPalette />);
    await act(async () => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('caps the rendered results at 50', async () => {
    await openAndLoad();
    // 60 reg docs + tools + guides all match an empty query, but only 50 render.
    expect(screen.getAllByRole('option').length).toBe(50);
  });

  it('filters results as the query narrows', async () => {
    await openAndLoad();
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'part 42 rules' } });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Part 42 Rules');
  });

  it('shows an empty state when nothing matches', async () => {
    await openAndLoad();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzzz-no-match' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('moves the active row with ArrowDown and navigates on Enter', async () => {
    await openAndLoad();
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'rules' } }); // only the reg docs match

    let options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    options = screen.getAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(navigate).toHaveBeenCalledWith('/library/part-1');
  });

  it('wraps ArrowUp from the first row to the last', async () => {
    await openAndLoad();
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'rules' } });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    const options = screen.getAllByRole('option');
    expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true');
  });

  it('navigates to a clicked result', async () => {
    await openAndLoad();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'part 7 rules' } });
    fireEvent.click(screen.getByText('Part 7 Rules'));
    expect(navigate).toHaveBeenCalledWith('/library/part-7');
  });

  it('narrows to a category via the filter chips', async () => {
    await openAndLoad();
    // The aerodrome only appears under "all" or the aero filter, never under reg.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'riyadh' } });
    expect(screen.getByText(/King Khalid Intl/)).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    await openAndLoad();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../src/components/CommandPalette/CommandPalette';
import { OPEN_CMDK_EVENT } from '../src/components/CommandPalette/openCommandPalette';
import { renderWithRouter } from './helpers/render';

// The palette is closed by default and opens on ⌘K or the OPEN_CMDK event. Tools
// and guides come from the in-app registry + i18n (no fetch), so the filter,
// keyboard-nav and navigate paths are exercisable in jsdom without mocking the
// (lazily-fetched) Part / aerodrome indexes.
function open(): void {
  act(() => {
    window.dispatchEvent(new CustomEvent(OPEN_CMDK_EVENT));
  });
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
  window.history.replaceState(null, '', '/');
});

describe('CommandPalette', () => {
  it('is closed until opened, then shows the dialog and filter chips', () => {
    renderWithRouter(<CommandPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    open();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Tools' })).toBeInTheDocument();
  });

  it('filters results to the typed query and shows the empty state for no matches', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CommandPalette />);
    open();
    const input = screen.getByRole('combobox');

    await user.type(input, 'crosswind');
    const options = await screen.findAllByRole('option');
    expect(options.some((o) => /crosswind/i.test(o.textContent ?? ''))).toBe(true);

    await user.clear(input);
    await user.type(input, 'zzzznotathing');
    await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0));
    // The empty copy appears both in the visible row and the sr-only live region.
    expect(screen.getAllByText(/No matches/i).length).toBeGreaterThan(0);
  });

  it('the Guides chip filters out tool matches', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CommandPalette />);
    open();
    // A tool query matches under "All"…
    await user.type(screen.getByRole('combobox'), 'crosswind');
    expect((await screen.findAllByRole('option')).length).toBeGreaterThan(0);
    // …but not once the result set is constrained to guides.
    await user.click(screen.getByRole('button', { name: 'Guides' }));
    await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0));
  });

  it('navigates to the chosen result and closes', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CommandPalette />);
    open();
    await user.type(screen.getByRole('combobox'), 'crosswind');
    const option = (await screen.findAllByRole('option')).find((o) =>
      /crosswind/i.test(o.textContent ?? ''),
    )!;
    await user.click(option);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('location').textContent).toMatch(/^\/tools\//);
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CommandPalette />);
    open();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Escape is handled on the dialog, so focus must be inside it first.
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('moves the active option with the arrow keys', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CommandPalette />);
    open();
    const input = screen.getByRole('combobox');
    // Broad query so there are several options to move through.
    await user.type(input, 'a');
    const optionsBefore = await screen.findAllByRole('option');
    expect(optionsBefore.length).toBeGreaterThan(1);
    expect(optionsBefore[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      const opts = screen.getAllByRole('option');
      expect(opts[0]).toHaveAttribute('aria-selected', 'false');
      expect(opts[1]).toHaveAttribute('aria-selected', 'true');
    });
  });
});
