import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';

// Port note: the context value is an accessor.
export const ComboboxPortalContext = createContext<Accessor<boolean> | null>(null);

export function useComboboxPortalContext() {
  const context = useContext(ComboboxPortalContext) ?? undefined;
  if (context === undefined) {
    throw new Error('Base UI: <Combobox.Portal> is missing.');
  }
  return context;
}
