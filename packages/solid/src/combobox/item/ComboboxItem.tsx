import { createMemo, flush, omit, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { onCleanupWithWrites } from '@base-ui-solid/utils/cleanup';
import {
  useComboboxRootContext,
  useComboboxHasItemsContext,
  useComboboxDerivedItemsContext,
} from '../root/ComboboxRootContext';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import type { BaseUIComponentProps, NonNativeButtonProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { ComboboxItemContext } from './ComboboxItemContext';
import { useButton } from '../../internals/use-button';
import { useComboboxRowContext } from '../row/ComboboxRowContext';
import {
  compareItemEquality,
  findItemIndex,
  resolveSelectedIndex,
} from '../../internals/itemEquality';

interface ComboboxItemInnerProps {
  componentProps: ComboboxItem.Props;
  /**
   * Whether the list is externally virtualized. Passed down from the wrapper (which already
   * subscribes to it) so the inner component doesn't re-subscribe to the store.
   */
  virtualized: Accessor<boolean>;
  /**
   * Pre-resolved index for the virtualized fallback (when no `index` prop is provided).
   * `undefined` for the common path, where the index is derived from `index` prop or the
   * composite list registration order.
   */
  indexFromFilter: Accessor<number | undefined>;
}

function ComboboxItemInner(props: ComboboxItemInnerProps) {
  const { componentProps, virtualized, indexFromFilter } = props;
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'value',
    'index',
    'disabled',
    'nativeButton',
  );

  const itemValue = () => (componentProps.value === undefined ? null : componentProps.value);
  const indexProp = () => componentProps.index;

  const textRef: RefObject<HTMLElement | null> = { current: null };
  const listItem = useCompositeListItem({
    guess: true,
    index: indexProp,
    textRef,
  });

  const store = useComboboxRootContext();
  const isRow = useComboboxRowContext();
  const hasItems = useComboboxHasItemsContext();

  // Port note: upstream combines `itemProps`, `id`, `selectionMode`, `disabled`, `readOnly` and
  // `isItemEqualToValue` into one `itemRoot` store value so each item subscribes once, which
  // saves React re-renders. Solid's `useState` accessors are fine-grained, so they stay separate.
  const selectionMode = store.useState('selectionMode');
  const rootDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const isItemEqualToValue = store.useState('isItemEqualToValue');

  const disabled = createMemo(() => rootDisabled() || (componentProps.disabled ?? false));
  const selectable = () => selectionMode() !== 'none';
  const index = createMemo(() => indexProp() ?? indexFromFilter() ?? listItem.index());
  const hasRegistered = () => index() !== -1;

  const rootId = store.useState('id');
  const highlighted = store.useState('isActive', index);
  const matchesSelectedValue = store.useState('isSelected', itemValue);
  const itemProps = store.useState('itemProps');

  let itemRef: HTMLDivElement | null = null;

  const id = () => {
    const currentRootId = rootId();
    return currentRootId != null && hasRegistered() ? `${currentRootId}-${index()}` : undefined;
  };
  const selected = createMemo(() => matchesSelectedValue() && selectable());

  useIsoLayoutEffect(
    ([hasRegisteredValue, virtualizedValue, indexValue, indexPropValue]) => {
      const shouldRun = hasRegisteredValue && (virtualizedValue || indexPropValue != null);
      if (!shouldRun) {
        return undefined;
      }

      const list = store.context.listRef.current;
      list[indexValue] = itemRef;

      return () => {
        delete list[indexValue];
      };
    },
    () => [hasRegistered(), virtualized(), index(), indexProp(), store] as const,
  );

  useIsoLayoutEffect(
    ([hasRegisteredValue, hasItemsValue, indexValue, itemValueValue]) => {
      if (!hasRegisteredValue || hasItemsValue) {
        return undefined;
      }

      const visibleValues = store.context.valuesRef.current;
      visibleValues[indexValue] = itemValueValue;

      return () => {
        delete visibleValues[indexValue];
      };
    },
    () => [hasRegistered(), hasItems(), index(), itemValue(), store] as const,
  );

  useIsoLayoutEffect(
    ([
      hasRegisteredValue,
      hasItemsValue,
      ,
      indexValue,
      itemValueValue,
      isItemEqualToValueValue,
    ]) => {
      if (!hasRegisteredValue || hasItemsValue) {
        return;
      }

      // Runs while closed as well (the list can stay mounted via `keepMounted` or a
      // force-mount) so the index tracks the item's composite position, keeping features
      // like closed-trigger typeahead in sync when the rendered order changes.
      const selectedValue = store.state.selectedValue;

      let nextIndex = store.state.selectedIndex;
      if (store.state.selectionMode === 'multiple' && Array.isArray(selectedValue)) {
        nextIndex = resolveSelectedIndex(
          indexValue,
          itemValueValue,
          store.context.valuesRef.current,
          selectedValue,
          isItemEqualToValueValue,
          nextIndex,
        );
      } else if (compareItemEquality(itemValueValue, selectedValue, isItemEqualToValueValue)) {
        nextIndex = indexValue;
      }
      store.set('selectedIndex', nextIndex);
    },
    () => [hasRegistered(), hasItems(), store, index(), itemValue(), isItemEqualToValue()] as const,
  );

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled: () => true,
    native: () => componentProps.nativeButton ?? false,
    composite: () => true,
  });

  const state = createMemo<ComboboxItemState>(
    () => ({
      disabled: disabled(),
      selected: selected(),
      highlighted: highlighted(),
    }),
    { equals: fastObjectShallowCompare },
  );

  function commitSelection(nativeEvent: MouseEvent) {
    function selectItem() {
      store.context.handleSelection(nativeEvent, untrack(itemValue));
    }

    if (store.state.submitOnItemClick) {
      // Port note: counterpart of `ReactDOM.flushSync(selectItem)`.
      selectItem();
      flush();
      store.context.requestSubmit();
    } else {
      selectItem();
    }
  }

  // Port note: Solid has no capture-phase event props, so upstream's `onPointerDownCapture` is a
  // native capture listener.
  const handlePointerDownCapture = (event: PointerEvent) => {
    // The compat `mouseup` only fires for the primary pointer, so a non-primary
    // touch must not overwrite the shared ref — a mismatch would make the primary
    // pointer's release read as a drag-select and commit a second time after `click`.
    if (event.isPrimary) {
      store.context.pointerDownItemRef.current = event.currentTarget as Element;
    }
    event.preventDefault();
  };
  let pointerDownCaptureElement: HTMLElement | null = null;
  const pointerDownCaptureRef = (element: HTMLElement | null) => {
    if (element === pointerDownCaptureElement) {
      return;
    }
    pointerDownCaptureElement?.removeEventListener('pointerdown', handlePointerDownCapture, true);
    pointerDownCaptureElement = element;
    element?.addEventListener('pointerdown', handlePointerDownCapture, true);
  };
  onCleanupWithWrites(() => pointerDownCaptureRef(null));

  const defaultProps = (): Record<string, any> => ({
    id: id(),
    role: isRow ? 'gridcell' : 'option',
    'aria-selected': selectable() ? selected() : undefined,
    // Focusable items steal focus from the input upon mouseup.
    // Warn if the user renders a natively focusable element like `<button>`,
    // as it should be a `<div>` instead.
    tabindex: undefined,
    onMouseDown(event: MouseEvent) {
      // iOS Safari can emit a synthetic mousedown for touch taps without a preceding
      // pointerdown. Prevent default here too so tapping an item does not blur the input.
      event.preventDefault();
    },
    onClick(event: MouseEvent) {
      if (untrack(disabled) || untrack(readOnly)) {
        return;
      }

      commitSelection(event);
    },
    onMouseUp(event: MouseEvent) {
      const pointerStartedOnItem = store.context.pointerDownItemRef.current === event.currentTarget;
      store.context.pointerDownItemRef.current = null;

      if (
        untrack(disabled) ||
        untrack(readOnly) ||
        event.button !== 0 ||
        pointerStartedOnItem ||
        !untrack(highlighted)
      ) {
        return;
      }

      commitSelection(event);
    },
  });

  const contextValue: ComboboxItemContext = {
    selected,
    textRef,
  };

  return (
    <ComboboxItemContext value={contextValue}>
      {useRenderElement('div', componentProps, {
        ref: [
          buttonRef,
          listItem.ref,
          (element: HTMLDivElement | null) => {
            itemRef = element;
          },
          pointerDownCaptureRef,
        ],
        state,
        props: () => [itemProps(), defaultProps(), elementProps, getButtonProps],
      })}
    </ComboboxItemContext>
  );
}

