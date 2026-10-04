import { createSignal, createMemo, omit, untrack } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { platform } from '@base-ui-solid/utils/platform';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import {
  useFilterDropdownItemContext,
  useFilterDropdownRootContext,
  useFilterDropdownValueContext,
} from '../root/FilterDropdownRootContext';
import { refocusOwner, isRefocusingOwner } from '../utils/refocusOwner';
/**
 * @internal
 */
export function FilterDropdownInput(componentProps: FilterDropdownInputHostProps) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'id',
    'disabled',
    'activeItemId',
    'navigationProps',
  );
  // Browsers flag a form field with neither an id nor a name.
  const id = useBaseUiId();
  const context = useFilterDropdownRootContext();
  const focusOwnerRef = untrack(() => context.focusOwnerRef);
  const { listRef } = useFilterDropdownItemContext();
  const value = useFilterDropdownValueContext();
  // IME text isn't committed until the composition ends, so filtering waits for it.
  const [composingValue, setComposingValue] = createSignal<string | null>(null);
  const isComposingRef = { current: false };
  function commitValue(nextValue: string, nativeEvent: Event) {
    const reason = nextValue === '' ? REASONS.inputClear : REASONS.inputChange;
    context.onValueChange(nextValue, createChangeEventDetails(reason, nativeEvent));
  }
  const state = createMemo<FilterDropdownInputState>(() => ({
    highlighted:
      context.inputFocusVisible &&
      (!context.keyboardModality || componentProps.activeItemId == null),
  }));
  let inputElement: HTMLInputElement | null = null;
  // Port note: Solid reapplies value on spreads; write only when different to preserve the caret.
  useIsoLayoutEffect(
    () =>
      untrack(() => {
        const next = composingValue() ?? value();
        if (inputElement && inputElement.value !== next) {
          inputElement.value = next;
        }
      }),
    () => [composingValue(), value()],
  );
  return useRenderElement('input', componentProps, {
    state,
    ref: [
      (element) => {
        inputElement = element;
        focusOwnerRef.current = element;
      },
    ],
    props: () => [
      componentProps.navigationProps,
      {
        id: componentProps.id ?? id,
        type: 'text',
        disabled: context.disabled || componentProps.disabled,
        'aria-activedescendant': componentProps.activeItemId,
        role: 'searchbox',
        inputmode: 'search',
        autocomplete: 'off',
        spellcheck: 'false',
        autocorrect: 'off',
        autocapitalize: 'none',
        // The aria-autocomplete 'list' value is only valid with `aria-haspopup` so we depend
        // on the searchbox role to communicate affordance, with an input label as fallback
        // https://w3c.github.io/aria/#aria-autocomplete
        'aria-autocomplete': undefined,
        'aria-controls': context.listId,
        onCompositionStart(
          event: CompositionEvent & {
            currentTarget: HTMLInputElement;
          },
        ) {
          // Some Android keyboards treat all typing as one composition.
          if (platform.os.android) {
            return;
          }
          isComposingRef.current = true;
          setComposingValue(event.currentTarget.value);
        },
        onCompositionEnd(
          event: CompositionEvent & {
            currentTarget: HTMLInputElement;
          },
        ) {
          if (!isComposingRef.current) {
            return;
          }
          isComposingRef.current = false;
          setComposingValue(null);
          commitValue(event.currentTarget.value, event);
          queueMicrotask(() => {
            const next = composingValue() ?? value();
            if (inputElement && inputElement.value !== next) {
              inputElement.value = next;
            }
          });
        },
        onInput(
          event: InputEvent & {
            currentTarget: HTMLInputElement;
          },
        ) {
          if (isComposingRef.current) {
            setComposingValue(event.currentTarget.value);
            return;
          }
          commitValue(event.currentTarget.value, event);
          queueMicrotask(() => {
            const next = composingValue() ?? value();
            if (inputElement && inputElement.value !== next) {
              inputElement.value = next;
            }
          });
        },
        onKeyDown() {
          context.setKeyboardModality(true);
        },
        onPointerDown() {
          context.setKeyboardModality(false);
        },
        onMouseEnter(
          event: MouseEvent & {
            currentTarget: HTMLInputElement;
          },
        ) {
          context.setKeyboardModality(false);
          // Take focus so typing filters immediately.
          if (context.open) {
            refocusOwner(event.currentTarget);
          }
        },
        onFocusIn(
          event: FocusEvent & {
            currentTarget: HTMLInputElement;
          },
        ) {
          context.setInputFocusVisible(true);
          // A screen reader that followed `aria-activedescendant` put real focus on the item, so
          // focus returning from an item means the user moved back to the input on purpose and
          // the highlight no longer reflects where they are. The list's own key replay and
          // pointer refocus also pass through here and keep it.
          if (context.autoHighlight === 'always' || isRefocusingOwner()) {
            return;
          }
          const from = event.relatedTarget as HTMLElement | null;
          if (from !== null && listRef.current.includes(from)) {
            context.setActiveIndex(null);
          }
        },
        onFocusOut() {
          context.setInputFocusVisible(false);
        },
      },
      elementProps,
    ],
  });
}
export interface FilterDropdownInputState {
  /**
   * Whether the input shows its focus ring.
   * Cleared when keyboard navigation highlights an item.
   */
  highlighted: boolean;
}
export interface FilterDropdownInputProps extends BaseUIComponentProps<
  'input',
  FilterDropdownInputState
> {}
interface FilterDropdownInputHostProps extends FilterDropdownInputProps {
  /**
   * The id of the item the host highlights, which the input points at while it holds focus.
   */
  activeItemId?: string | undefined;
  /**
   * The host's list navigation props. The host routes key presses itself, so these exclude a
   * key handler.
   */
  navigationProps?: HTMLProps | undefined;
}
export namespace FilterDropdownInput {
  export type Props = FilterDropdownInputProps;
  export type State = FilterDropdownInputState;
}
