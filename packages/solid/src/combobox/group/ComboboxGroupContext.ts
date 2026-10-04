import { createContext, useContext } from 'solid-js';
import type { Accessor, Setter } from 'solid-js';

/**
 * Port note: `labelId` and `items` are accessors.
 */
export interface ComboboxGroupContext {
  labelId: Accessor<string | undefined>;
  setLabelId: Setter<string | undefined>;
  /**
   * Optional list of items that belong to this group. Used by nested
   * collections to render group-specific items.
   */
  items?: Accessor<readonly any[] | undefined> | undefined;
}

export const ComboboxGroupContext = createContext<ComboboxGroupContext | null>(null);

export function useComboboxGroupContext() {
  const context = useContext(ComboboxGroupContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: ComboboxGroupContext is missing. ComboboxGroup parts must be placed within <Combobox.Group>.',
    );
  }
  return context;
}
