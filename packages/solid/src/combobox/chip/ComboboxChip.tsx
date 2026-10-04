import { createMemo, flush, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import { useComboboxChipsContext } from '../chips/ComboboxChipsContext';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import { ComboboxChipContext } from './ComboboxChipContext';
import { stopEvent } from '../../floating-ui-react/utils';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useDirection } from '../../internals/direction-context/DirectionContext';
import { getChipNavigationKeys, getIndexAfterChipRemoval } from '../utils/parts';

/**
 * An individual chip that represents a value in a multiselectable input.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxChip(componentProps: ComboboxChip.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = useComboboxRootContext();
  const { setHighlightedChipIndex, chipsRef } = useComboboxChipsContext()!;
  const direction = useDirection();

  const disabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const selectedValue = store.useState('selectedValue');

  const { ref, index } = useCompositeListItem();

  function handleKeyDown(event: KeyboardEvent) {
    const currentIndex = untrack(index);
    const currentSelectedValue = untrack(selectedValue);
    let nextIndex: number | undefined = currentIndex;
    const [previousChipKey, nextChipKey] = getChipNavigationKeys(untrack(direction));

    if (event.key === previousChipKey) {
      event.preventDefault();
      if (currentIndex > 0) {
        nextIndex = currentIndex - 1;
      } else {
        nextIndex = undefined;
      }
    } else if (event.key === nextChipKey) {
      event.preventDefault();
      if (currentIndex < chipsRef.current.length - 1) {
        nextIndex = currentIndex + 1;
      } else {
        nextIndex = undefined;
      }
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      nextIndex = getIndexAfterChipRemoval(currentIndex, currentSelectedValue.length);

      stopEvent(event);

      store.context.setIndices({
        activeIndex: null,
        selectedIndex: null,
        type: REASONS.keyboard,
        event,
      });
      store.context.setSelectedValue(
        currentSelectedValue.filter((_: any, i: number) => i !== currentIndex),
        createChangeEventDetails(REASONS.none, event),
      );
    } else if (event.key === 'Enter' || event.key === ' ') {
      stopEvent(event);
      nextIndex = undefined;
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      stopEvent(event);
      store.context.setOpen(true, createChangeEventDetails(REASONS.listNavigation, event));
      nextIndex = undefined;
    } else if (
      // Check for printable characters (letters, numbers, symbols)
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      nextIndex = undefined;
    }

    return nextIndex;
  }

  const state = createMemo<ComboboxChipState>(() => ({
    disabled: disabled(),
  }));

  const contextValue: ComboboxChipContext = {
    index,
  };

  return (
    <ComboboxChipContext value={contextValue}>
      {useRenderElement('div', componentProps, {
        ref: [ref],
        state,
        props: () => [
          {
            tabindex: -1,
            'aria-disabled': disabled() || undefined,
            'aria-readonly': readOnly() || undefined,
            onKeyDown(event: KeyboardEvent) {
              if (untrack(disabled) || untrack(readOnly)) {
                return;
              }

              const nextIndex = handleKeyDown(event);

              // Port note: counterpart of `ReactDOM.flushSync`.
              setHighlightedChipIndex(nextIndex);
              flush();

              if (nextIndex === undefined) {
                store.context.inputRef.current?.focus();
              } else {
                chipsRef.current[nextIndex]?.focus();
              }
            },
          },
          elementProps,
        ],
      })}
    </ComboboxChipContext>
  );
}

export interface ComboboxChipState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface ComboboxChipProps extends BaseUIComponentProps<'div', ComboboxChipState> {}

export namespace ComboboxChip {
  export type State = ComboboxChipState;
  export type Props = ComboboxChipProps;
}
