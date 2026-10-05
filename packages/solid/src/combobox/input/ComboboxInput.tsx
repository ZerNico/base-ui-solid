import {
  createMemo,
  createRenderEffect,
  createSignal,
  flush,
  isHydrating,
  omit,
  Show,
  untrack,
} from 'solid-js';
import { isServer } from '@solidjs/web';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { platform } from '@base-ui-solid/utils/platform';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useRenderElement } from '../../internals/useRenderElement';
import { useComboboxInputValueContext, useComboboxRootContext } from '../root/ComboboxRootContext';
import { triggerStateAttributesMapping } from '../utils/stateAttributesMapping';
import type { FieldRootState } from '../../field/root/FieldRoot';
import {
  DEFAULT_FIELD_ROOT_CONTEXT,
  FieldRootContext,
  useFieldRootContext,
} from '../../internals/field-root-context/FieldRootContext';
import { useSetFieldFocused } from '../../internals/field-root-context/useSetFieldFocused';
import { DEFAULT_FIELD_STATE_ATTRIBUTES } from '../../internals/field-constants/constants';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { useComboboxChipsContext } from '../chips/ComboboxChipsContext';
import { stopEvent } from '../../floating-ui-solid/utils';
import { useComboboxPositionerContext } from '../positioner/ComboboxPositionerContext';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { getHighlightReason } from '../../utils/getHighlightReason';
import type { Side } from '../../internals/useAnchorPositioning';
import { useDirection } from '../../internals/direction-context/DirectionContext';
import { ComboboxInternalDismissButton } from '../utils/ComboboxInternalDismissButton';
import {
  clickHighlightedItem,
  getChipNavigationKeys,
  getIndexAfterChipRemoval,
  useListEmpty,
  usePopupSide,
} from '../utils/parts';

/**
 * A text input to search for items in the list.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui-solid.pages.dev/solid/components/combobox)
 */
