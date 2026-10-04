import { createContext, useContext } from 'solid-js';
import type { FloatingRootContext } from '../../floating-ui-react';
import type { SelectStore } from '../store';

export const SelectRootContext = createContext<SelectStore | null>(null);
export const SelectFloatingContext = createContext<FloatingRootContext | null>(null);

export function useSelectRootContext() {
  const store = useContext(SelectRootContext) ?? undefined;
  if (store === undefined) {
    throw new Error(
      'Base UI: SelectRootContext is missing. Select parts must be placed within <Select.Root>.',
    );
  }
  return store;
}

export function useSelectFloatingContext() {
  const context = useContext(SelectFloatingContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: SelectFloatingContext is missing. Select parts must be placed within <Select.Root>.',
    );
  }
  return context;
}
