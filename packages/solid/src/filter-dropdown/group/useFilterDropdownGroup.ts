import type { Accessor } from 'solid-js';
import { useStore } from '@base-ui-solid/utils/store';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useFilterDropdownItemContext } from '../root/FilterDropdownRootContext';
import type { FilterDropdownGroupContext } from './FilterDropdownGroupContext';
import { useFilterDropdownGroupContext } from './FilterDropdownGroupContext';
import type { State as StoreState } from '../store';
import { useItemRegistry } from '../../internals/useItemRegistry';

function isGroupHidden(state: StoreState, items: ReadonlyMap<symbol, boolean>) {
  // A group with no members hasn't been filtered out, it hasn't registered yet.
  if (state.visibleItemIds === null || items.size === 0) {
    return false;
  }
  for (const [id, retained] of items) {
    if (retained || state.visibleItemIds.has(id)) {
      return false;
    }
  }
  return true;
}
export interface UseFilterDropdownGroupReturnValue {
  /**
   * Whether the query filtered out every item in the group, so its label doesn't linger over an
   * empty section.
   */
  hidden: Accessor<boolean>;
  /**
   * Provider value that collects the group's items.
   */
  context: FilterDropdownGroupContext;
}
/**
 * Tracks which items belong to a group and hides the group once none of them match.
 *
 * @internal
 */
export function useFilterDropdownGroup(): UseFilterDropdownGroupReturnValue {
  const { store } = useFilterDropdownItemContext();
  const parentContext = useFilterDropdownGroupContext();
  const { items, registerItem } = useItemRegistry<symbol, boolean>();
  const hidden = useStore(store, isGroupHidden, items);
  // A nested container collects its own items, so the enclosing one only ever sees this
  // registration. Report visibility upward or a group of groups would look empty.
  const groupId = Symbol('filter-dropdown-group');
  const registerInParent = parentContext?.registerItem;
  useIsoLayoutEffect(
    () => registerInParent?.(groupId, !hidden()),
    () => [registerInParent, groupId, hidden()],
  );
  const context: FilterDropdownGroupContext = { registerItem };
  return { hidden, context };
}
