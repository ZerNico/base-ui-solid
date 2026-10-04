import { createMemo, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useComboboxChipContext } from '../chip/ComboboxChipContext';
import { useButton } from '../../internals/use-button';
import { stopEvent } from '../../floating-ui-react/utils';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { getHighlightReason } from '../../utils/getHighlightReason';
import { findItemIndex } from '../../internals/itemEquality';

/**
 * A button to remove a chip.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxChipRemove(componentProps: ComboboxChipRemove.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'disabled', 'nativeButton', 'style');

  const store = useComboboxRootContext();
  const { index } = useComboboxChipContext();

  const comboboxDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const selectedValue = store.useState('selectedValue');
  const isItemEqualToValue = store.useState('isItemEqualToValue');

  // `false` removes the attribute in Solid, so it counts as not provided.
  const disabled = createMemo(
    () =>
      comboboxDisabled() ||
      (componentProps.disabled !== undefined && componentProps.disabled !== false),
  );

  const { buttonRef, getButtonProps } = useButton({
    native: () => componentProps.nativeButton ?? true,
    disabled: () => disabled() || readOnly(),
    focusableWhenDisabled: () => true,
  });

  const state = createMemo<ComboboxChipRemoveState>(() => ({
    disabled: disabled(),
  }));

  function clearActiveIndexForRemovedItem(removedItem: any, event: Event) {
    const activeIndex = store.state.activeIndex;

    if (activeIndex == null) {
      return;
    }

    // Try current visible list first; if not found, it's filtered out.
    // No need to clear highlight in that case since it can't equal activeIndex.
    const removedIndex = findItemIndex(
      store.context.valuesRef.current,
      removedItem,
      untrack(isItemEqualToValue),
    );
    if (removedIndex !== -1 && activeIndex === removedIndex) {
      store.context.setIndices({
        activeIndex: null,
        type: getHighlightReason(event),
        event,
      });
    }
  }

  function removeChip(event: MouseEvent | KeyboardEvent) {
    const eventDetails = createChangeEventDetails(REASONS.chipRemovePress, event);
    const currentSelectedValue = untrack(selectedValue);
    const currentIndex = untrack(index);
    const removedItem = currentSelectedValue[currentIndex];

    clearActiveIndexForRemovedItem(removedItem, event);

    store.context.setSelectedValue(
      currentSelectedValue.filter((_: any, i: number) => i !== currentIndex),
      eventDetails,
    );

    store.context.inputRef.current?.focus();
    return eventDetails;
  }

  return useRenderElement('button', componentProps, {
    ref: [buttonRef],
    state,
    props: () => [
      {
        tabindex: -1,
        onMouseDown(event: MouseEvent) {
          event.preventDefault();
        },
        onClick(event: MouseEvent) {
          const eventDetails = removeChip(event);
          if (!eventDetails.isPropagationAllowed) {
            event.stopPropagation();
          }
        },
        onKeyDown(event: KeyboardEvent) {
          if (event.key === 'Enter' || event.key === ' ') {
            const eventDetails = removeChip(event);
            if (!eventDetails.isPropagationAllowed) {
              stopEvent(event);
            }
          }
        },
      },
      elementProps,
      getButtonProps,
    ],
  });
}

export interface ComboboxChipRemoveState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface ComboboxChipRemoveProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ComboboxChipRemoveState> {}

export namespace ComboboxChipRemove {
  export type State = ComboboxChipRemoveState;
  export type Props = ComboboxChipRemoveProps;
}