/**
 * Resolves the index from the filtered items for the virtualized fallback (no `index` prop).
 * Isolated here so that this per-keystroke subscription to the derived-items context is only
 * paid by virtualized items. Those re-render on every input change anyway — the parent
 * virtualizer re-windows the list as the filtered set changes — so the extra subscription costs
 * them nothing, while it keeps every non-virtualized item off that context.
 */
function ComboboxItemVirtualizedIndex(props: { componentProps: ComboboxItem.Props }) {
  const { componentProps } = props;

  const store = useComboboxRootContext();
  const isItemEqualToValue = store.useState('isItemEqualToValue');
  const derivedItems = useComboboxDerivedItemsContext();

  const indexFromFilter = createMemo(() => {
    const lookupValue = componentProps.value ?? null;
    return findItemIndex(derivedItems.flatFilteredValues, lookupValue, isItemEqualToValue());
  });

  // Only reached when `virtualized` is true (see the wrapper below).
  return (
    <ComboboxItemInner
      componentProps={componentProps}
      virtualized={() => true}
      indexFromFilter={indexFromFilter}
    />
  );
}

/**
 * An individual item in the list.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui-solid.pages.dev/solid/components/combobox)
 */
export function ComboboxItem(componentProps: ComboboxItem.Props): JSX.Element {
  const store = useComboboxRootContext();
  const virtualized = store.useState('virtualized');

  // `virtualized` (and whether an item provides an explicit `index`) must be stable for an
  // item's lifetime: the two branches return different component types, so flipping it at
  // runtime remounts the item and resets its refs and effects.
  // Port note: read once, as the branch is fixed for the item's lifetime.

  if (untrack(virtualized) && untrack(() => componentProps.index) == null) {
    // eslint-disable-next-line solid/components-return-once -- The virtualized branch is fixed for this instance.
    return <ComboboxItemVirtualizedIndex componentProps={componentProps} />;
  }

  return (
    <ComboboxItemInner
      componentProps={componentProps}
      virtualized={virtualized}
      indexFromFilter={() => undefined}
    />
  );
}

export interface ComboboxItemState {
  /**
   * Whether the item should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is selected.
   */
  selected: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
}

export interface ComboboxItemProps
  extends NonNativeButtonProps, Omit<BaseUIComponentProps<'div', ComboboxItemState>, 'id'> {
  children?: JSX.Element | undefined;
  /**
   * An optional click handler for the item when selected.
   * It fires when clicking the item with the pointer, as well as when pressing `Enter` with the keyboard if the item is highlighted when the `Input` or `List` element has focus.
   */
  onClick?: BaseUIComponentProps<'div', ComboboxItemState>['onClick'] | undefined;
  /**
   * The index of the item in the list. Improves performance when specified by avoiding the need to calculate the index automatically from the DOM.
   */
  index?: number | undefined;
  /**
   * A unique value that identifies this item.
   * @default null
   */
  value?: any;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ComboboxItem {
  export type State = ComboboxItemState;
  export type Props = ComboboxItemProps;
}