export function ComboboxInput(componentProps: ComboboxInput.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'disabled', 'id', 'style');

  const fieldRootContext = useFieldRootContext();
  const {
    state: fieldState,
    disabled: fieldDisabled,
    setTouched,
    validationMode,
    validation,
  } = fieldRootContext;
  const { labelId: fieldLabelId } = useLabelableContext();
  const comboboxChipsContext = useComboboxChipsContext();
  const positioning = useComboboxPositionerContext(true);
  const hasPositionerParent = Boolean(positioning);
  const store = useComboboxRootContext();
  // `inputValue` can't be placed in the store.
  // https://github.com/mui/base-ui/issues/2703
  const inputValue = useComboboxInputValueContext();
  const direction = useDirection();

  const required = store.useState('required');
  const comboboxDisabled = store.useState('disabled');
  const readOnly = store.useState('readOnly');
  const name = store.useState('name');
  const form = store.useState('form');
  const selectionMode = store.useState('selectionMode');
  const autoHighlightMode = store.useState('autoHighlight');
  const inputProps = store.useState('inputProps');
  const triggerProps = store.useState('triggerProps');
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const selectedValue = store.useState('selectedValue');
  const rootId = store.useState('id');
  const inline = store.useState('inline');
  const modal = store.useState('modal');

  const autoHighlightEnabled = () => Boolean(autoHighlightMode());
  const popupSide = usePopupSide(store);
  const disabled = createMemo(
    () => (fieldDisabled() ?? false) || comboboxDisabled() || (componentProps.disabled ?? false),
  );
  const listEmpty = useListEmpty();

  const setFocused = useSetFieldFocused(disabled, () => store.context.inputRef.current);

  const isInsidePopup = () => hasPositionerParent || inline();
  const focusManagerModal = () => !isInsidePopup() || modal();
  const generatedId = useBaseUiId();
  const id = () =>
    (componentProps.id || undefined) ?? (!isInsidePopup() ? rootId() : undefined) ?? generatedId;
  const fieldStateForInput = () =>
    hasPositionerParent ? DEFAULT_FIELD_STATE_ATTRIBUTES : fieldState();

  const [composingValue, setComposingValue] = createSignal<string | null>(null);
  let isComposingRef = false;
  let lastActiveIndexRef: number | null = null;

  // Restore the saved highlight on refocus only within the same open cycle.
  useIsoLayoutEffect(
    ([openValue]) => {
      if (!openValue) {
        lastActiveIndexRef = null;
      }
    },
    () => [open()],
  );

  const inputOwnsFormValue = () => selectionMode() === 'none' && !hasPositionerParent;

  let inputElement: HTMLInputElement | null = null;

  const setInputElement = (element: HTMLInputElement | null) => {
    inputElement = element;
    const nextIsInsidePopup = hasPositionerParent || store.state.inline;

    if (nextIsInsidePopup && !store.state.hasInputValue) {
      store.context.setInputValue('', createChangeEventDetails(REASONS.none));
    }

    // Port note: React attaches refs after hydration, so its state update re-renders the
    // server markup. Solid runs refs while hydrating, where attribute writes are skipped: a
    // change here would leave the server-rendered trigger attributes in place. Defer it instead.
    if (element && nextIsInsidePopup !== store.state.inputInsidePopup && isHydrating()) {
      store.update({ inputElement: element, inputOwnsFormValue: untrack(inputOwnsFormValue) });
      queueMicrotask(() => {
        if (inputElement === element) {
          store.set('inputInsidePopup', nextIsInsidePopup);
        }
      });
      return;
    }

    store.update({
      inputElement: element,
      inputInsidePopup: nextIsInsidePopup,
      inputOwnsFormValue: untrack(inputOwnsFormValue),
    });
  };

  const validationProps = () =>
    hasPositionerParent
      ? elementProps
      : validation.getValidationProps(disabled(), elementProps as HTMLProps);

  function clearHighlight(event: Event) {
    store.context.setIndices({
      activeIndex: null,
      selectedIndex: null,
      type: getHighlightReason(event),
      event,
    });
  }

  const state = createMemo<ComboboxInputState>(() => ({
    ...fieldStateForInput(),
    open: open(),
    disabled: disabled(),
    readOnly: readOnly(),
    popupSide: popupSide(),
    listEmpty: listEmpty(),
  }));

  function handleKeyDown(event: KeyboardEvent) {
    if (!comboboxChipsContext) {
      return undefined;
    }

    let nextIndex: number | undefined;

    const highlightedChipIndex = untrack(comboboxChipsContext.highlightedChipIndex);
    const renderedChipsCount = comboboxChipsContext.chipsRef.current.length;
    const [previousChipKey, nextChipKey] = getChipNavigationKeys(untrack(direction));
    const currentSelectedValue = untrack(selectedValue);

    if (highlightedChipIndex !== undefined) {
      if (event.key === previousChipKey) {
        event.preventDefault();
        if (highlightedChipIndex > 0) {
          nextIndex = highlightedChipIndex - 1;
        } else {
          nextIndex = undefined;
        }
      } else if (event.key === nextChipKey) {
        event.preventDefault();
        if (highlightedChipIndex < renderedChipsCount - 1) {
          nextIndex = highlightedChipIndex + 1;
        } else {
          nextIndex = undefined;
        }
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        // Move highlight appropriately after removal.
        nextIndex = getIndexAfterChipRemoval(highlightedChipIndex, currentSelectedValue.length);
        clearHighlight(event);
      }
      return nextIndex;
    }

    // Handle navigation when no chip is highlighted
    if (
      event.key === previousChipKey &&
      ((event.currentTarget as HTMLInputElement).selectionStart ?? 0) === 0 &&
      currentSelectedValue.length > 0
    ) {
      event.preventDefault();
      nextIndex = renderedChipsCount > 0 ? renderedChipsCount - 1 : undefined;
    }

    return nextIndex;
  }

  const renderedValue = () => {
    const value = composingValue() ?? inputValue();
    return value == null ? '' : String(value);
  };

  // Port note: Solid re-assigns an input's `value` property whenever any spread prop changes, even
  // when the value is unchanged, and programmatic writes can move the caret. React only writes a
  // controlled value that differs from the DOM, so the DOM value is synced here when it differs
  // instead of being passed as a client-side prop.
  createRenderEffect(renderedValue, (nextValue) => {
    if (inputElement && inputElement.value !== nextValue) {
      inputElement.value = nextValue;
    }
  });

  function restoreRenderedValue(input: HTMLInputElement) {
    // Port note: React restores a controlled input's value when the state doesn't follow the
    // change. Solid doesn't, so restore it once the update has been applied.
    flush();
    const currentRenderedValue = untrack(renderedValue);
    if (input.value !== currentRenderedValue) {
      input.value = currentRenderedValue;
    }
  }

  const renderInput = () =>
    useRenderElement('input', componentProps, {
      state,
      ref: [
        (node: HTMLInputElement | null) => {
          store.context.inputRef.current = node;
        },
        setInputElement,
        (node: HTMLInputElement | null) => {
          if (node) {
            const currentRenderedValue = untrack(renderedValue);
            if (node.value !== currentRenderedValue) {
              node.value = currentRenderedValue;
            }
          }
        },
      ],
      props: () => [
        inputProps(),
        triggerProps(),
        {
          // The server markup still renders the value (see the Port note on the value sync above).
          ...(isServer ? { value: renderedValue() } : EMPTY_OBJECT),
          'aria-readonly': readOnly() || undefined,
          'aria-required': required() || undefined,
          'aria-labelledby': fieldLabelId(),
          disabled: disabled(),
          readonly: readOnly(),
          required: selectionMode() === 'none' ? required() : undefined,
          form: form(),
          ...(inputOwnsFormValue() && name() && { name: name() }),
          id: id(),
          // Port note: React's `onFocus`/`onBlur` bubble, so they're `onFocusIn`/`onFocusOut` here.
          onFocusIn() {
            setFocused(true);

            if (!untrack(inline)) {
              return;
            }

            const nextActiveIndex = lastActiveIndexRef;
            lastActiveIndexRef = null;

            if (
              nextActiveIndex == null ||
              // `valuesRef` can be sparse, so guard against restoring a removed slot.
              !Object.hasOwn(store.context.valuesRef.current, nextActiveIndex)
            ) {
              return;
            }

            store.context.setIndices({ activeIndex: nextActiveIndex });
          },
          onFocusOut() {
            setTouched(true);
            setFocused(false);

            const activeIndex = store.state.activeIndex;
            if (
              untrack(inline) &&
              activeIndex !== null &&
              untrack(autoHighlightMode) !== 'always'
            ) {
              lastActiveIndexRef = activeIndex;
              store.context.setIndices({ activeIndex: null });
            }

            if (untrack(validationMode) === 'onBlur') {
              const valueToValidate =
                untrack(selectionMode) === 'none' ? untrack(inputValue) : untrack(selectedValue);
              validation.commit(valueToValidate);
            }
          },
          onCompositionStart(event: CompositionEvent) {
            if (platform.os.android) {
              return;
            }
            isComposingRef = true;
            setComposingValue((event.currentTarget as HTMLInputElement).value);
          },
          onCompositionEnd(event: CompositionEvent) {
            isComposingRef = false;
            const next = (event.currentTarget as HTMLInputElement).value;
            setComposingValue(null);
            store.context.setInputValue(next, createChangeEventDetails(REASONS.inputChange, event));
          },
          // Port note: React's `onChange` on text inputs is the native `input` event.
          onInput(event: InputEvent) {
            const input = event.currentTarget as HTMLInputElement;
            const nativeEvent = event;
            // Autofill may not provide `inputType` (Chrome) or may report
            // `insertReplacementText` (Firefox).
            const inputType = nativeEvent.inputType;
            const autofillLikeInput = !inputType || inputType === 'insertReplacementText';
            // During composition the input is always considered typed into.
            const shouldOpenOnInput = isComposingRef || !autofillLikeInput;
            const isOpen = untrack(open);

            function maybeOpenOnInput(trimmed: string) {
              if (untrack(readOnly) || untrack(disabled) || !trimmed || !shouldOpenOnInput) {
                return;
              }

              store.context.setOpen(
                true,
                createChangeEventDetails(REASONS.inputChange, nativeEvent),
              );
              // When autoHighlight is enabled, keep the highlight (will be set to 0 in root).
              if (!untrack(autoHighlightEnabled)) {
                clearHighlight(nativeEvent);
              }
            }

            // During IME composition, avoid propagating controlled updates to prevent
            // filtering the options prematurely so `Empty` won't show incorrectly.
            // We can't rely on this check for Android due to how it handles composition
            // events with some keyboards (e.g. Samsung keyboard with predictive text on
            // treats all text as always-composing).
            // https://github.com/mui/base-ui/issues/2942
            if (isComposingRef) {
              const nextVal = input.value;
              setComposingValue(nextVal);

              if (
                nextVal === '' &&
                !store.state.openOnInputClick &&
                !store.state.inputInsidePopup
              ) {
                store.context.setOpen(
                  false,
                  createChangeEventDetails(REASONS.inputClear, nativeEvent),
                );
              }

              const trimmed = nextVal.trim();
              const shouldMaintainHighlight = untrack(autoHighlightEnabled) && trimmed !== '';

              maybeOpenOnInput(trimmed);

              if (isOpen && store.state.activeIndex !== null && !shouldMaintainHighlight) {
                clearHighlight(nativeEvent);
              }

              return;
            }

            const inputChangeDetails = createChangeEventDetails(REASONS.inputChange, nativeEvent);
            store.context.setInputValue(input.value, inputChangeDetails);

            if (inputChangeDetails.isCanceled) {
              restoreRenderedValue(input);
              return;
            }

            const empty = input.value === '';
            const clearDetails = createChangeEventDetails(REASONS.inputClear, nativeEvent);

            if (empty && !store.state.inputInsidePopup) {
              if (untrack(selectionMode) === 'single') {
                store.context.setSelectedValue(null, clearDetails);
              }

              if (!store.state.openOnInputClick) {
                store.context.setOpen(false, clearDetails);
              }
            }

            maybeOpenOnInput(input.value.trim());

            // When the user types, ensure the list resets its highlight so that
            // virtual focus returns to the input (aria-activedescendant is
            // cleared).
            if (isOpen && store.state.activeIndex !== null && !untrack(autoHighlightEnabled)) {
              clearHighlight(nativeEvent);
            }

            restoreRenderedValue(input);
          },
          onKeyDown(event: KeyboardEvent) {
            if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
              return;
            }

            const isOpen = untrack(open);

            if (untrack(disabled) || untrack(readOnly)) {
              // Browsing can highlight an item, and Enter there must not submit the form.
              if (
                untrack(readOnly) &&
                event.key === 'Enter' &&
                isOpen &&
                store.state.activeIndex !== null
              ) {
                stopEvent(event);
              }
              return;
            }

            const input = event.currentTarget as HTMLInputElement;
            const scrollAmount = input.scrollWidth - input.clientWidth;
            const isRTL = untrack(direction) === 'rtl';

            if (event.key === 'Home') {
              stopEvent(event);
              const cursor = platform.engine.gecko && isRTL ? input.value.length : 0;
              input.setSelectionRange(cursor, cursor);
              input.scrollLeft = 0;
              return;
            }

            if (event.key === 'End') {
              stopEvent(event);
              const cursor = platform.engine.gecko && isRTL ? 0 : input.value.length;
              input.setSelectionRange(cursor, cursor);
              input.scrollLeft = isRTL ? -scrollAmount : scrollAmount;
              return;
            }

            const currentSelectedValue = untrack(selectedValue);
            const currentSelectionMode = untrack(selectionMode);

            if (!untrack(mounted) && event.key === 'Escape') {
              const isClear =
                currentSelectionMode === 'multiple' && Array.isArray(currentSelectedValue)
                  ? currentSelectedValue.length === 0
                  : currentSelectedValue === null;

              const details = createChangeEventDetails(REASONS.escapeKey, event);
              const value = currentSelectionMode === 'multiple' ? [] : null;
              store.context.setInputValue('', details);
              store.context.setSelectedValue(value, details);

              if (!isClear && !store.state.inline && !details.isPropagationAllowed) {
                event.stopPropagation();
              }

              return;
            }

            // Handle deletion when no chip is highlighted and the input is empty.
            if (
              comboboxChipsContext &&
              event.key === 'Backspace' &&
              input.value === '' &&
              untrack(comboboxChipsContext.highlightedChipIndex) === undefined &&
              Array.isArray(currentSelectedValue) &&
              currentSelectedValue.length > 0
            ) {
              const renderedChipsCount = comboboxChipsContext.chipsRef.current.length;
              const removalIndex =
                renderedChipsCount > 0 ? renderedChipsCount - 1 : currentSelectedValue.length - 1;

              const newValue = currentSelectedValue.filter(
                (_: any, index: number) => index !== removalIndex,
              );
              // If the removed item was also the active (highlighted) item, clear highlight
              clearHighlight(event);
              store.context.setSelectedValue(
                newValue,
                createChangeEventDetails(REASONS.none, event),
              );
              return;
            }

            const hadHighlightedChip =
              comboboxChipsContext !== undefined &&
              untrack(comboboxChipsContext.highlightedChipIndex) !== undefined;
            const nextIndex = handleKeyDown(event);

            comboboxChipsContext?.setHighlightedChipIndex(nextIndex);

            if (nextIndex !== undefined) {
              comboboxChipsContext?.chipsRef.current[nextIndex]?.focus();
            } else if (hadHighlightedChip) {
              store.context.inputRef.current?.focus();
            }

            // event.isComposing
            if (event.which === 229) {
              return;
            }

            if (event.key === 'Enter' && isOpen) {
              const activeIndex = store.state.activeIndex;

              if (activeIndex === null) {
                if (untrack(inline)) {
                  return;
                }

                // Allow form submission when no item is highlighted.
                store.context.setOpen(false, createChangeEventDetails(REASONS.none, event));
                return;
              }

              stopEvent(event);
              clickHighlightedItem(store, activeIndex, event);
            }
          },
        },
        validationProps(),
      ],
      stateAttributesMapping: triggerStateAttributesMapping,
    });

  const renderedInput = hasPositionerParent ? (
    // Port note: create a custom render component under the field-reset provider.
    <FieldRootContext value={DEFAULT_FIELD_ROOT_CONTEXT}>{renderInput()}</FieldRootContext>
  ) : (
    renderInput()
  );

  return (
    <>
      <Show when={open() && focusManagerModal()}>
        <ComboboxInternalDismissButton
          ref={(node: HTMLSpanElement | null) => {
            store.context.startDismissRef.current = node;
          }}
        />
      </Show>
      {renderedInput}
    </>
  );
}

export interface ComboboxInputState extends FieldRootState {
  /**
   * Whether the corresponding popup is open.
   */
  open: boolean;
  /**
   * Indicates which side the corresponding popup is positioned relative to its anchor.
   */
  popupSide: Side | null;
  /**
   * Present when the corresponding items list is empty.
   */
  listEmpty: boolean;
  /**
   * Whether the component should ignore user edits.
   */
  readOnly: boolean;
}

export interface ComboboxInputProps extends BaseUIComponentProps<'input', ComboboxInputState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ComboboxInput {
  export type State = ComboboxInputState;
  export type Props = ComboboxInputProps;
}
