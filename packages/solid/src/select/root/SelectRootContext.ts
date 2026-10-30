import { createContext, useContext } from 'solid-js';
import type { SelectStore } from '../store';

export const SelectRootContext = createContext<SelectStore | null>(null);

export function useSelectRootContext() {
  const store = useContext(SelectRootContext) ?? undefined;
  if (store === undefined) {
    throw new Error(
      'Base UI: SelectRootContext is missing. Select parts must be placed within <Select.Root>.',
    );
  }
  return store;
}
