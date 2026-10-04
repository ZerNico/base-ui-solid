import { createMemo, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import type {
  BaseUIComponentProps,
  BaseUIEvent,
  NonNativeButtonProps,
} from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { SelectItemContext } from './SelectItemContext';
import { useButton } from '../../internals/use-button';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import {
  compareItemEquality,
  removeItem,
  resolveSelectedIndex,
} from '../../internals/itemEquality';
import { isVirtualClick } from '../../floating-ui-react/utils/event';

/**
 * An individual option in the select popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectItem(componentProps: SelectItem.Props) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'value',
    'label',
    'disabled',
    'nativeButton',
  );
  const itemValue = () => componentProps.value ?? null;
  const disabledProp = () => componentProps.disabled ?? false;

  const textRef: RefObject<HTMLElement | null> = { current: null };
  const listItem = useCompositeListItem({
    guess: true,
    label: () => componentProps.label,
    textRef,
  });

  const store = useSelectRootContext();
  const itemProps = store.useState('itemProps');
  const multiple = store.useState('multiple');
  const selectDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const disabled = () => selectDisabled() || disabledProp();
  const highlighted = store.useState('isActive', listItem.index);
  const open = store.useState('open');
  const selected = store.useState('isSelected', () => itemValue());
  const selectedByFocus = store.useState('isSelectedByFocus', listItem.index);
  const isItemEqualToValue = store.useState('isItemEqualToValue');

  const index = listItem.index;

  let itemElement: HTMLElement | null = null;

  useIsoLayoutEffect(
    ([currentIndex, currentItemValue]) => {
      const values = store.context.valuesRef.current;
      values[currentIndex] = currentItemValue;

      return () => {
        delete values[currentIndex];
      };
    },
    () => [index(), itemValue()],
  );

  useIsoLayoutEffect(
    ([currentIndex, isMultiple, comparer, currentItemValue]) => {
      const selectedValue = store.state.value;

      const currentSelectedIndex = store.state.selectedIndex;
      let nextIndex = currentSelectedIndex;
      let claims: boolean;
      if (isMultiple && Array.isArray(selectedValue)) {
        // The claiming item also owns the text ref that aligns the popup.
        nextIndex = resolveSelectedIndex(
          currentIndex,
          currentItemValue,
          store.context.valuesRef.current,
          selectedValue,
          comparer,
          currentSelectedIndex,
        );
        claims = nextIndex === currentIndex;
        if (currentIndex === currentSelectedIndex && !claims) {
          store.context.selectedItemTextRef.current = null;
        }
      } else {
        claims =
          selectedValue !== undefined &&
          compareItemEquality(currentItemValue, selectedValue, comparer);
        if (claims) {
          nextIndex = currentIndex;
        } else if (
          textRef.current &&
          store.context.selectedItemTextRef.current === textRef.current
        ) {
          // Port note: upstream's root `syncSelectedIndex` effect clears the ref when the value no
          // longer matches any item, after the items' layout effects updated `valuesRef`. Solid
          // runs the root's effect before the items', so an item whose new value no longer claims
          // the selection releases the text ref it owned.
          store.context.selectedItemTextRef.current = null;
        }
      }
      store.set('selectedIndex', nextIndex);

      // Make sure SelectPopup can measure the selected item on first open.
      // SelectItemText can still update this ref later when focus moves.
      if (claims && textRef.current) {
        store.context.selectedItemTextRef.current = textRef.current;
      }
    },
    () => [index(), multiple(), isItemEqualToValue(), itemValue()] as const,
  );

  let pointerType: 'mouse' | 'touch' | 'pen' = 'mouse';
  let allowMouseSelection = false;

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled: () => true,
    native: () => componentProps.nativeButton ?? false,
    composite: () => true,
  });

  const state = createMemo<SelectItemState>(() => ({
    disabled: disabled(),
    selected: selected(),
    highlighted: highlighted(),
  }));

  function commitSelection(event: MouseEvent | KeyboardEvent | PointerEvent) {
    // A forced-open select (`open`/`defaultOpen`) can still receive item activations even
    // when the root is disabled or read-only, so guard the commit here too.
    if (untrack(selectDisabled) || untrack(readOnly)) {
      return;
    }

    const selectedValue = store.state.value;
    const currentItemValue = untrack(itemValue);
    if (untrack(multiple)) {
      const currentValue = Array.isArray(selectedValue) ? selectedValue : [];
      const nextValue = untrack(selected)
        ? removeItem(currentValue, currentItemValue, untrack(isItemEqualToValue))
        : [...currentValue, currentItemValue];
      store.context.setValue(nextValue, createChangeEventDetails(REASONS.itemPress, event));
    } else {
      store.context.setValue(currentItemValue, createChangeEventDetails(REASONS.itemPress, event));
      store.context.setOpen(false, createChangeEventDetails(REASONS.itemPress, event));
    }
  }

  function resetDragMovement() {
    store.context.selectionRef.current.dragY = 0;
  }

  const handlers = {
    onKeyDown(event: BaseUIEvent<KeyboardEvent>) {
      store.set('activeIndex', untrack(index));

      if (event.key === ' ' && store.context.typingRef.current) {
        // `useButton` skips Space activation for `role="option"` items when the keydown
        // is `defaultPrevented`, keeping typeahead spaces from committing a selection.
        event.preventDefault();
      }
    },
    onClick(event: MouseEvent) {
      const isMouseClick = pointerType !== 'touch';
      const clickPointerType = (event as PointerEvent).pointerType;
      const isVirtualMouseClick =
        isMouseClick &&
        isVirtualClick(event) &&
        // Generic no-pointer `detail === 0` clicks stay tied to highlight state. Virtual
        // clicks that carry browser pointer data, including an empty string from assistive
        // technology, can activate unhighlighted items.
        (clickPointerType !== undefined || untrack(highlighted));
      // With alignItemWithTrigger, opening can place an item under the cursor. Real mouse
      // clicks must start on the item, while virtual clicks represent explicit keyboard or
      // assistive technology activation.
      const isInvalidMouseClick = isMouseClick && !isVirtualMouseClick && !allowMouseSelection;

      allowMouseSelection = false;

      if (untrack(disabled) || isInvalidMouseClick) {
        return;
      }

      commitSelection(event);
    },
    onPointerEnter(event: PointerEvent) {
      pointerType = event.pointerType as typeof pointerType;
    },
    onPointerMove(event: PointerEvent) {
      if (event.pointerType === 'mouse' && event.buttons === 1) {
        const selection = store.context.selectionRef.current;
        selection.dragY += event.movementY;

        if (selection.dragY ** 2 >= 64) {
          selection.allowUnselectedMouseUp = true;
        }
      }
    },
    onPointerDown(event: PointerEvent) {
      pointerType = event.pointerType as typeof pointerType;
      allowMouseSelection = true;
      resetDragMovement();
    },
    onMouseUp() {
      resetDragMovement();

      if (untrack(disabled) || pointerType === 'touch') {
        return;
      }

      // Regular clicks are committed by the click event.
      if (allowMouseSelection) {
        return;
      }

      const isSelected = untrack(selected);
      const disallowSelectedMouseUp =
        !store.context.selectionRef.current.allowSelectedMouseUp && isSelected;
      const disallowUnselectedMouseUp =
        !store.context.selectionRef.current.allowUnselectedMouseUp && !isSelected;

      if (disallowSelectedMouseUp || disallowUnselectedMouseUp) {
        return;
      }

      allowMouseSelection = true;
      itemElement?.click();
      allowMouseSelection = false;
    },
  };

  const defaultProps = (): Record<string, any> => ({
    role: 'option',
    'aria-selected': selected(),
    tabindex: open() && highlighted() ? 0 : -1,
    ...handlers,
  });

  const contextValue: SelectItemContext = {
    selected,
    index,
    textRef,
    selectedByFocus,
  };

  return (
    <SelectItemContext value={contextValue}>
      {useRenderElement('div', componentProps, {
        ref: [
          buttonRef,
          listItem.ref,
          (element: HTMLElement | null) => {
            if (itemElement) {
              store.context.itemValues.delete(itemElement);
            }
            itemElement = element;
            if (element) {
              store.context.itemValues.set(element, itemValue);
            }
          },
        ],
        state,
        props: () => [itemProps(), defaultProps(), elementProps, getButtonProps],
      })}
    </SelectItemContext>
  );
}

export interface SelectItemState {
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

export interface SelectItemProps
  extends NonNativeButtonProps, Omit<BaseUIComponentProps<'div', SelectItemState>, 'id'> {
  children?: JSX.Element | undefined;
  /**
   * A unique value that identifies this select item.
   * @default null
   */
  value?: any;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Specifies the text label to use when the item is matched during keyboard text navigation.
   *
   * Defaults to the item text content if not provided.
   */
  label?: string | undefined;
}

export namespace SelectItem {
  export type State = SelectItemState;
  export type Props = SelectItemProps;
}
