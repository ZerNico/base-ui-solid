import { createCollatorItemFilter, createSingleSelectionCollatorFilter } from './index';
import { getFilter } from '../../../internals/filter';
import type { Filter, GetFilterParameters as UseFilterOptions } from '../../../internals/filter';

export type { Filter, UseFilterOptions };

/**
 * Matches items against a query using `Intl.Collator` for robust string matching.
 *
 * Port note: like `useComboboxFilter`, the options are read lazily like Solid props, so pass an
 * object with getters for reactive options (e.g. `get locale() { return locale(); }`). The returned
 * filter is stable and its methods use the latest options.
 */
export function useCoreFilter(options: UseFilterOptions = {}): Filter {
  const filter = () => getFilter(options);
  return {
    contains: (item, query, itemToString) => filter().contains(item, query, itemToString),
    startsWith: (item, query, itemToString) => filter().startsWith(item, query, itemToString),
    endsWith: (item, query, itemToString) => filter().endsWith(item, query, itemToString),
  };
}

export interface UseComboboxFilterOptions extends UseFilterOptions {
  /**
   * Whether the combobox is in multiple selection mode.
   * @default false
   */
  multiple?: boolean | undefined;
  /**
   * The current value of the combobox, used to keep every item visible while the query still
   * matches the selection.
   */
  value?: any;
}

/**
 * Matches items against a query using `Intl.Collator` for robust string matching.
 *
 * Port note: the options are read lazily like Solid props, so pass an object with getters for
 * reactive options (e.g. `get value() { return value(); }`). The returned filter is stable and its
 * methods read the latest options, so a memo calling them re-runs when the options change.
 */
export function useComboboxFilter(options: UseComboboxFilterOptions = {}): Filter {
  const coreFilter = () => {
    const { multiple, value, ...collatorOptions } = options;
    return getFilter(collatorOptions);
  };

  const contains: Filter['contains'] = (
    item: any,
    query: string,
    itemToString?: (item: any) => string,
  ) => {
    const multiple = options.multiple ?? false;
    if (multiple) {
      return createCollatorItemFilter(coreFilter(), itemToString)(item, query);
    }
    return createSingleSelectionCollatorFilter(
      coreFilter(),
      itemToString,
      options.value,
    )(item, query);
  };

  return {
    contains,
    startsWith: (item, query, itemToString) => coreFilter().startsWith(item, query, itemToString),
    endsWith: (item, query, itemToString) => coreFilter().endsWith(item, query, itemToString),
  };
}
