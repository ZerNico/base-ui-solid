import { createSignal, untrack } from 'solid-js';
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
 * Clears the committed value when a filter popup closes while retaining the displayed query and
 * filtered items until the exit transition completes.
 */
export function useFilterDropdownCloseQuery(parameters: UseFilterDropdownCloseQueryParameters) {
  // Port note: parameters are read lazily through getters.
  const open = () => parameters.open;
  const mounted = () => parameters.mounted;
  const value = () => parameters.value;
  const onValueChange = parameters.onValueChange;
  const [closeQuery, setCloseQuery] = createSignal<string | null>(null);
  const previousOpenRef = { current: untrack(open) };
  useIsoLayoutEffect(
    () =>
      untrack(() => {
        const wasOpen = previousOpenRef.current;
        previousOpenRef.current = open();
        if (wasOpen && !open() && value() !== '') {
          setCloseQuery(value());
          onValueChange('', createChangeEventDetails(REASONS.popupClose));
        } else if ((open() || !mounted()) && closeQuery() !== null) {
          setCloseQuery(null);
        }
      }),
    () => [open(), mounted(), value(), closeQuery(), onValueChange],
  );
  return () => (!open() && closeQuery() !== null ? closeQuery()! : value());
}
