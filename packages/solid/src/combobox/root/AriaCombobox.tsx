import { createMemo, createSignal, flush, For, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useOnFirstRender } from '@base-ui-solid/utils/useOnFirstRender';
import { useMergedRefs } from '@base-ui-solid/utils/useMergedRefs';
import { useValueAsRef } from '@base-ui-solid/utils/useValueAsRef';
import { visuallyHidden, visuallyHiddenInput } from '@base-ui-solid/utils/visuallyHidden';
import { ReactStore } from '@base-ui-solid/utils/store';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { isHTMLElement } from '@floating-ui/utils/dom';
import type { ElementProps } from '../../floating-ui-react';
import {
  getOverflowAncestors,
  useDismiss,
  useFloatingRootContext,
  useListNavigation,
  useClick,
} from '../../floating-ui-react';
import { gridNavigation } from '../../floating-ui-react/hooks/gridNavigation';
import type { HighlightItemTarget } from '../../floating-ui-react/hooks/useListNavigation';
import { activeElement, closest, contains, getTarget } from '../../floating-ui-react/utils';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '../../internals/createBaseUIEventDetails';
import type {
  BaseUIChangeEventDetails,
  BaseUIHighlightEventDetails,
} from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { getHighlightReason } from '../../utils/getHighlightReason';
import {
  ComboboxFloatingContext,
  ComboboxDerivedItemsContext,
  ComboboxHasItemsContext,
  ComboboxRootContext,
  ComboboxInputValueContext,
} from './ComboboxRootContext';
import { selectors } from '../store';
import type { ComboboxStoreContext, State as StoreState } from '../store';
import { attachPreventUnmountOnClose } from '../../utils/popups/popupStoreUtils';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '../../internals/field-register-control/useRegisterFieldControl';
import { useFormContext } from '../../internals/form-context/FormContext';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { createCollatorItemFilter } from './utils';
import type { FilterItemToString } from './utils';
import { useCoreFilter } from './utils/useFilter';
import { useUnmountAfterClose } from '../../internals/useUnmountAfterClose';
import { useOpenInteractionType } from '../../utils/useOpenInteractionType';
import { isScrollableY } from '../../utils/scrollable';
import type { BaseUIEvent, HTMLProps } from '../../internals/types';
import { useValueChanged } from '../../internals/useValueChanged';
import { NOOP } from '../../internals/noop';
import { FOCUSABLE_POPUP_PROPS } from '../../utils/popups';
import { mergeProps } from '../../merge-props';
import type { Group } from '../../internals/resolveValueLabel';
import {
  stringifyAsLabel,
  stringifyAsValue,
  flattenLeafItems,
  isGroupedItems,
} from '../../internals/resolveValueLabel';
import {
  compareItemEquality,
  defaultItemEquality,
  findItemIndex,
  findSelectionIndex,
  isSelectedValueDirty,
  removeItem,
  selectedValueIncludes,
} from '../../internals/itemEquality';
import { INITIAL_LAST_HIGHLIGHT, NO_ACTIVE_VALUE } from './utils/constants';
import { useDirection } from '../../internals/direction-context/DirectionContext';
import { findCollectionItem } from '../items/itemCollection';
import type { ComboboxItemCollection, ItemCollection } from '../items/itemCollection';

type InternalAriaComboboxProps<Value, Mode extends SelectionMode, Item = Value> = AriaComboboxProps<
  Value,
  Mode,
  Item
> & {
  filterQuery?: string | undefined;
};

/**
 * @internal
 *
 * Port note: the props are read lazily like any Solid props; the callbacks below read the
 * current values through the accessors, like upstream's render closures.
 */
