import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { cleanup, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../src/i18n';
import { CommandPalette } from '../src/components/command/CommandPalette';
import { renderWithRouter } from './helpers/render';

// The palette enriches its index from /data/gacar-index.json; jsdom has no fetch
// for it, so useFetchJson fails soft and the static page/tool/guide items remain.
beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  act(() => void i18n.changeLanguage('en'));
});

describe('<CommandPalette />', () => {
  it('renders nothing when closed', () => {
    renderWithRouter(<CommandPalette open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens as an accessible modal dialog with a search combobox', () => {
    renderWithRouter(<CommandPalette open onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('filters items as you type', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CommandPalette open onClose={() => {}} />);
    await user.type(screen.getByRole('combobox'), 'library');
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Library');
  });

  it('selects the top result on Enter, navigates, and records a recent', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(<CommandPalette open onClose={onClose} />, { route: '/' });
    const input = screen.getByRole('combobox');
    await user.type(input, 'library');
    await user.keyboard('{Enter}');
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/library');
    expect(JSON.parse(localStorage.getItem('flygaca:cmdk-recent') ?? '[]')).toContain('page:library');
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithRouter(<CommandPalette open onClose={onClose} />);
    await user.type(screen.getByRole('combobox'), 'x');
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
