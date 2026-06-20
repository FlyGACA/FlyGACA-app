import { useCallback, useEffect, useState } from 'react';
import { CommandPaletteContext } from './context';
import { CommandPalette } from './CommandPalette';

/**
 * App-level host for the ⌘K palette. Owns the open state and the global
 * ⌘K / Ctrl-K shortcut, and renders the palette outside the header so its
 * fixed overlay isn't trapped by the header's backdrop-filter containing block.
 */
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <CommandPaletteContext.Provider value={{ open }}>
      {children}
      <CommandPalette open={isOpen} onClose={() => setIsOpen(false)} />
    </CommandPaletteContext.Provider>
  );
}
