import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { HTMLProps } from '../internals/types';
import { compareItemEquality } from '../internals/itemEquality';
import { hasNullItemLabel, stringifyAsValue } from '../internals/resolveValueLabel';
import type { Group } from '../internals/resolveValueLabel';
import { REASONS } from '../internals/reasons';
import { popupStoreSelectors } from '../utils/popups/store';
import type { SelectRoot } from './root/SelectRoot';
import { ValuePopupStore, valuePopupSelectors } from '../utils/popups/value-popup/ValuePopupStore';
import type {
  ValuePopupContext,
  ValuePopupState,
} from '../utils/popups/value-popup/ValuePopupStore';

export type State = ValuePopupState & {
  items:
    | Record<string, JSX.Element>
    | ReadonlyArray<{ label: JSX.Element; value: any }>
    | ReadonlyArray<Group<any>>
    | undefined;
  highlightItemOnHover: boolean;
  itemToStringValue: ((item: any) => string) | undefined;

  // Port note: upstream's `itemRoot` (item props plus root values, combined to save React
  // re-renders) stays split into `itemProps` and the separate root keys. See `SelectItem`.
  itemProps: HTMLProps;
  listElement: HTMLDivElement | null;

  scrollUpArrowVisible: boolean;
  scrollDownArrowVisible: boolean;

  hasScrollArrows: boolean;
};

/**
 * Non-reactive values shared with the select parts. Nothing here is observable through
 * `selectors`, so writing to a ref never notifies subscribers.
 */
export type SelectStoreContext = ValuePopupContext<SelectRoot.OpenChangeEventDetails> & {
  readonly popupRef: RefObject<HTMLDivElement | null>;
  readonly scrollHandlerRef: RefObject<((element: HTMLDivElement) => void) | null>;
  readonly scrollArrowsMountedCountRef: RefObject<number>;
  readonly valueRef: RefObject<HTMLSpanElement | null>;
  // Port note: Solid's list effect runs before item effects. Resolve values in DOM order.
  readonly itemValues: Map<HTMLElement, () => any>;
  readonly typingRef: RefObject<boolean>;
  readonly selectionRef: RefObject<{
    allowUnselectedMouseUp: boolean;
    allowSelectedMouseUp: boolean;
    dragY: number;
  }>;
  readonly firstItemTextRef: RefObject<HTMLElement | null>;
  readonly selectedItemTextRef: RefObject<HTMLElement | null>;
  readonly alignItemWithTriggerActiveRef: RefObject<boolean>;
  readonly initialValueRef: RefObject<any>;

  // Commands. Seeded with `NOOP` when the store is constructed and assigned during the root's
  // first render, so they are not `readonly`.
  setValue: (nextValue: any, eventDetails: SelectRoot.ChangeEventDetails) => void;
  handleScrollArrowVisibility: (scroller: HTMLElement) => void;
  // Called when the item list publishes its items (in DOM order, after they rendered).
  onItemsChange: () => void;
};

export const selectors = {
  ...valuePopupSelectors,
  items: (state: State) => state.items,
  hasNullItemLabel: (state: State, enabled: boolean) =>
    enabled ? hasNullItemLabel(state.items) : false,
  multiple: (state: State) => state.selectionMode === 'multiple',
  highlightItemOnHover: (state: State) => state.highlightItemOnHover,

  hasSelectedValue: (state: State) => {
    const { selectedValue, itemToStringValue } = state;
    if (selectedValue == null) {
      return false;
    }
    if (state.selectionMode === 'multiple' && Array.isArray(selectedValue)) {
      return selectedValue.length > 0;
    }

    return stringifyAsValue(selectedValue, itemToStringValue) !== '';
  },

  // `open` is the effective open state, so a controlled `open` prop counts.
  isActiveWhileOpen: (state: State, index: number) =>
    popupStoreSelectors.open(state) && state.activeIndex === index,

  isSelected: (state: State, itemValue: any) => {
    const comparer = state.isItemEqualToValue;
    const selectedValue = state.selectedValue;

    if (state.selectionMode === 'multiple') {
      return (
        Array.isArray(selectedValue) &&
        selectedValue.some((selectedItem) => compareItemEquality(itemValue, selectedItem, comparer))
      );
    }

    // The value is the source of truth: a stale `selectedIndex` (e.g. the controlled
    // value changes while the popup is open, where the index sync is deferred) must not
    // keep a previously selected item marked as selected.
    return compareItemEquality(itemValue, selectedValue, comparer);
  },
  isSelectedByFocus: (state: State, index: number) => {
    return state.selectedIndex === index;
  },

  itemProps: (state: State) => state.itemProps,

  scrollUpArrowVisible: (state: State) => state.scrollUpArrowVisible,
  scrollDownArrowVisible: (state: State) => state.scrollDownArrowVisible,

  hasScrollArrows: (state: State) => state.hasScrollArrows,
};

export class SelectStore extends ValuePopupStore<
  State,
  SelectStoreContext,
  typeof selectors,
  SelectRoot.OpenChangeEventDetails
> {
  protected getAnchorElement(state: Readonly<State>) {
    return state.triggerElement;
  }

  protected override isOpenChangeIgnored(
    nextOpen: boolean,
    eventDetails: SelectRoot.OpenChangeEventDetails,
  ) {
    // `actionsRef.close()` does nothing while the select is closed.
    return eventDetails.reason === REASONS.imperativeAction && !nextOpen && !this.select('open');
  }

  protected override prepareUnmount() {
    return {
      activeIndex: null,
      openMethod: null,
      scrollUpArrowVisible: false,
      scrollDownArrowVisible: false,
    };
  }
}
