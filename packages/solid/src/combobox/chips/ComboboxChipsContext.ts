import { createContext, useContext } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';

export interface ComboboxChipsContext {
  chipsRef: RefObject<Array<HTMLButtonElement | null>>;
}

export const ComboboxChipsContext = createContext<ComboboxChipsContext | null>(null);

export function useComboboxChipsContext() {
  return useContext(ComboboxChipsContext) ?? undefined;
}
