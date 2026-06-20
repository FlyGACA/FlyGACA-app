import { createContext, useContext } from 'react';

export interface CommandPaletteApi {
  open: () => void;
}

export const CommandPaletteContext = createContext<CommandPaletteApi>({ open: () => {} });

/** Open the command palette from anywhere in the chrome (e.g. the header button). */
export function useCommandPalette(): CommandPaletteApi {
  return useContext(CommandPaletteContext);
}