export function AriaCombobox<Value, Mode extends SelectionMode = 'none', Item = Value>(
  props: Omit<InternalAriaComboboxProps<Value, Mode, Item>, 'items'> & {
    items: readonly Group<any>[];
  },
): JSX.Element;
export function AriaCombobox<Value, Mode extends SelectionMode = 'none', Item = Value>(
  props: Omit<InternalAriaComboboxProps<Value, Mode, Item>, 'items'> & {
    items?: readonly any[] | ComboboxItemCollection<Item, any> | undefined;
  },
): JSX.Element;
export function AriaCombobox<Value = any, Mode extends SelectionMode = 'none', Item = Value>(
  props: InternalAriaComboboxProps<Value, Mode, Item>,
): JSX.Element {
  const defaultSelectedValue = untrack(() => props.defaultSelectedValue ?? null);
  const defaultOpen = untrack(() => props.defaultOpen ?? false);
  const selectionMode = () => props.selectionMode;
  const disabledProp = () => props.disabled ?? false;
  const readOnly = () => props.readOnly ?? false;
  const required = () => props.required ?? false;
  const grid = () => props.grid ?? false;
  const itemsProp = () => props.items;
  const filteredItemsProp = () => props.filteredItems;
  const openOnInputClick = () => props.openOnInputClick ?? true;
  const autoHighlight = () => props.autoHighlight ?? false;
  const keepHighlight = () => props.keepHighlight ?? false;
  const highlightItemOnHover = () => props.highlightItemOnHover ?? true;
  const loopFocus = () => props.loopFocus ?? true;
  const itemToStringLabelProp = () => props.itemToStringLabel;
  const itemToStringValue = () => props.itemToStringValue;
  const isItemEqualToValue = () => props.isItemEqualToValue ?? defaultItemEquality;
  const virtualized = () => props.virtualized ?? false;
  const inlineProp = () => props.inline ?? false;
  const fillInputOnItemPress = () => props.fillInputOnItemPress ?? true;
  const modal = () => props.modal ?? false;
  const limit = () => props.limit ?? -1;
  const autoComplete = () => props.autoComplete ?? 'list';
  const submitOnItemClick = () => props.submitOnItemClick ?? false;

  const { clearErrors } = useFormContext();
  const {
    setDirty,
    validityData,
    setFilled,
    name: fieldName,
    disabled: fieldDisabled,
    setTouched,
    setFocused,
    validationMode,
    validation,
  } = useFieldRootContext();

  const direction = useDirection();
  const id = useLabelableId({ id: () => props.id });
  const collatorFilter = createMemo(() => useCoreFilter({ locale: props.locale }));

  // Plain items are arrays; normalized `createItems()` collections are objects.
  const collection = createMemo(() => {
    const currentItems = itemsProp();
    const currentCollection = Array.isArray(currentItems)
      ? null
      : (currentItems as unknown as ItemCollection<Item, Value> | undefined);

    if (currentCollection && typeof currentCollection.label !== 'function') {
      throw new Error(
        'Base UI: the `items` prop received an object that is not a collection, ' +
          'so its items cannot be read. Pass an array of items, an array of groups with items, ' +
          'or the result of `createItems()`. ' +
          'See https://base-ui.com/react/components/combobox#createitems',
      );
    }

    return currentCollection;
  });

  const items = createMemo(
    () =>
      (collection() ? collection()!.data : itemsProp()) as
        readonly Item[] | readonly Group<Item>[] | undefined,
  );
  const itemToValue = createMemo(() => collection()?.value);

  // A projected collection's items live in the source domain, not the selection-value domain the
  // store matches against, so they are withheld from the store.
  const storeItems = createMemo(() => (itemToValue() ? undefined : items()));

  // The externally filtered items projected to their selection values, with a lookup back to the
  // source items. Declared before `itemToStringLabel`, which resolves labels from it on the
  // first render (initial input value).
  const externalWindow = createMemo(() => {
    const currentFilteredItems = filteredItemsProp();
    const currentItemToValue = itemToValue();
    if (!currentFilteredItems || !currentItemToValue) {
      return undefined;
    }
    const flat = flattenLeafItems(currentFilteredItems);
    const values = flat.map(currentItemToValue);
    let valueToItem: Map<any, any> | undefined;

    return {
      values,
      findItem(itemValue: any, isEqual: (item: any, value: any) => boolean) {
        if (!valueToItem) {
          valueToItem = new Map();
          for (let i = 0; i < values.length; i += 1) {
            if (!valueToItem.has(values[i])) {
              valueToItem.set(values[i], flat[i]);
            }
          }
        }

        return findCollectionItem(valueToItem, itemValue, isEqual);
      },
    };
  });

  // Labels selection values from current props only: collection data first, then the current
  // external window, then the prop. Nothing from a past window is remembered — keeping a value
  // resolvable over time means keeping its item in the collection's data.
  const itemToStringLabel = createMemo<((itemValue: Value) => string) | undefined>(() => {
    const currentCollection = collection();
    const labelProp = itemToStringLabelProp();
    if (!currentCollection) {
      return labelProp;
    }
    const currentExternalWindow = externalWindow();
    const isEqual = isItemEqualToValue();
    return (itemValue: Value) => {
      return currentCollection.label(itemValue, isEqual, (unresolvedValue: any) => {
        const externalItem = currentExternalWindow?.findItem(unresolvedValue, isEqual);
        if (externalItem != null) {
          return currentCollection.itemLabel(externalItem);
        }
        return stringifyAsLabel(unresolvedValue, labelProp);
      });
    };
  });

  const filterItemToString = createMemo<FilterItemToString | undefined>(() => {
    const currentCollection = collection();
    if (!currentCollection) {
      return itemToStringLabelProp();
    }

    const labelFn = itemToStringLabel();
    return Object.assign((item: any) => currentCollection.itemLabel(item), {
      selected: (value: any) => stringifyAsLabel(value, labelFn),
    });
  });

  function stringifyValueLabel(item: any) {
    return stringifyAsLabel(item, itemToStringLabel());
  }

  const [queryChangedAfterOpen, setQueryChangedAfterOpen] = createSignal(false, {
    ownedWrite: true,
  });
  const [closeQuery, setCloseQuery] = createSignal<string | null>(null, { ownedWrite: true });
  let previousCloseQueryRef = untrack(closeQuery);

  const listRef: RefObject<Array<HTMLElement | null>> = { current: [] };
  const labelsRef: RefObject<Array<string | null>> = { current: [] };
  const popupRef: RefObject<HTMLDivElement | null> = { current: null };
  const inputRef: RefObject<HTMLInputElement | null> = { current: null };
  const startDismissRef: RefObject<HTMLSpanElement | null> = { current: null };
  const endDismissRef: RefObject<HTMLSpanElement | null> = { current: null };
  const emptyRef: RefObject<HTMLDivElement | null> = { current: null };
  let hadInputClearRef = false;
  const chipsContainerRef: RefObject<HTMLDivElement | null> = { current: null };
  const clearRef: RefObject<HTMLButtonElement | null> = { current: null };
  const selectionEventRef: RefObject<MouseEvent | PointerEvent | KeyboardEvent | null> = {
    current: null,
  };
  let lastHighlightRef = INITIAL_LAST_HIGHLIGHT;
  let pendingQueryHighlightRef: null | {
    hasQuery: boolean;
    selection?: boolean | undefined;
    // The value a selection-driven clear just added, so the restore can keep it
    // highlighted instead of returning to the open anchor.
    toggledValue?: any;
  } = null;

  /**
   * Contains the currently visible list of item values post-filtering.
   */
  const valuesRef: RefObject<any[]> = { current: [] };
  /**
   * The item element that received the last `pointerdown`, used to detect whether a
   * `mouseup` on an item belongs to a drag-select gesture that started elsewhere.
   */
  const pointerDownItemRef: RefObject<Element | null> = { current: null };

  const disabled = createMemo(() => (fieldDisabled() ?? false) || disabledProp());
  const name = createMemo(() => fieldName() ?? props.name);
  const multiple = createMemo(() => selectionMode() === 'multiple');
  const single = createMemo(() => selectionMode() === 'single');
  const hasInputValue = createMemo(
    () => props.inputValue !== undefined || props.defaultInputValue !== undefined,
  );
  const hasItems = createMemo(() => items() !== undefined);
  const hasFilteredItemsProp = createMemo(() => filteredItemsProp() !== undefined);

  const autoHighlightMode = createMemo<false | 'input-change' | 'always'>(() => {
    const value = autoHighlight();
    if (value === 'always') {
      return 'always';
    }
    return value ? 'input-change' : false;
  });

  const [selectedValue, setSelectedValueUnwrapped] = useControlled<any>({
    controlled: () => props.selectedValue,
    default: untrack(multiple) ? (defaultSelectedValue ?? EMPTY_ARRAY) : defaultSelectedValue,
    name: 'Combobox',
    state: 'selectedValue',
  });

  const filter = createMemo(() => {
    const filterProp = props.filter;
    if (filterProp === null) {
      return () => true;
    }
    if (filterProp !== undefined) {
      return filterProp;
    }
    // `shouldBypassFiltering` already empties the query whenever a single selection's label
    // matches it exactly, so the filter never needs a selection-aware variant here.
    return createCollatorItemFilter(collatorFilter(), filterItemToString());
  });

  // If neither inputValue nor defaultInputValue are provided, derive it from the
  // selected value for single mode so the input reflects the selection on mount.
  const initialDefaultInputValue = untrack(() => {
    if (hasInputValue()) {
      return props.defaultInputValue ?? '';
    }
    if (single()) {
      return stringifyValueLabel(selectedValue());
    }
    return '';
  });

  const [inputValue, setInputValueUnwrapped] = useControlled<
    string | number | readonly string[] | undefined
  >({
    controlled: () => props.inputValue,
    default: initialDefaultInputValue,
    name: 'Combobox',
    state: 'inputValue',
  });

  const [open, setOpenUnwrapped] = useControlled({
    controlled: () => props.open,
    default: defaultOpen,
    name: 'Combobox',
    state: 'open',
  });

  const isGrouped = createMemo(() => isGroupedItems(items()));
  const query = createMemo(() =>
    !open() && closeQuery() !== null ? closeQuery()! : String(inputValue()).trim(),
  );

  const selectedLabelString = createMemo(() =>
    single() ? stringifyValueLabel(selectedValue()) : '',
  );

  const shouldBypassFiltering = createMemo(() => {
    const currentQuery = query();
    const label = selectedLabelString();
    return (
      single() &&
      !queryChangedAfterOpen() &&
      currentQuery !== '' &&
      label.length === currentQuery.length &&
      collatorFilter().contains(label, currentQuery)
    );
  });

  const filterQuery = createMemo(() =>
    shouldBypassFiltering() ? '' : (props.filterQuery ?? query()),
  );
  const shouldIgnoreExternalFiltering = createMemo(() => {
    const currentCollection = collection();
    return (
      hasItems() &&
      hasFilteredItemsProp() &&
      shouldBypassFiltering() &&
      (!currentCollection ||
        currentCollection.hasValue(selectedValue(), isItemEqualToValue() as any))
    );
  });

  const flatItems = createMemo<readonly Item[]>(() => {
    const currentItems = items();
    return currentItems ? flattenLeafItems<Item>(currentItems) : EMPTY_ARRAY;
  });

  const filteredItems = createMemo<Item[] | Group<Item>[]>(() => {
    const currentFilteredItemsProp = filteredItemsProp();
    if (currentFilteredItemsProp && !shouldIgnoreExternalFiltering()) {
      return currentFilteredItemsProp as Item[] | Group<Item>[];
    }

    const currentItems = items();
    if (!currentItems) {
      return EMPTY_ARRAY as Item[];
    }

    const currentLimit = limit();
    const currentFilterQuery = filterQuery();
    const currentFilter = filter();
    const currentFilterItemToString = filterItemToString();

    if (isGrouped()) {
      const groupedItems = currentItems as readonly Group<Item>[];
      const resultingGroups: Group<Item>[] = [];
      let currentCount = 0;

      for (const group of groupedItems) {
        if (currentLimit > -1 && currentCount >= currentLimit) {
          break;
        }

        const remainingLimit = currentLimit > -1 ? currentLimit - currentCount : Infinity;
        const itemsToTake = currentFilterQuery === '' ? group.items.slice(0, remainingLimit) : [];

        if (currentFilterQuery !== '') {
          for (const item of group.items) {
            if (itemsToTake.length >= remainingLimit) {
              break;
            }
            if (currentFilter(item, currentFilterQuery, currentFilterItemToString)) {
              itemsToTake.push(item);
            }
          }
        }

        if (itemsToTake.length > 0) {
          const newGroup = { ...group, items: itemsToTake };
          resultingGroups.push(newGroup);
          currentCount += itemsToTake.length;
        }
      }

      return resultingGroups;
    }

    const currentFlatItems = flatItems();

    if (currentFilterQuery === '') {
      return currentLimit > -1
        ? currentFlatItems.slice(0, currentLimit)
        : // The cast here is done as `flatItems` is readonly.
          // valuesRef.current, a mutable ref, can be set to `flatFilteredValues`, which may
          // reference this exact readonly value, creating a mutation risk.
          // However, <Combobox.Item> can never mutate this value as the mutating effect
          // bails early when `items` is provided, and this is only ever returned
          // when `items` is provided due to the early return at the top of this hook.
          (currentFlatItems as Item[]);
    }

    const limitedItems: Item[] = [];
    for (const item of currentFlatItems) {
      if (currentLimit > -1 && limitedItems.length >= currentLimit) {
        break;
      }
      if (currentFilter(item, currentFilterQuery, currentFilterItemToString)) {
        limitedItems.push(item);
      }
    }

    return limitedItems;
  });

  /**
   * The filtered items flattened across groups and projected to their selection values.
   */
  const flatFilteredValues = createMemo<any[]>(() => {
    const currentFilteredItems = filteredItems();
    const currentExternalWindow = externalWindow();
    if (currentExternalWindow && currentFilteredItems === filteredItemsProp()) {
      return currentExternalWindow.values;
    }
    // Explicit type argument: inferring it from a union of both shapes resolves `Item` to
    // `Group<Item>`, which tsc rejects and tsgo does not.
    const flat = flattenLeafItems<Item>(currentFilteredItems);
    const currentItemToValue = itemToValue();
    return currentItemToValue ? flat.map((item) => currentItemToValue(item)) : (flat as any[]);
  });

  const store = untrack(() => {
    // An inline list open on the first render never gets a closed pass of the closed-state
    // sync effect below, and `items`-prop lists don't self-register their index the way
    // individually rendered `<Combobox.Item>`s do, so the selected item was never highlighted.
    // Seeding the index here lets list navigation highlight and scroll to the selection on
    // mount. Computed once by construction, so a selection or list that resolves after mount
    // doesn't move an existing highlight or scroll the list away.
    let initialSelectedIndex: number | null = null;
    if (inlineProp() && open() && hasItems() && selectionMode() !== 'none') {
      initialSelectedIndex = findSelectionIndex(
        flatFilteredValues(),
        selectedValue(),
        isItemEqualToValue(),
        multiple(),
      );
    }

    return new ReactStore<StoreState, ComboboxStoreContext, typeof selectors>(
      {
        id: id(),
        labelId: undefined,
        selectedValue: selectedValue(),
        open: open(),
        items: storeItems(),
        selectionMode: selectionMode(),
        name: name(),
        form: props.form,
        disabled: disabled(),
        readOnly: readOnly(),
        required: required(),
        grid: grid(),
        virtualized: virtualized(),
        openOnInputClick: openOnInputClick(),
        itemToStringLabel: itemToStringLabel(),
        isItemEqualToValue: isItemEqualToValue(),
        modal: modal(),
        autoHighlight: autoHighlightMode(),
        submitOnItemClick: submitOnItemClick(),
        hasInputValue: hasInputValue(),
        mounted: false,
        forceMounted: false,
        transitionStatus: 'idle',
        inline: inlineProp(),
        activeIndex: null,
        selectedIndex: initialSelectedIndex,
        popupProps: {},
        listProps: {},
        inputProps: {},
        triggerProps: {},
        itemProps: EMPTY_OBJECT,
        positionerElement: null,
        listElement: null,
        popupId: undefined,
        triggerElement: null,
        inputElement: null,
        inputGroupElement: null,
        popupSide: null,
        openMethod: null,
        inputInsidePopup: true,
        // Avoid duplicate names in the server HTML. Popup inputs aren't rendered
        // until after hydration, so the hidden input takes over then if needed.
        inputOwnsFormValue: selectionMode() === 'none',
      },
      {
        // Placeholder callbacks replaced on first render
        onOpenChangeComplete: NOOP,
        setOpen: NOOP,
        setInputValue: NOOP,
        setSelectedValue: NOOP,
        setIndices: NOOP,
        handleSelection: NOOP,
        forceMount: NOOP,
        requestSubmit: NOOP,
        listRef,
        labelsRef,
        popupRef,
        emptyRef,
        inputRef,
        startDismissRef,
        endDismissRef,
        chipsContainerRef,
        clearRef,
        valuesRef,
        pointerDownItemRef,
        selectionEventRef,
      },
      selectors,
    );
  });

  const fieldRawValue = createMemo(() =>
    selectionMode() === 'none' ? inputValue() : selectedValue(),
  );
  const fieldStringValue = createMemo(() => {
    const currentSelectedValue = selectedValue();
    if (selectionMode() === 'none') {
      return fieldRawValue();
    }
    if (Array.isArray(currentSelectedValue)) {
      return currentSelectedValue.map((value) => stringifyAsValue(value, itemToStringValue()));
    }
    return stringifyAsValue(currentSelectedValue, itemToStringValue());
  });

  const onItemHighlighted = (itemValue: any, eventDetails: AriaCombobox.HighlightEventDetails) =>
    props.onItemHighlighted?.(itemValue, eventDetails);
  const onOpenChangeComplete = (nextOpen: boolean) => props.onOpenChangeComplete?.(nextOpen);

  const activeIndex = store.useState('activeIndex');
  const selectedIndex = store.useState('selectedIndex');
  const positionerElement = store.useState('positionerElement');
  const listElement = store.useState('listElement');
  const triggerElement = store.useState('triggerElement');
  const inputElement = store.useState('inputElement');
  const inputGroupElement = store.useState('inputGroupElement');
  const inline = store.useState('inline');
  const inputInsidePopup = store.useState('inputInsidePopup');
  const inputOwnsFormValue = store.useState('inputOwnsFormValue');
  const inputMatchesSelectedValue = createMemo(
    () => single() && !inputInsidePopup() && inputValue() === selectedLabelString(),
  );

  const triggerRef = useValueAsRef(triggerElement);

  const { openMethod, triggerProps } = useOpenInteractionType(open);

  const getStringifiedValueForForm = () => untrack(fieldStringValue);

  // Port note: upstream picks the ref object on each render. The hook reads it once, so this
  // object resolves the current control when it's read.
  const fieldControlRef: RefObject<HTMLElement | null> = {
    get current() {
      return untrack(inputInsidePopup) ? triggerRef.current : inputRef.current;
    },
    set current(_value) {
      // Read-only view.
    },
  };

  useRegisterFieldControl(
    fieldControlRef,
    id,
    fieldRawValue,
    getStringifiedValueForForm,
    () => !disabled(),
    () => props.name,
  );

  const forceMount = () => {
    if (untrack(items)) {
      // Ensure typeahead works on a closed list.
      labelsRef.current = untrack(flatFilteredValues).map(stringifyValueLabel);
    } else {
      store.set('forceMounted', true);
    }
  };

  /**
   * Emits `onItemHighlighted` for the item at `index`, or clears the highlight when `index` is `-1`
   * (a no-op if nothing was highlighted). Keeps `lastHighlightRef` in sync with what was emitted.
   */
  const emitHighlight = (
    value: any,
    index: number,
    type: AriaCombobox.HighlightEventReason,
    event?: Event,
  ) => {
    if (index === -1) {
      if (lastHighlightRef === INITIAL_LAST_HIGHLIGHT) {
        return;
      }
      lastHighlightRef = INITIAL_LAST_HIGHLIGHT;
    } else {
      lastHighlightRef = { value, index };
    }

    onItemHighlighted(value, createGenericEventDetails(type, event, { index }));
  };

  const setIndices = (options: {
    activeIndex?: number | null | undefined;
    selectedIndex?: number | null | undefined;
    type?: AriaCombobox.HighlightEventReason | undefined;
    event?: Event | undefined;
  }) => {
    const update = {} as Pick<StoreState, 'activeIndex' | 'selectedIndex'>;

    if (options.activeIndex !== undefined) {
      update.activeIndex = options.activeIndex;
    }

    if (options.selectedIndex !== undefined) {
      update.selectedIndex = options.selectedIndex;
    }

    store.update(update);

    const activeIndexOption = options.activeIndex;
    if (activeIndexOption === undefined) {
      return;
    }

    const type: AriaCombobox.HighlightEventReason = options.type || REASONS.none;

    if (activeIndexOption === null) {
      emitHighlight(undefined, -1, type, options.event);
    } else {
      emitHighlight(valuesRef.current[activeIndexOption], activeIndexOption, type, options.event);
    }
  };

  const setInputValue = (next: string, eventDetails: AriaCombobox.ChangeEventDetails) => {
    props.onInputValueChange?.(next, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    // A canceled selection clear must not suppress close-completion cleanup.
    hadInputClearRef = eventDetails.reason === REASONS.inputClear;

    // If user is typing, ensure we don't auto-highlight on open due to a race
    // with the post-open effect that sets this flag.
    if (eventDetails.reason === REASONS.inputChange) {
      // A controlled popup may ignore a close request. Resuming input proves the popup
      // is remaining open, so release the query captured for an exit animation.
      if (untrack(open) && untrack(closeQuery) !== null) {
        setCloseQuery(null);
      }

      const event = eventDetails.event as Event;
      const inputType = (event as InputEvent).inputType;
      // Treat composition commits as typed input; autofill may omit `inputType` or
      // report `insertReplacementText`.
      const isTypedInput =
        event.type === 'compositionend' ||
        (inputType != null && inputType !== '' && inputType !== 'insertReplacementText');
      if (isTypedInput) {
        const hasQuery = next.trim() !== '';
        if (hasQuery) {
          setQueryChangedAfterOpen(true);
        }
        // Defer index updates until after the filtered items have been derived to ensure
        // `onItemHighlighted` receives the latest item.
        pendingQueryHighlightRef = { hasQuery };

        // Virtualized lists own their scroller. Reset regular lists directly so a stale
        // composite registry cannot select a reordered item and scrolling cannot escape
        // the popup.
        const list = store.state.listElement;
        if (!store.state.virtualized && list) {
          const popup = popupRef.current;
          for (const ancestor of getOverflowAncestors(list.firstElementChild ?? list)) {
            if (
              !isHTMLElement(ancestor) ||
              (popup ? !contains(popup, ancestor) : ancestor.getAttribute('role') === 'dialog')
            ) {
              break;
            }

            if (isScrollableY(ancestor)) {
              ancestor.scrollTop = 0;
              break;
            }
          }
        }

        if (
          hasQuery &&
          untrack(autoHighlightMode) &&
          store.state.activeIndex == null &&
          (untrack(open) || untrack(inline))
        ) {
          store.set('activeIndex', 0);
        }
      }
    } else if (
      eventDetails.reason === REASONS.inputClear &&
      next === '' &&
      store.state.inputInsidePopup
    ) {
      // A programmatic clear of an active query (e.g. after selecting an item with the
      // input inside the popup): restore the highlight to the selected item.
      pendingQueryHighlightRef = { hasQuery: false, selection: true };
    }

    setInputValueUnwrapped(next);
  };

  let releasedQuery: string | null = null;
  const handleInterruptedReopen = (isInputChange: boolean) => {
    const currentInputValue = untrack(inputValue);
    // Preserve values supplied with the reopen rather than owned by the interrupted close.
    const clearsPendingInput =
      !isInputChange &&
      untrack(inputInsidePopup) &&
      !untrack(inline) &&
      currentInputValue !== '' &&
      (String(currentInputValue).trim() === untrack(closeQuery) ||
        currentInputValue === untrack(selectedLabelString));

    // Keep the flag while a visible filter survives so the `items` sync cannot overwrite it.
    if (
      !isInputChange &&
      (clearsPendingInput || currentInputValue === '' || untrack(inputMatchesSelectedValue))
    ) {
      setQueryChangedAfterOpen(false);
    }

    // Port note: releasing the close query can notify Solid's query effect after this
    // open effect. React runs the query effect first; do not restore its stale typed flag.
    if (!isInputChange) {
      releasedQuery = String(currentInputValue).trim();
      queueMicrotask(() => {
        releasedQuery = null;
      });
    }
    setCloseQuery(null);

    if (clearsPendingInput) {
      // Cleanup clears omit the selection flag and reopening gesture.
      setInputValue('', createChangeEventDetails(REASONS.inputClear));
    }
  };

  const [preventUnmountOnClose, setPreventUnmountOnClose] = createSignal(false, {
    ownedWrite: true,
  });

  const setOpen = (nextOpen: boolean, eventDetails: AriaCombobox.ChangeEventDetails) => {
    if (untrack(open) === nextOpen) {
      return;
    }

    // If the `Empty` component is not used, the positioner or popup should be hidden
    // with CSS. In this case, allow the Escape key to bubble to close a parent popup
    // if there are no items to show.
    if (
      eventDetails.reason === REASONS.escapeKey &&
      untrack(hasItems) &&
      untrack(flatFilteredValues).length === 0 &&
      !emptyRef.current
    ) {
      eventDetails.allowPropagation();
    }

    const openEventDetails = eventDetails as AriaCombobox.OpenChangeEventDetails;
    const shouldPreventUnmountOnClose = attachPreventUnmountOnClose(openEventDetails);
    props.onOpenChange?.(nextOpen, openEventDetails);

    // A typed request must not highlight a later open: discard it when its own open is
    // rejected, or when any other open change goes through.
    if (
      pendingQueryHighlightRef?.hasQuery &&
      (eventDetails.reason === REASONS.inputChange) === eventDetails.isCanceled
    ) {
      pendingQueryHighlightRef = null;
    }

    if (eventDetails.isCanceled) {
      return;
    }

    if (nextOpen && untrack(closeQuery) !== null) {
      // `ComboboxInput` calls `setInputValue` before `setOpen`, so on an input-change reopen
      // `inputValue` is still the pre-keystroke value and the typed filter always survives.
      handleInterruptedReopen(eventDetails.reason === REASONS.inputChange);
    }

    if (!nextOpen && untrack(queryChangedAfterOpen)) {
      const currentQuery = untrack(query);
      if (untrack(single)) {
        if (!untrack(inline)) {
          setCloseQuery(currentQuery);
        }
        // Avoid a flicker when closing the popup with an empty query.
        if (currentQuery === '') {
          setQueryChangedAfterOpen(false);
        }
      } else if (untrack(multiple)) {
        if (!untrack(inline)) {
          // Freeze the current query so filtering remains stable while exiting.
          setCloseQuery(currentQuery);
        }

        if (untrack(inputInsidePopup)) {
          setIndices({ activeIndex: null });
        }

        // Clear the input immediately on close while retaining filtering via closeQuery for exit animations
        // if the input is outside the popup. When the input is inside the popup, defer the clear until
        // unmount so the filtered list doesn't flash to unfiltered during the exit animation.
        if (!untrack(inputInsidePopup) || untrack(inline)) {
          setInputValue(
            '',
            createChangeEventDetails(REASONS.inputClear, eventDetails.event, undefined, {
              isItemPress: eventDetails.reason === REASONS.itemPress,
            }),
          );
        }
      }
    }

    if (!nextOpen) {
      setPreventUnmountOnClose(shouldPreventUnmountOnClose());
    }
    setOpenUnwrapped(nextOpen);

    if (
      !nextOpen &&
      untrack(inputInsidePopup) &&
      (eventDetails.reason === REASONS.focusOut || eventDetails.reason === REASONS.outsidePress)
    ) {
      setTouched(true);
      setFocused(false);

      if (untrack(validationMode) === 'onBlur') {
        const valueToValidate =
          untrack(selectionMode) === 'none' ? untrack(inputValue) : untrack(selectedValue);
        validation.commit(valueToValidate);
      }
    }
  };

  const setSelectedValue = (
    nextValue: Value | Value[] | null,
    eventDetails: AriaCombobox.ChangeEventDetails,
  ) => {
    // Cast to `any` due to conditional value type (single vs. multiple).
    // The runtime implementation already ensures the correct value shape.
    props.onSelectedValueChange?.(nextValue as any, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    // Port note: wrapped so that a function value isn't read as an updater.
    setSelectedValueUnwrapped(() => nextValue);

    const shouldFillInput =
      (untrack(selectionMode) === 'none' && popupRef.current && untrack(fillInputOnItemPress)) ||
      (untrack(single) && !store.state.inputInsidePopup);

    if (shouldFillInput) {
      setInputValue(
        stringifyValueLabel(nextValue),
        createChangeEventDetails(eventDetails.reason, eventDetails.event),
      );
    }
  };

  const handleSelection = (event: MouseEvent | PointerEvent | KeyboardEvent, itemValue: any) => {
    const targetEl = getTarget(event) as HTMLElement | null;
    const overrideEvent = selectionEventRef.current ?? event;
    selectionEventRef.current = null;
    const eventDetails = createChangeEventDetails(REASONS.itemPress, overrideEvent);

    // Let the link handle the click.
    const href = closest(targetEl, 'a')?.getAttribute('href');
    if (href) {
      if (href.startsWith('#')) {
        setOpen(false, eventDetails);
      }
      return;
    }

    if (untrack(multiple)) {
      const currentValue = untrack(selectedValue);
      const currentSelectedValue = Array.isArray(currentValue) ? currentValue : [];
      const isCurrentlySelected = selectedValueIncludes(
        currentSelectedValue,
        itemValue,
        untrack(isItemEqualToValue),
      );
      const nextValue = isCurrentlySelected
        ? removeItem(currentSelectedValue, itemValue, untrack(isItemEqualToValue))
        : [...currentSelectedValue, itemValue];

      setSelectedValue(nextValue, eventDetails);

      if (eventDetails.isCanceled) {
        return;
      }

      const wasFiltering = inputRef.current ? inputRef.current.value.trim() !== '' : false;
      if (!wasFiltering) {
        return;
      }

      if (store.state.inputInsidePopup) {
        setInputValue(
          '',
          createChangeEventDetails(REASONS.inputClear, eventDetails.event, undefined, {
            isItemPress: true,
          }),
        );
        // A newly selected item stays highlighted through the clear; a deselection
        // falls back to the standard selection anchor.
        const pendingHighlight = pendingQueryHighlightRef;
        if (pendingHighlight && !isCurrentlySelected) {
          pendingHighlight.toggledValue = itemValue;
        }
      } else {
        setOpen(false, eventDetails);
      }
    } else {
      setSelectedValue(itemValue, eventDetails);

      if (eventDetails.isCanceled) {
        return;
      }

      setOpen(false, eventDetails);
    }
  };

  const requestSubmit = () => {
    const formElement = validation.inputRef.current?.form ?? store.state.inputElement?.form;
    if (formElement && typeof formElement.requestSubmit === 'function') {
      formElement.requestSubmit();
    }
  };

  const handleUnmountCleanup = () => {
    onOpenChangeComplete?.(false);
    setQueryChangedAfterOpen(false);
    setCloseQuery(null);

    if (untrack(selectionMode) === 'none') {
      setIndices({ activeIndex: null, selectedIndex: null });
    } else {
      setIndices({ activeIndex: null });
    }

    // Multiple selection mode:
    // If the user typed a filter and didn't select in multiple mode, clear the input
    // after close completes to avoid mid-exit flicker and start fresh on next open.
    if (
      untrack(multiple) &&
      inputRef.current &&
      inputRef.current.value !== '' &&
      !hadInputClearRef
    ) {
      setInputValue('', createChangeEventDetails(REASONS.inputClear));
    }

    // Single selection mode:
    // - If input is rendered inside the popup, clear it so the next open is blank
    // - If input is outside the popup, sync it to the selected value
    if (untrack(single)) {
      if (store.state.inputInsidePopup) {
        if (inputRef.current && inputRef.current.value !== '') {
          setInputValue('', createChangeEventDetails(REASONS.inputClear));
        }
      } else {
        const stringVal = stringifyValueLabel(untrack(selectedValue));
        if (inputRef.current && inputRef.current.value !== stringVal) {
          // If no selection was made, treat this as clearing the typed filter.
          const reason = stringVal === '' ? REASONS.inputClear : REASONS.none;
          setInputValue(stringVal, createChangeEventDetails(reason));
        }
      }
    }
  };

  // Support composing the Dialog component around an inline combobox.
  // `[role="dialog"]` is more interoperable than using a context, e.g. it can work
  // with third-party modal libraries, though the limitation is that the closest
  // `role=dialog` part must be the animated element.
  const resolvedPopupRef = createMemo<RefObject<HTMLElement | null>>(() => {
    const currentPositionerElement = positionerElement();
    if (inline() && currentPositionerElement) {
      return { current: closest(currentPositionerElement, '[role="dialog"]') };
    }
    return popupRef;
  });

  const {
    mounted,
    transitionStatus,
    forceUnmount: handleUnmount,
  } = useUnmountAfterClose({
    open,
    // Port note: the hook reads the ref object once, so this resolves the current one.
    ref: {
      get current() {
        return untrack(resolvedPopupRef).current;
      },
    },
    preventUnmountOnClose,
    setPreventUnmountOnClose: (value) => setPreventUnmountOnClose(value),
    onUnmount: handleUnmountCleanup,
  });

  useIsoLayoutEffect(
    function syncSelectedIndex([
      openValue,
      closeQueryValue,
      selectedValueValue,
      selectionModeValue,
      multipleValue,
      hasItemsValue,
      flatFilteredValuesValue,
      isItemEqualToValueValue,
    ]) {
      const closeQueryReleased = previousCloseQueryRef !== null && closeQueryValue === null;
      previousCloseQueryRef = closeQueryValue;

      // Closing indexes against the frozen filtered list. Reopening releases that query, so its
      // rendered coordinates must be synchronized again even though the popup is already open.
      if (openValue && (!closeQueryReleased || !hasItemsValue)) {
        return;
      }

      // State-driven (not tied to the internal event path) so controlled closes
      // also clear a pointerdown that never received a matching item mouseup.
      if (!openValue) {
        pointerDownItemRef.current = null;
      }

      if (selectionModeValue === 'none') {
        return;
      }

      // Without `items`, look the selection up in the live registry of mounted item
      // values (the list stays mounted while closed when closed-state features need
      // it — trigger interaction and rendered-label autofill force-mount it). Mounted
      // items re-assert the index themselves when their registration moves; when
      // nothing is mounted the lookup resolves to `null` and each item re-registers
      // the index on the next open.
      // Keep the selected index in the coordinates of the list that is actually rendered.
      const registry: readonly any[] = hasItemsValue ? flatFilteredValuesValue : valuesRef.current;

      setIndices({
        selectedIndex: findSelectionIndex(
          registry,
          selectedValueValue,
          isItemEqualToValueValue,
          multipleValue,
        ),
      });
    },
    () =>
      [
        open(),
        closeQuery(),
        selectedValue(),
        selectionMode(),
        multiple(),
        hasItems(),
        flatFilteredValues(),
        isItemEqualToValue(),
      ] as const,
  );

  useIsoLayoutEffect(
    ([itemsValue, flatFilteredValuesValue]) => {
      if (itemsValue) {
        valuesRef.current = flatFilteredValuesValue;
        listRef.current.length = flatFilteredValuesValue.length;
      }
    },
    () => [items(), flatFilteredValues()] as const,
  );

  useIsoLayoutEffect(
    ([openValue]) => {
      // Controlled closes can bypass `setOpen`, and their exit animation may be interrupted.
      if (!openValue && pendingQueryHighlightRef?.hasQuery) {
        pendingQueryHighlightRef = null;
      }
    },
    () => [open()] as const,
  );

  useIsoLayoutEffect(
    ([
      ,
      autoHighlightModeValue,
      hasFilteredItemsPropValue,
      hasItemsValue,
      flatFilteredValuesValue,
      inlineValue,
      openValue,
      resolvedPopupRefValue,
      inputValueValue,
    ]) => {
      // A kept-mounted dialog hides its inline list on close. Discard query-clear restoration
      // before it can overwrite the cleared highlight or report an item from the unfiltered list.
      if (!openValue && inlineValue && resolvedPopupRefValue.current) {
        pendingQueryHighlightRef = null;
        return;
      }

      const candidateItems =
        hasItemsValue || hasFilteredItemsPropValue ? flatFilteredValuesValue : valuesRef.current;
      const pendingHighlight = pendingQueryHighlightRef;
      if (pendingHighlight) {
        // A directly rendered list remains visible when the popup state is closed, while a
        // kept-mounted Positioner is hidden and should stay inert.
        const listIsNavigable =
          openValue || inlineValue || store.state.positionerElement?.hidden === false;
        if (pendingHighlight.hasQuery) {
          const input = inputRef.current;
          // Keep the request while results or a controlled popup opening are pending,
          // but do not restore an inline highlight after focus has left the input.
          if (
            !autoHighlightModeValue ||
            String(inputValueValue).trim() === '' ||
            (inlineValue &&
              autoHighlightModeValue !== 'always' &&
              (!input || activeElement(input.ownerDocument) !== input))
          ) {
            pendingQueryHighlightRef = null;
          } else if (
            listIsNavigable &&
            // Individually rendered items register without re-running this effect, and their
            // registry has holes mid-reindex, so resolve their request immediately.
            (candidateItems[0] !== undefined || (!hasItemsValue && !hasFilteredItemsPropValue))
          ) {
            store.set('activeIndex', 0);
            pendingQueryHighlightRef = null;
          }
        } else if (String(inputValueValue).trim() === '') {
          // Only handle the clear once it has committed (a controlled input may reject it),
          // so a restore cannot fire while a query is still active.
          pendingQueryHighlightRef = null;
          if (listIsNavigable) {
            const clearedBySelection = pendingHighlight.selection;
            if (
              autoHighlightModeValue === 'always' &&
              !clearedBySelection &&
              store.state.selectionMode === 'none'
            ) {
              // There is no selection to restore in Autocomplete. Keep the first-item reset
              // synchronous so list navigation sees it before a directly rendered list closes.
              store.set('activeIndex', 0);
            }

            // Items re-mounted by the clear publish their composite indices in a follow-up
            // commit, so the item registries are mid-update here. Defer past React's cascade.
            queueMicrotask(() => {
              if (
                (!store.state.open && (!store.state.inline || resolvedPopupRefValue.current)) ||
                (inputRef.current && inputRef.current.value.trim() !== '')
              ) {
                return;
              }

              // Return the highlight to the selected item, the same anchor the popup uses
              // when it first opens. Read the selection through the store so consumers can
              // pass an inline `isItemEqualToValue` or a fresh `selectedValue` array without
              // re-running this effect on every render.
              const currentSelectedValue = store.state.selectedValue;
              const isMultiple = store.state.selectionMode === 'multiple';
              const hasSelection =
                isMultiple && Array.isArray(currentSelectedValue)
                  ? currentSelectedValue.length > 0
                  : store.state.selectionMode !== 'none' && currentSelectedValue != null;

              if (hasSelection) {
                const registry =
                  hasItemsValue || hasFilteredItemsPropValue
                    ? flatFilteredValuesValue
                    : valuesRef.current;
                // A selection-driven clear keeps the just-selected item highlighted;
                // otherwise return to the open anchor. A selection that is no longer in
                // the list drops the highlight rather than leaving it on whichever item
                // now occupies that index.
                // `findItemIndex` resolves to -1 when no value was toggled.
                const toggledIndex = findItemIndex(
                  registry,
                  pendingHighlight.toggledValue,
                  store.state.isItemEqualToValue,
                );
                store.set(
                  'activeIndex',
                  toggledIndex !== -1
                    ? toggledIndex
                    : findSelectionIndex(
                        registry,
                        currentSelectedValue,
                        store.state.isItemEqualToValue,
                        isMultiple,
                      ),
                );
              } else if (clearedBySelection) {
                store.set('activeIndex', null);
              } else if (autoHighlightModeValue === 'always') {
                store.set('activeIndex', 0);
              }
            });
          }
        }
      }

      if (!openValue && !inlineValue) {
        return;
      }

      const storeActiveIndex = store.state.activeIndex;

      if (storeActiveIndex == null) {
        if (autoHighlightModeValue === 'always' && candidateItems.length > 0) {
          store.set('activeIndex', 0);
          return;
        }
        emitHighlight(undefined, -1, REASONS.none);
        return;
      }

      if (storeActiveIndex >= candidateItems.length) {
        emitHighlight(undefined, -1, REASONS.none);
        store.set('activeIndex', null);
        return;
      }

      const itemValue = candidateItems[storeActiveIndex];
      const previouslyHighlightedItemValue = lastHighlightRef.value;
      const isSameItem =
        previouslyHighlightedItemValue !== NO_ACTIVE_VALUE &&
        compareItemEquality(
          itemValue,
          previouslyHighlightedItemValue,
          store.state.isItemEqualToValue,
        );

      if (lastHighlightRef.index !== storeActiveIndex || !isSameItem) {
        emitHighlight(itemValue, storeActiveIndex, REASONS.none);
      }
    },
    () =>
      [
        activeIndex(),
        autoHighlightMode(),
        hasFilteredItemsProp(),
        hasItems(),
        flatFilteredValues(),
        inline(),
        open(),
        resolvedPopupRef(),
        // Reruns the effect when the query changes without affecting the deps above, such as
        // clearing the input when no items are filtered out (individually rendered items).
        inputValue(),
      ] as const,
  );

  useIsoLayoutEffect(
    ([selectionModeValue, inputValueValue, selectedValueValue, multipleValue]) => {
      if (selectionModeValue === 'none') {
        setFilled(String(inputValueValue) !== '');
        return;
      }
      setFilled(
        multipleValue
          ? Array.isArray(selectedValueValue) && selectedValueValue.length > 0
          : selectedValueValue != null,
      );
    },
    () => [selectionMode(), inputValue(), selectedValue(), multiple()] as const,
  );

  // Ensures that the active index is not set to 0 when the list is empty.
  // This avoids needing to press ArrowDown twice under certain conditions.
  useEffect(
    ([hasItemsValue, autoHighlightModeValue, flatFilteredValuesLength]) => {
      if (hasItemsValue && autoHighlightModeValue && flatFilteredValuesLength === 0) {
        setIndices({ activeIndex: null });
      }
    },
    () => [hasItems(), autoHighlightMode(), flatFilteredValues().length] as const,
  );

  function handleQueryChanged() {
    const currentQuery = untrack(query);
    if (releasedQuery !== null) {
      const wasReleasedQuery = currentQuery === releasedQuery;
      releasedQuery = null;
      if (wasReleasedQuery) {
        return;
      }
    }
    if (
      untrack(open) &&
      currentQuery !== '' &&
      currentQuery !== String(initialDefaultInputValue) &&
      !untrack(inputMatchesSelectedValue)
    ) {
      setQueryChangedAfterOpen(true);
    }
  }

  function handleOpenChanged() {
    // A controlled `open` prop can interrupt the close without calling `setOpen`.
    if (untrack(open) && untrack(closeQuery) !== null) {
      handleInterruptedReopen(false);
    }
  }

  // These sync triggers can run in the same commit while still seeing the pre-commit `inputValue`.
  // This render-scoped flag prevents duplicate callbacks and resets so canceled writes can retry.
  // Port note: there's no render scope, so the flag is tied to a token that changes whenever the
  // values the triggers read change (the counterpart of a new render).
  const renderToken = createMemo(() => {
    inputValue();
    selectedLabelString();
    items();
    selectedValue();
    return {};
  });
  let syncedSelectedLabelToken: object | undefined;

  function syncInputToSelectedLabel() {
    const token = untrack(renderToken);
    const label = untrack(selectedLabelString);
    if (syncedSelectedLabelToken !== token && untrack(inputValue) !== label) {
      syncedSelectedLabelToken = token;
      setInputValue(label, createChangeEventDetails(REASONS.none));
    }
  }

  function handleSelectedValueChanged() {
    if (untrack(selectionMode) === 'none') {
      return;
    }

    const currentSelectedValue = untrack(selectedValue);

    clearErrors(untrack(name));
    setDirty(
      isSelectedValueDirty(
        currentSelectedValue,
        untrack(validityData).initialValue,
        untrack(isItemEqualToValue),
      ),
    );

    validation.change(currentSelectedValue);

    if (untrack(single) && !untrack(hasInputValue) && !untrack(inputInsidePopup)) {
      syncInputToSelectedLabel();
    }
  }

  // The label catches accessor changes while the items identity restores the selected label after
  // a one-step input clear followed by a data reload. The shared sync prevents duplicate writes
  // when both change in the same commit.
  function syncInputAfterItemsOrLabelChange() {
    if (
      untrack(single) &&
      !untrack(hasInputValue) &&
      !untrack(inputInsidePopup) &&
      !untrack(queryChangedAfterOpen)
    ) {
      syncInputToSelectedLabel();
    }
  }

  function handleInputValueChanged() {
    if (untrack(selectionMode) !== 'none') {
      return;
    }

    const currentInputValue = untrack(inputValue);

    clearErrors(untrack(name));
    setDirty(currentInputValue !== untrack(validityData).initialValue);

    validation.change(currentInputValue);
  }

  useValueChanged(query, handleQueryChanged);
  useValueChanged(open, handleOpenChanged);
  useValueChanged(selectedValue, handleSelectedValueChanged);
  useValueChanged(selectedLabelString, syncInputAfterItemsOrLabelChange);
  useValueChanged(items, syncInputAfterItemsOrLabelChange);
  useValueChanged(inputValue, handleInputValueChanged);

  const floatingRootContext = useFloatingRootContext({
    get open() {
      return inline() ? true : open();
    },
    onOpenChange: setOpen,
    get elements() {
      return {
        reference: inputInsidePopup() ? triggerElement() : inputElement(),
        floating: positionerElement(),
      };
    },
  });

  const ariaHasPopup = () => (grid() ? 'grid' : 'listbox');
  // An inline list isn't gated on `open`: it renders for as long as it's in the tree, so the
  // combobox is permanently expanded even while the internal open state is `false`.
  const expanded = createMemo(() => open() || inline());
  const ariaExpanded = () => (expanded() ? 'true' : 'false');

  const role = createMemo<ElementProps>(() => {
    const currentInputElement = inputElement();
    const isPlainInput = currentInputElement?.tagName === 'INPUT';
    // During SSR and initial hydration, the input ref is not available yet.
    // Assume an input-like control so combobox ARIA attributes are present.
    const shouldTreatAsInput = currentInputElement == null || isPlainInput;
    // A non-input control only takes on combobox semantics while the list is exposed, which for
    // an inline list is the whole time.
    const shouldApplyAria = shouldTreatAsInput || expanded();

    const reference = shouldTreatAsInput
      ? ({
          autocomplete: 'off',
          spellcheck: 'false',
          autocorrect: 'off',
          autocapitalize: 'none',
        } as HTMLProps<HTMLInputElement>)
      : ({} as HTMLProps<HTMLInputElement>);

    if (shouldApplyAria) {
      reference.role = 'combobox';
      reference['aria-expanded'] = ariaExpanded();
      reference['aria-haspopup'] = ariaHasPopup();
      reference['aria-controls'] = expanded() ? listElement()?.id : undefined;
      // `readOnly` accepts no input, so no completion of any kind is offered.
      reference['aria-autocomplete'] = readOnly() ? 'none' : autoComplete();
    }

    return {
      reference: reference as HTMLProps,
      floating: { role: 'presentation' },
    };
  });

  // `readOnly` locks the value, not the interaction: the popup opens and can be browsed.
  // Value changes stay blocked in `ComboboxItem`, `ComboboxInput`'s keydown, `ComboboxTrigger`'s
  // typeahead, the clear/remove parts, and the hidden input's autofill handler.
  const click = useClick(floatingRootContext, {
    get enabled() {
      return !disabled() && openOnInputClick();
    },
    event: 'mousedown-only',
    toggle: false,
    // Apply a small delay for touch to let mobile viewport/keyboard positioning settle.
    // This avoids top-bottom flip flickers if the preferred position is "top" when first tapping.
    get touchOpenDelay() {
      return inputInsidePopup() ? 0 : 100;
    },
    reason: REASONS.inputPress,
  });

  const dismiss = useDismiss(floatingRootContext, {
    get enabled() {
      return !disabled() && !inline();
    },
    outsidePressEvent: {
      mouse: 'sloppy',
      // The visual viewport (affected by the mobile software keyboard) can be
      // somewhat small. The user may want to scroll the screen to see more of
      // the popup.
      touch: 'intentional',
    },
    // Without a popup, let the Escape key bubble the event up to other popups' handlers.
    get bubbles() {
      return inline() ? true : undefined;
    },
    outsidePress(event) {
      const target = getTarget(event) as Element | null;
      return (
        !contains(untrack(triggerElement), target) &&
        !contains(clearRef.current, target) &&
        !contains(chipsContainerRef.current, target) &&
        !contains(untrack(inputGroupElement), target)
      );
    },
  });

  const listNavigation = useListNavigation(floatingRootContext, {
    get enabled() {
      return !disabled();
    },
    get id() {
      return id();
    },
    listRef,
    get activeIndex() {
      return activeIndex();
    },
    get selectedIndex() {
      return selectedIndex();
    },
    virtual: true,
    get loopFocus() {
      return loopFocus();
    },
    get allowEscape() {
      return loopFocus() && !autoHighlightMode();
    },
    get focusItemOnOpen() {
      return queryChangedAfterOpen() || (selectionMode() === 'none' && !autoHighlightMode())
        ? false
        : 'auto';
    },
    get focusItemOnHover() {
      return highlightItemOnHover();
    },
    get resetOnPointerLeave() {
      return !keepHighlight();
    },
    get orientation() {
      return grid() ? 'horizontal' : undefined;
    },
    get rtl() {
      return direction() === 'rtl';
    },
    disabledIndices: EMPTY_ARRAY,
    get grid() {
      return grid() ? gridNavigation : undefined;
    },
    onNavigate(nextActiveIndex, event, source) {
      // Ignore automatic navigation while closed, including selected-index sync for inline lists.
      // Inline lists remain navigable while `open` is false, so still allow imperative navigation
      // (keeping the highlight in sync with the cursor advanced by `highlightItem()`) and resets
      // (clearing the highlight when an unbound inline list unmounts, e.g. in a closed dialog).
      if (
        (!event &&
          !untrack(open) &&
          source !== 'imperative' &&
          !(untrack(inline) && nextActiveIndex === null)) ||
        untrack(transitionStatus) === 'ending'
      ) {
        return;
      }

      // Port note: events are native, so there's no `event.nativeEvent`.
      setIndices({
        activeIndex: nextActiveIndex,
        type: source === 'imperative' ? REASONS.imperativeAction : getHighlightReason(event),
        event,
      });
    },
  });

  const highlightItem = (target: HighlightItemTarget) => {
    // `autoHighlight="always"` guarantees an item is highlighted at all times, so a clear would
    // be undone synchronously. Report nothing rather than emitting a state the component never
    // rests in: consumers would otherwise see `undefined` followed by the first item again, and
    // act on a highlight that was never observable.
    if (target === 'none' && untrack(autoHighlightMode) === 'always') {
      return;
    }

    listNavigation.highlightItem(target);
  };

  const actions: AriaCombobox.Actions = {
    unmount: handleUnmount,
    close: () => setOpen(false, createChangeEventDetails(REASONS.imperativeAction)),
    highlightItem,
  };

  // Port note: counterpart of `React.useImperativeHandle(actionsRef, …)`. React assigns the handle
  // before ancestors' effects run; Solid runs ancestors' effects first, so also assign it on setup.
  const initialActionsRef = untrack(() => props.actionsRef);
  if (initialActionsRef) {
    initialActionsRef.current = actions;
  }

  useIsoLayoutEffect(
    ([actionsRef]) => {
      if (!actionsRef) {
        return undefined;
      }
      actionsRef.current = actions;
      return () => {
        actionsRef.current = null;
      };
    },
    () => [props.actionsRef] as const,
  );

  const inputProps = createMemo(() => {
    const isGrid = grid();
    return mergeProps(
      listNavigation.reference,
      {
        onKeyDown(event: BaseUIEvent<KeyboardEvent>) {
          // In grid mode the navigation hook treats ArrowLeft/ArrowRight as horizontal
          // grid movement. When the input has focus and no item is highlighted the user
          // is still editing the query, so let the input keep its native caret behavior.
          if (
            isGrid &&
            store.state.activeIndex == null &&
            (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
          ) {
            event.preventBaseUIHandler();
          }
        },
      },
      dismiss.reference,
      click.reference,
      role().reference,
    ) as HTMLProps;
  });

  const popupProps = createMemo(
    () => mergeProps(FOCUSABLE_POPUP_PROPS as HTMLProps, dismiss.floating) as HTMLProps,
  );

  const listProps = createMemo(
    () => mergeProps(listNavigation.floating, role().floating) as HTMLProps,
  );

  const itemProps = createMemo<HTMLProps>(() => {
    const listNavigationItemProps = listNavigation.item as HTMLProps | undefined;
    if (!listNavigationItemProps) {
      return EMPTY_OBJECT;
    }

    // Combobox keeps focus on the input; item focus would incorrectly sync
    // list navigation state from DOM focus.
    // Port note: React's `onFocus` is `onFocusIn` here.
    return { ...listNavigationItemProps, onFocusIn: undefined };
  });

  store.useContextCallback('setOpen', () => setOpen);
  store.useContextCallback('setInputValue', () => setInputValue);
  store.useContextCallback('setSelectedValue', () => setSelectedValue);
  store.useContextCallback('setIndices', () => setIndices);
  store.useContextCallback('handleSelection', () => handleSelection);
  store.useContextCallback('forceMount', () => forceMount);
  store.useContextCallback('requestSubmit', () => requestSubmit);
  store.useContextCallback('onOpenChangeComplete', () => props.onOpenChangeComplete);

  // The prop bags must be in the store before the parts render: they read them with `useStore`
  // during render, and a layout effect commits only after all children have rendered.
  useOnFirstRender(() => {
    store.update({
      inline: inlineProp(),
      popupProps: popupProps(),
      listProps: listProps(),
      inputProps: inputProps(),
      triggerProps,
      itemProps: itemProps(),
    });
  });

  const syncedValues = () => ({
    id: id(),
    selectedValue: selectedValue(),
    open: open(),
    mounted: mounted(),
    transitionStatus: transitionStatus(),
    items: storeItems(),
    inline: inlineProp(),
    popupProps: popupProps(),
    listProps: listProps(),
    inputProps: inputProps(),
    triggerProps,
    itemProps: itemProps(),
    openMethod: openMethod(),
    selectionMode: selectionMode(),
    name: name(),
    form: props.form,
    disabled: disabled(),
    readOnly: readOnly(),
    required: required(),
    grid: grid(),
    virtualized: virtualized(),
    openOnInputClick: openOnInputClick(),
    itemToStringLabel: itemToStringLabel(),
    modal: modal(),
    autoHighlight: autoHighlightMode(),
    isItemEqualToValue: isItemEqualToValue(),
    submitOnItemClick: submitOnItemClick(),
    hasInputValue: hasInputValue(),
  });
  const syncedKeys = Object.keys(untrack(syncedValues)) as Array<
    keyof ReturnType<typeof syncedValues>
  >;

  useIsoLayoutEffect(
    (values) => {
      // `inputOwnsFormValue` is derived here rather than during render because `ComboboxInput`
      // writes it from a ref callback earlier in the same commit, and it has to land in this same
      // `update` so subscribers never observe an intermediate snapshot. That is also why
      // `store.useSyncedValues` can't be used yet: it would need a second write. The dependencies
      // are derived from `syncedValues` so a newly synchronized field can't be forgotten here.
      const nextValues: Record<string, unknown> = {};
      syncedKeys.forEach((key, index) => {
        nextValues[key] = values[index];
      });
      store.update({
        ...(nextValues as ReturnType<typeof syncedValues>),
        inputOwnsFormValue:
          nextValues.selectionMode === 'none' &&
          (Boolean(nextValues.inline) || !store.state.inputInsidePopup),
      });
    },
    () => {
      const values = syncedValues();
      return syncedKeys.map((key) => values[key]);
    },
  );

  // Port note: the context value's fields are getters.
  const itemsContextValue: ComboboxDerivedItemsContext = {
    get query() {
      return query();
    },
    get hasItems() {
      return hasItems();
    },
    get filteredItems() {
      return filteredItems() as any[];
    },
    get flatFilteredValues() {
      return flatFilteredValues();
    },
  };

  const serializedValue = createMemo(() => {
    const rawValue = fieldRawValue();
    if (Array.isArray(rawValue)) {
      return '';
    }
    return stringifyAsValue(rawValue, itemToStringValue());
  });

  const hasMultipleSelection = () => {
    const currentSelectedValue = selectedValue();
    return multiple() && Array.isArray(currentSelectedValue) && currentSelectedValue.length > 0;
  };
  const hiddenInputName = () =>
    multiple() || (selectionMode() === 'none' && inputOwnsFormValue()) ? undefined : name();

  const hiddenInputs = createMemo(() => {
    const currentSelectedValue = selectedValue();
    if (!multiple() || !Array.isArray(currentSelectedValue) || !name()) {
      return [] as string[];
    }

    return currentSelectedValue.map((value: Value) => stringifyAsValue(value, itemToStringValue()));
  });

  const hiddenInputProps = createMemo(() =>
    validation.getValidationProps(disabled(), {
      // Move focus when the hidden input is focused.
      // Port note: React's `onFocus` is `onFocusIn` here.
      onFocusIn() {
        if (untrack(inputInsidePopup)) {
          untrack(triggerElement)?.focus();
          return;
        }

        (inputRef.current || untrack(triggerElement))?.focus();
      },
      // Handle browser autofill.
      // Port note: React's `onChange` on text inputs is the native `input` event.
      // Port note: native listeners also restore rejected edits on disabled inputs.
      onInput(event: InputEvent) {
        // Workaround for https://github.com/react/react/issues/9023
        if (event.defaultPrevented || untrack(disabled) || untrack(readOnly)) {
          // Port note: Solid does not restore a controlled DOM value after a rejected edit.
          (event.currentTarget as HTMLInputElement).value = untrack(serializedValue);
          return;
        }

        const input = event.currentTarget as HTMLInputElement;
        const nextValue = input.value;
        const nextValueLower = nextValue.toLowerCase();
        const details = createChangeEventDetails(REASONS.none, event);

        const findSerializedMatchIndex = () =>
          valuesRef.current.findIndex(
            (candidate) =>
              stringifyAsValue(candidate, untrack(itemToStringValue)).toLowerCase() ===
                nextValueLower || stringifyValueLabel(candidate).toLowerCase() === nextValueLower,
          );

        function handleChange() {
          // Browser autofill only writes a single scalar value.
          if (untrack(multiple)) {
            return;
          }

          if (untrack(selectionMode) === 'none') {
            setInputValue(nextValue, details);
            return;
          }

          // Preserve the original serialized matching, then fall back to rendered text,
          // which browsers can autofill for primitive values like `value="US">United States`.
          let matchingIndex = findSerializedMatchIndex();

          if (matchingIndex === -1) {
            matchingIndex = valuesRef.current.findIndex((_, index) => {
              const renderedLabel = labelsRef.current[index];
              return renderedLabel != null && renderedLabel.toLowerCase() === nextValueLower;
            });
          }

          const matchingValue = matchingIndex === -1 ? undefined : valuesRef.current[matchingIndex];
          if (matchingValue != null) {
            // `setSelectedValue` may be canceled by `onValueChange`; rely on
            // `useValueChanged` to mark the field dirty and run validation only
            // when the value actually changes.
            setSelectedValue?.(matchingValue, details);
          }
        }

        // Only single-selection autofill matches against the registered values/labels.
        // `multiple` ignores autofill and `none` just writes the input value, so avoid the
        // sticky `forceMounted` mount (which never resets) for those modes.
        if (untrack(single)) {
          forceMount();
          if (untrack(items) && findSerializedMatchIndex() === -1) {
            // `forceMount` only refreshes the derived labels for the `items` prop. When
            // serialized matching misses, also mount the list so rendered labels (which can
            // differ from the serialized values) are registered for autofill matching.
            store.set('forceMounted', true);
          }
        }
        queueMicrotask(() => {
          handleChange();
          // Port note: React restores controlled inputs after every edit, including
          // unknown values, cancellation, and changes rejected by a controlled parent.
          flush();
          input.value = untrack(serializedValue);
        });
      },
    }),
  );

  // Port note: delegation suppresses events on disabled controls. Autofill restoration
  // needs a native listener, including synthetic autofill dispatched on a disabled input.
  const attachAutofillListener = (node: HTMLInputElement) => {
    const listener = (event: Event) =>
      untrack(() =>
        (hiddenInputProps().onInput as (event: InputEvent) => void)(event as InputEvent),
      );
    node.addEventListener('input', listener);
    return () => node.removeEventListener('input', listener);
  };
  const hiddenInputRef = useMergedRefs(
    () => props.inputRef,
    () => validation.inputRef,
    () => attachAutofillListener,
  );

  const hiddenInputElementProps = () => ({
    ...omit(hiddenInputProps(), 'onInput'),
    id: id() && hiddenInputName() == null ? `${id()}-hidden-input` : undefined,
    form: props.form,
    name: hiddenInputName(),
    autocomplete: props.formAutoComplete,
    disabled: disabled(),
    required: required() && !hasMultipleSelection(),
    readonly: readOnly(),
    value: serializedValue(),
    style: (hiddenInputName() ? visuallyHiddenInput : visuallyHidden) as JSX.CSSProperties,
    tabindex: -1,
    'aria-hidden': 'true' as const,
  });

  return (
    <ComboboxRootContext value={store}>
      <ComboboxFloatingContext value={floatingRootContext}>
        <ComboboxHasItemsContext value={hasItems}>
          <ComboboxDerivedItemsContext value={itemsContextValue}>
            <ComboboxInputValueContext value={inputValue}>
              {props.children}
              {/* Port note: delegation suppresses input on disabled controls; native autofill must restore them. */}
              <input {...hiddenInputElementProps()} ref={hiddenInputRef} />
              <For each={hiddenInputs()}>
                {(currentSerializedValue) => (
                  <input
                    type="hidden"
                    form={props.form}
                    name={name()}
                    value={currentSerializedValue}
                    disabled={disabled()}
                  />
                )}
              </For>
            </ComboboxInputValueContext>
          </ComboboxDerivedItemsContext>
        </ComboboxHasItemsContext>
      </ComboboxFloatingContext>
    </ComboboxRootContext>
  );
}

type SelectionMode = 'single' | 'multiple' | 'none';

type ComboboxItemValueType<ItemValue, Mode extends SelectionMode> = Mode extends 'multiple'
  ? ItemValue[]
  : ItemValue;

interface ComboboxRootProps<ItemValue, Item = ItemValue> {
  children?: JSX.Element | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the internal input.
   * Useful when the combobox is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * The id of the component.
   */
  id?: string | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Whether the user should be unable to choose a different option from the popup.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the popup is initially open.
   *
   * To render a controlled popup, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Whether the popup is currently open. Use when controlled.
   */
  open?: boolean | undefined;
  /**
   * Event handler called when the popup is opened or closed.
   */
  onOpenChange?:
    ((open: boolean, eventDetails: AriaCombobox.OpenChangeEventDetails) => void) | undefined;
  /**
   * Event handler called after any animations complete when the popup is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * Whether the popup opens when clicking the input.
   * @default true
   */
  openOnInputClick?: boolean | undefined;
  /**
   * Whether the first matching item is highlighted automatically.
   * - `false`: do not highlight automatically.
   * - `true`: highlight after the user types and keep the highlight while the query changes.
   * - `'always'`: highlight the first item as soon as the list opens.
   * @default false
   */
  autoHighlight?: boolean | 'always' | undefined;
  /**
   * Whether the highlighted item should be preserved when the pointer leaves the list.
   * @default false
   */
  keepHighlight?: boolean | undefined;
  /**
   * Whether moving the pointer over items should highlight them.
   * Disabling this prop allows CSS `:hover` to be differentiated from the `:focus` (`data-highlighted`) state.
   * @default true
   */
  highlightItemOnHover?: boolean | undefined;
  /**
   * Whether to loop keyboard focus back to the input when the end of the list is reached while using the arrow keys. The first item can then be reached by pressing <kbd>ArrowDown</kbd> again from the input, or the last item can be reached by pressing <kbd>ArrowUp</kbd> from the input.
   * The input is always included in the focus loop per [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).
   * When disabled, focus does not move when on the last element and the user presses <kbd>ArrowDown</kbd>, or when on the first element and the user presses <kbd>ArrowUp</kbd>.
   * @default true
   */
  loopFocus?: boolean | undefined;
  /**
   * The input value of the combobox. Use when controlled.
   */
  inputValue?: string | number | readonly string[] | undefined;
  /**
   * Callback fired when the input value of the combobox changes.
   */
  onInputValueChange?:
    ((value: string, eventDetails: AriaCombobox.ChangeEventDetails) => void) | undefined;
  /**
   * The uncontrolled input value when initially rendered.
   *
   * To render a controlled input, use the `inputValue` prop instead.
   */
  defaultInputValue?: string | number | readonly string[] | undefined;
  /**
   * A ref to imperative actions.
   * - `unmount`: Ends the closing phase of the combobox after an externally controlled closing animation finishes.
   * Call `preventUnmountOnClose()` in `onOpenChange` first, otherwise the combobox completes closing on its own.
   * Whether it leaves the DOM is decided by `keepMounted` on the portal.
   * - `close`: Closes the combobox imperatively when called.
   * - `highlightItem`: Moves or clears the highlight while the popup is open.
   *   `'next'` and `'previous'` move sequentially through the items, including across rows in a
   *   grid, and wrap when `loopFocus` is enabled. Unlike the arrow keys, they never return the
   *   highlight to the input. `'first'` and `'last'` highlight the first or last item.
   *   `'none'` clears the highlight; with `autoHighlight="always"`, the highlight cannot be cleared.
   *   Calling this action does not open the popup. To highlight an item after opening it, call
   *   the action from `onOpenChangeComplete` when `open` is `true`.
   *   Highlight changes requested through this action report the reason `'imperative-action'`
   *   to `onItemHighlighted`.
   */
  actionsRef?: RefObject<AriaCombobox.Actions | null> | undefined;
  /**
   * Callback fired when an item is highlighted or unhighlighted.
   * Receives the highlighted item value (or `undefined` if no item is highlighted) and event details with a `reason` property describing why the highlight changed.
   * The `reason` can be:
   * - `'keyboard'`: the highlight changed due to keyboard navigation.
   * - `'pointer'`: the highlight changed due to pointer hovering. The event may be a `MouseEvent`
   *   rather than a `PointerEvent`.
   * - `'imperative-action'`: the highlight changed via `actionsRef`'s `highlightItem`.
   * - `'none'`: the highlight changed for another reason, such as typing, `autoHighlight`, the
   *   item list changing, or the popup opening or closing.
   */
  onItemHighlighted?:
    | ((itemValue: ItemValue | undefined, eventDetails: AriaCombobox.HighlightEventDetails) => void)
    | undefined;
  /**
   * A ref to the hidden input element.
   */
  inputRef?: ((element: HTMLInputElement) => void) | RefObject<HTMLInputElement | null> | undefined;
  /**
   * Whether list items are presented in a grid layout.
   * When enabled, arrow keys navigate across rows and columns inferred from DOM rows.
   * @default false
   */
  grid?: boolean | undefined;
  /**
   * The items to be displayed in the list.
   * Can be a flat array of items, an array of groups with items, or a collection created by
   * the `createItems()` function, which derives each item's selection value and label.
   * Nullish entries are not supported: remove them from the data before passing it.
   */
  items?:
    readonly any[] | readonly Group<any>[] | ComboboxItemCollection<Item, ItemValue> | undefined;
  /**
   * Filtered items to display in the list.
   * When provided, the list uses these items instead of filtering the `items` prop internally.
   * When `items` is also provided, this array must preserve its flat or grouped structure.
   * With a `createItems()` collection, pass source items rather than derived values.
   * Nullish entries are not supported, as in `items`.
   * Use when you want to control filtering logic externally with the `useFilter()` hook.
   */
  filteredItems?: readonly Item[] | readonly Group<Item>[] | undefined;
  /**
   * Filter function used to match items vs input query.
   * Receives the source item, which is the derived value's item when `items` is a `createItems()`
   * collection, and the item itself otherwise.
   */
  filter?:
    | null
    | ((item: Item, query: string, itemToString?: (item: Item) => string) => boolean)
    | undefined;
  /**
   * When the item values are objects (`<Combobox.Item value={object}>`), this function converts the object value to a string representation for display in the input.
   * If the shape of the object is `{ value, label }`, the label will be used automatically without needing to specify this prop.
   * With a `createItems()` collection, this receives the derived value, and the collection's
   * `getLabel` takes precedence for values it can resolve.
   */
  itemToStringLabel?: ((itemValue: ItemValue) => string) | undefined;
  /**
   * When the item values are objects (`<Combobox.Item value={object}>`), this function converts the object value to a string representation for form submission.
   * If the shape of the object is `{ value, label }`, the value will be used automatically without needing to specify this prop.
   * With a `createItems()` collection, this receives the derived value.
   */
  itemToStringValue?: ((itemValue: ItemValue) => string) | undefined;
  /**
   * Custom comparison logic used to determine if a combobox item value matches the current selected value. Useful when item values are objects without matching referentially.
   * With a `createItems()` collection, both arguments are derived values.
   * Defaults to `Object.is` comparison.
   */
  isItemEqualToValue?: ((itemValue: ItemValue, value: ItemValue) => boolean) | undefined;
  /**
   * Whether the items are being externally virtualized.
   * @default false
   */
  virtualized?: boolean | undefined;
  /**
   * Whether the list is rendered inline without using the component's own popup.
   *
   * Specify `open` unconditionally in conjunction with this prop so the list is considered
   * visible: `<Combobox.Root inline open>`
   *
   * In a `Combobox.Root` > `Dialog.Root` composition, bind the Combobox's `open` and
   * `onOpenChange` props to the `Dialog`'s `open` and `onOpenChange` state instead so the
   * component resets its transient state (filter query, highlighted item, and input value) when
   * the dialog closes.
   * @default false
   */
  inline?: boolean | undefined;
  /**
   * Determines if the popup enters a modal state when open.
   * - `true`: user interaction is limited to the popup: document page scroll is locked and pointer interactions on outside elements are disabled.
   * - `false`: user interaction with the rest of the document is allowed.
   *
   * On touch devices, a `true` modal blocks outside taps but leaves the page scrollable unless the popup spans nearly the full viewport width, matching native iOS behavior.
   * @default false
   */
  modal?: boolean | undefined;
  /**
   * The maximum number of items to display in the list.
   * @default -1
   */
  limit?: number | undefined;
  /**
   * Controls how the component behaves with respect to list filtering and inline autocompletion.
   * - `list` (default): items are dynamically filtered based on the input value. The input value does not change based on the active item.
   * - `both`: items are dynamically filtered based on the input value, which will temporarily change based on the active item (inline autocompletion).
   * - `inline`: items are static (not filtered), and the input value will temporarily change based on the active item (inline autocompletion).
   * - `none`: items are static (not filtered), and the input value will not change based on the active item.
   * @default 'list'
   */
  autoComplete?: 'list' | 'both' | 'inline' | 'none' | undefined;
  /**
   * Provides a hint to the browser for autofill on the hidden input element.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete
   */
  formAutoComplete?: string | undefined;
  /**
   * The locale to use for string comparison.
   * Defaults to the user's runtime locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * Whether clicking an item should submit the owning form.
   * @default false
   */
  submitOnItemClick?: boolean | undefined;
  /**
   * INTERNAL: When `selectionMode` is `none`, controls whether selecting an item fills the input.
   */
  fillInputOnItemPress?: boolean | undefined;
}

export interface AriaComboboxState {}

export type AriaComboboxProps<
  Value,
  Mode extends SelectionMode = 'none',
  Item = Value,
> = ComboboxRootProps<Value, Item> & {
  /**
   * How the combobox should remember the selected value.
   * - `single`: Remembers the last selected value.
   * - `multiple`: Remember all selected values.
   * - `none`: Do not remember the selected value.
   */
  selectionMode: Mode;
  /**
   * The selected value of the combobox. Use when controlled.
   */
  selectedValue?: ComboboxItemValueType<Value, Mode> | undefined;
  /**
   * The uncontrolled selected value of the combobox when it's initially rendered.
   *
   * To render a controlled combobox, use the `selectedValue` prop instead.
   */
  defaultSelectedValue?: ComboboxItemValueType<Value, Mode> | null | undefined;
  /**
   * Callback fired when the selected value of the combobox changes.
   */
  onSelectedValueChange?:
    | ((
        value: ComboboxItemValueType<Value, Mode>,
        eventDetails: AriaCombobox.ChangeEventDetails,
      ) => void)
    | undefined;
};

export type AriaComboboxHighlightItemTarget = HighlightItemTarget;

export namespace AriaCombobox {
  export type Props<Value, Mode extends SelectionMode = 'none', Item = Value> = AriaComboboxProps<
    Value,
    Mode,
    Item
  >;
  export type State = AriaComboboxState;

  export interface Actions {
    unmount: () => void;
    close: () => void;
    highlightItem: (target: HighlightItemTarget) => void;
  }

  export type HighlightItemTarget = AriaComboboxHighlightItemTarget;

  export type HighlightEventReason =
    | typeof REASONS.keyboard
    | typeof REASONS.pointer
    | typeof REASONS.imperativeAction
    | typeof REASONS.none;
  export type HighlightEventDetails = BaseUIHighlightEventDetails<
    HighlightEventReason,
    { index: number }
  >;

  export type ChangeEventReason =
    | typeof REASONS.triggerPress
    | typeof REASONS.inputPress
    | typeof REASONS.outsidePress
    | typeof REASONS.itemPress
    | typeof REASONS.closePress
    | typeof REASONS.escapeKey
    | typeof REASONS.listNavigation
    | typeof REASONS.focusOut
    | typeof REASONS.inputChange
    | typeof REASONS.inputClear
    | typeof REASONS.clearPress
    | typeof REASONS.chipRemovePress
    | typeof REASONS.cancelOpen
    | typeof REASONS.imperativeAction
    | typeof REASONS.none;
  export type OpenChangeEventDetails = ChangeEventDetails & {
    /** Prevents the popup from unmounting until the `unmount` action is called. */
    preventUnmountOnClose: () => void;
  };
  export type ChangeEventDetails = BaseUIChangeEventDetails<ChangeEventReason> & {
    /**
     * When `reason` is `input-clear` in multiple mode, indicates whether an item press caused the
     * clear. Automatic cleanup clears omit this property.
     */
    isItemPress?: boolean | undefined;
  };
}
