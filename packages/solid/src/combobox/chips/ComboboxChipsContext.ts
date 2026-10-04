import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';

/**
 * Port note: `highlightedChipIndex` is an accessor.
 */
export interface ComboboxChipsContext {
  highlightedChipIndex: Accessor<number | undefined>;
  setHighlightedChipIndex: (index: number | undefined) => void;
  chipsRef: RefObject<Array<HTMLButtonElement | null>>;
}

export const ComboboxChipsContext = createContext<ComboboxChipsContext | null>(null);

export function useComboboxChipsContext() {
  return useContext(ComboboxChipsContext) ?? undefined;
}
