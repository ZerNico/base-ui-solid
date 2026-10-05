import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { ComboboxStore } from '../store';
import type { FloatingRootContext } from '../../floating-ui-solid';

/**
 * Port note: the fields are getters backed by the root's memos.
 */
export interface ComboboxDerivedItemsContext {
  query: string;
  hasItems: boolean;
  filteredItems: any[];
  /**
   * `filteredItems` flattened across groups and projected to selection values. Identical to the
   * items themselves unless `items` is a `createItems()` collection.
   */
  flatFilteredValues: any[];
  /**
   * Projects a source item to its value when `items` is a `createItems()` collection.
   */
  itemToValue: ((item: any) => any) | undefined;
  /**
   * The root's `itemToStringValue` prop.
   */
  itemToStringValue: ((itemValue: any) => string) | undefined;
}

export const ComboboxRootContext = createContext<ComboboxStore | null>(null);
export const ComboboxFloatingContext = createContext<FloatingRootContext | null>(null);
export const ComboboxDerivedItemsContext = createContext<ComboboxDerivedItemsContext | null>(null);
// Port note: context values hold accessors.
export const ComboboxHasItemsContext = createContext<Accessor<boolean>>(() => false);
// `inputValue` can't be placed in the store.
// https://github.com/mui/base-ui/issues/2703
export const ComboboxInputValueContext = createContext<
  Accessor<string | number | readonly string[] | undefined>
>(() => '');

export function useComboboxRootContext() {
  const context = useContext(ComboboxRootContext) as ComboboxStore | null;
  if (!context) {
    throw new Error(
      'Base UI: ComboboxRootContext is missing. Combobox parts must be placed within <Combobox.Root>.',
    );
  }
  return context;
}

export function useComboboxFloatingContext() {
  const context = useContext(ComboboxFloatingContext);
  if (!context) {
    throw new Error(
      'Base UI: ComboboxFloatingContext is missing. Combobox parts must be placed within <Combobox.Root>.',
    );
  }
  return context;
}

export function useComboboxDerivedItemsContext() {
  const context = useContext(ComboboxDerivedItemsContext);
  if (!context) {
    throw new Error(
      'Base UI: ComboboxItemsContext is missing. Combobox parts must be placed within <Combobox.Root>.',
    );
  }
  return context;
}

export function useComboboxInputValueContext() {
  return useContext(ComboboxInputValueContext);
}

export function useComboboxHasItemsContext() {
  return useContext(ComboboxHasItemsContext);
}
