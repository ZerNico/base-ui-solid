import { useContext, createSignal, createMemo, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { getFilter } from '../../internals/filter';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useItemRegistry } from '../../internals/useItemRegistry';
import {
  FilterDropdownRootContext,
  FilterDropdownItemContext,
  FilterDropdownValueContext,
} from './FilterDropdownRootContext';
import type {
  FilterDropdownItemRegistration,
  FilterDropdownFilter,
  FilterDropdownRoot as FilterDropdownRootNamespace,
} from './FilterDropdownRootContext';
import { FilterDropdownStore } from '../store';
/**
 * Holds the filter query, matches it against the registered items, and publishes the result. The
 * host owns list navigation; this root moves the highlight through `setActiveIndex`.
 *
 * @internal
 */
export function FilterDropdownRoot(props: FilterDropdownRoot.Props): JSX.Element {
  const open = () => props.open;
  const disabled = () => props.disabled ?? false;
  const openedByKeyboard = () => props.openedByKeyboard ?? false;
  const locale = () => props.locale;
  const value = () => props.value;
  const query = () => props.query;
  const filter = () => props.filter;
  const autoHighlight = () => props.autoHighlight ?? false;
  const triggerIdProp = () => props.triggerId;
  const focusOwnerRefProp = () => props.focusOwnerRef;
  const parentItemContext = useContext(FilterDropdownItemContext);
  const [renderedListId, setRenderedListId] = createSignal<string | undefined>(undefined, {
    ownedWrite: true,
  });
  const [inputFocusVisible, setInputFocusVisible] = createSignal(untrack(openedByKeyboard), {
    ownedWrite: true,
  });
  const [keyboardModality, setKeyboardModality] = createSignal(untrack(openedByKeyboard), {
    ownedWrite: true,
  });
  const [previousOpenedByKeyboard, setPreviousOpenedByKeyboard] = createSignal(
    untrack(openedByKeyboard),
    { ownedWrite: true },
  );
  // Port note: a writable memo mirrors upstream's render-phase modality reset.
  const modality = createMemo(() => {
    const next = openedByKeyboard();
    if (next !== previousOpenedByKeyboard()) {
      setPreviousOpenedByKeyboard(next);
      setInputFocusVisible(next);
      setKeyboardModality(next);
    }
    return next;
  });
  const {
    items: registeredItems,
    registerItem: registerInRegistry,
    liveItems,
  } = useItemRegistry<symbol, FilterDropdownItemRegistration>();
  const defaultId = useBaseUiId();
  const store = new FilterDropdownStore();
  // The count is published as items register, not with the next registry snapshot, so a
  // `Menu.Empty` mounting alongside the items never reads a stale zero.
  const registerItem = (id: symbol, item: FilterDropdownItemRegistration) => {
    const unregister = registerInRegistry(id, item);
    store.set('registeredItemCount', liveItems.size);
    return () => {
      unregister();
      store.set('registeredItemCount', liveItems.size);
    };
  };
  const fallbackFocusOwnerRef = { current: null } as RefObject<HTMLElement | null>;
  const lastFilterQueryRef = { current: null } as RefObject<string | null>;
  const defaultMatchItem = createMemo(() => getFilter({ locale: locale() }).contains);
  const focusOwnerRef = () => focusOwnerRefProp() ?? fallbackFocusOwnerRef;
  const filterQuery = () => (query() ?? value()).trim();
  // An unused inline filter must not re-run auto-highlighting when the consumer re-renders.
  const matchItem = () =>
    filterQuery() === '' || filter() === null ? null : (filter() ?? defaultMatchItem());
  const autoHighlightEnabled = () =>
    open() && (autoHighlight() === 'always' || (autoHighlight() && filterQuery() !== ''));
  // React 17 resolves generated ids in an effect, so they must be read live rather than captured
  // in a state initializer.
  const defaultListId = () => (defaultId ? `${defaultId}-list` : undefined);
  const listId = () => (renderedListId() ?? defaultListId()) || undefined;
  // The host owns the trigger. `null` and `''` both mean no element carries an id to point at.
  const triggerId = () => triggerIdProp() || undefined;
  const handleValueChange = (
    nextValue: string,
    eventDetails: FilterDropdownRoot.ChangeEventDetails,
  ) => {
    props.onValueChange?.(nextValue, eventDetails);
    // Indexes are positional, so a kept highlight would land on whatever fills its slot.
    // With `autoHighlight`, the filtering effect below places the highlight instead.
    if (!eventDetails.isCanceled && !autoHighlight()) {
      props.setActiveIndex(null);
    }
  };
  const handleItemsChange = (previousItems: readonly (HTMLElement | null)[]) => {
    const items = props.listRef.current;
    const activeIndex = props.getActiveIndex();
    // A positional highlight must not silently move to another item. A change that leaves the
    // highlighted item in place keeps it, such as an item appended after it or one that renders
    // once before the query filters it out. A query change already reset the highlight.
    if (
      activeIndex != null &&
      items[activeIndex] != null &&
      items[activeIndex] === previousItems[activeIndex]
    ) {
      return;
    }
    props.setActiveIndex(autoHighlightEnabled() && items.length > 0 ? 0 : null);
  };
  // Re-runs on the registry snapshot published once every item in the commit has registered,
  // and on the committed query, because a controlled consumer can reject a proposed change. It
  // reads the live registry so items registered in this commit count before their snapshot.
  useIsoLayoutEffect(
    () =>
      untrack(() => {
        if (!open() && query() === undefined) {
          return;
        }

        const queryChanged =
          lastFilterQueryRef.current !== null && lastFilterQueryRef.current !== filterQuery();
        lastFilterQueryRef.current = filterQuery();
        // With no query or external filtering, every registered item is visible. External filtering
        // still follows `autoHighlight`; otherwise the item set invalidates the highlight.
        if (matchItem() === null) {
          store.set('visibleItemIds', null);
          // Registry updates, such as an item's text changing, keep the current highlight.
          if (autoHighlightEnabled() && liveItems.size > 0) {
            if (queryChanged || props.getActiveIndex() == null) {
              props.setActiveIndex(0);
            }
          } else if (filterQuery() === '' && queryChanged) {
            props.setActiveIndex(null);
          }
          return;
        }
        const currentIds = store.state.visibleItemIds;
        // The popup's content mounts a commit after the root opens. Publishing an empty result before
        // anything registered would hide every item as it arrives and remount the matches.
        if (currentIds === null && liveItems.size === 0) {
          return;
        }
        const nextIds = new Set<symbol>();
        let hasNewMatch = currentIds === null;
        liveItems.forEach(({ getText }, id) => {
          const text = getText();
          if (text != null && matchItem()!(text, filterQuery())) {
            nextIds.add(id);
            hasNewMatch ||= !currentIds?.has(id);
          }
        });
        // New matches or a smaller result set invalidate the previous item identities.
        if (hasNewMatch || currentIds?.size !== nextIds.size) {
          // The first filtered snapshot can land after initial keyboard navigation in React 18. It
          // has no prior result identity to invalidate, unless the controlled query itself changed.
          if (autoHighlightEnabled() && nextIds.size > 0) {
            props.setActiveIndex(0);
          } else if (currentIds !== null || queryChanged) {
            props.setActiveIndex(null);
          }
          store.set('visibleItemIds', nextIds);
        } else if (autoHighlightEnabled() && queryChanged && nextIds.size > 0) {
          props.setActiveIndex(0);
        }
      }),
    () => [
      open(),
      query(),
      filterQuery(),
      registeredItems(),
      liveItems,
      matchItem(),
      autoHighlightEnabled(),
      store,
      props.setActiveIndex,
      props.getActiveIndex,
    ],
  );
  const contextValue: FilterDropdownRootContext = {
    get open() {
      return open();
    },
    get disabled() {
      return disabled();
    },
    get inputFocusVisible() {
      modality();
      return inputFocusVisible();
    },
    setInputFocusVisible,
    get keyboardModality() {
      modality();
      return keyboardModality();
    },
    setKeyboardModality,
    get autoHighlight() {
      return autoHighlight();
    },
    get triggerId() {
      return triggerId();
    },
    get defaultListId() {
      return defaultListId();
    },
    get listId() {
      return listId();
    },
    setRenderedListId,
    get focusOwnerRef() {
      return focusOwnerRef();
    },
    setActiveIndex: props.setActiveIndex,
    onItemsChange: handleItemsChange,
    onValueChange: handleValueChange,
  };
  const itemContextValue: FilterDropdownItemContext = {
    parent: parentItemContext,
    store,
    registerItem,
    listRef: props.listRef,
  };
  return (
    <FilterDropdownItemContext value={itemContextValue}>
      <FilterDropdownRootContext value={contextValue}>
        <FilterDropdownValueContext value={() => query() ?? value()}>
          {props.children}
        </FilterDropdownValueContext>
      </FilterDropdownRootContext>
    </FilterDropdownItemContext>
  );
}
export interface FilterDropdownRootProps {
  children?: JSX.Element | undefined;
  /**
   * Whether the popup is currently open.
   */
  open: boolean;
  /** Whether the filter controls should be disabled. */
  disabled?: boolean | undefined;
  /** Whether the popup opened from the keyboard, so the input starts with its focus ring. */
  openedByKeyboard?: boolean | undefined;
  /**
   * Locale used for filtering comparisons.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The filter input value.
   */
  value: string;
  /**
   * Query used for filtering when it differs from the input value, such as while closing.
   */
  query?: string | undefined;
  /**
   * Event handler called when the filter input value changes.
   */
  onValueChange?:
    | ((value: string, eventDetails: FilterDropdownRootNamespace.ChangeEventDetails) => void)
    | undefined;
  /**
   * Custom filter logic used when filtering items. Pass `null` to turn filtering off.
   */
  filter?: FilterDropdownFilter | null | undefined;
  /** Whether the first matching item should be highlighted automatically. */
  autoHighlight?: boolean | 'always' | undefined;
  /**
   * ID of a trigger rendered outside this root, which cannot register itself through the context.
   */
  triggerId?: string | null | undefined;
  /**
   * The host's DOM-ordered list of item elements.
   */
  listRef: RefObject<Array<HTMLElement | null>>;
  /**
   * Reads the host's highlighted index.
   */
  getActiveIndex: () => number | null;
  /**
   * Moves the host's highlight.
   */
  setActiveIndex: (index: number | null) => void;
  /**
   * The host's ref for the input, which holds real focus while the list is navigated virtually.
   */
  focusOwnerRef?: RefObject<HTMLElement | null> | undefined;
}
export namespace FilterDropdownRoot {
  export type Props = FilterDropdownRootProps;
  export type ChangeEventReason = FilterDropdownRootNamespace.ChangeEventReason;
  export type ChangeEventDetails = FilterDropdownRootNamespace.ChangeEventDetails;
}
