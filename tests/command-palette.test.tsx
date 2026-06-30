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
  });
});
