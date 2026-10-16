import { createMemo, untrack } from 'solid-js';
import { onCleanupWithWrites } from '@base-ui-solid/utils/cleanup';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { FilterDropdownRoot } from './FilterDropdownRootContext';

interface UseFilterDropdownCloseQueryParameters {
  open: boolean;
  mounted: boolean;
  value: string;
  onValueChange: (value: string, details: FilterDropdownRoot.ChangeEventDetails) => void;
}

/**
 * Retains the displayed query and filtered items while a filter popup closes, and clears the
 * committed value once it has unmounted. The input lives inside the popup, so the value stays in
 * use until then: clearing it earlier would change whatever the consumer renders from it, such
 * as externally filtered items, while the popup animates out.
 */
export function useFilterDropdownCloseQuery(parameters: UseFilterDropdownCloseQueryParameters) {
  // Port note: parameters are read lazily through getters.
  const open = () => parameters.open;
  const mounted = () => parameters.mounted;
  const value = () => parameters.value;
  const onValueChange = parameters.onValueChange;

  // Port note: upstream holds the query in state set from a layout effect when the popup closes.
  // Here it's derived from the open and mounted transitions: the value at the close, until the
  // popup reopens or unmounts.
  const held = createMemo<{ open: boolean; query: string | null }>((previous) => {
    const openValue = open();
    if (openValue || !mounted()) {
      return { open: openValue, query: null };
    }
    if (previous?.open) {
      const closingValue = untrack(value);
      return { open: false, query: closingValue !== '' ? closingValue : null };
    }
    return previous ?? { open: false, query: null };
  });

  // Clearing the value notifies the consumer, so it stays an effect: once the popup has unmounted,
  // or when a reopen interrupts the exit (it never unmounts).
  let wasOpen = untrack(open);
  let pendingReset = false;

  function settlePendingReset() {
    pendingReset = false;
    if (untrack(value) !== '') {
      onValueChange('', createChangeEventDetails(REASONS.popupClose));
    }
  }

  useIsoLayoutEffect(
    ([openValue, mountedValue]) => {
      if (wasOpen && !openValue && untrack(value) !== '') {
        pendingReset = true;
      }
      wasOpen = openValue;
      if (pendingReset && (openValue || !mountedValue)) {
        settlePendingReset();
      }
    },
    () => [open(), mounted()],
  );

  onCleanupWithWrites(() => {
    if (pendingReset) {
      settlePendingReset();
    }
  });

  return () => {
    const { query } = held();
    return !open() && query !== null ? query : value();
  };
}
