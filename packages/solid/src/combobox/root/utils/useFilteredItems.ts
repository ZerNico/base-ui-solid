import type { Accessor } from 'solid-js';
import { useComboboxDerivedItemsContext } from '../ComboboxRootContext';

/**
 * Returns the internally filtered items.
 * Treat the result as read-only: it is internal state and may be a shared frozen array.
 *
 * Port note: returns an accessor.
 */
export function useFilteredItems<T>(): Accessor<T[]> {
  const items = useComboboxDerivedItemsContext();
  return () => items.filteredItems as T[];
}
