import { createMemo, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useButton } from '../../internals/use-button';
import { isTouchLikePointerType, usePressAndHold } from '../../internals/usePressAndHold';
import { parseNumber } from '../utils/parse';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '../../internals/createBaseUIEventDetails';
import type { EventWithOptionalKeyState } from '../utils/types';
import type { NumberFieldRoot, NumberFieldRootState } from './NumberFieldRoot';
import { REASONS } from '../../internals/reasons';
import { useNumberFieldRootContext } from './NumberFieldRootContext';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';

const SELECT_NONE_STYLE = {
  '-webkit-user-select': 'none',
  'user-select': 'none',
};

type StepperButtonProps = NativeButtonProps & BaseUIComponentProps<'button', NumberFieldRootState>;

/**
 * Shared implementation for the increment and decrement stepper buttons. They differ only in the
 * direction they step and the boundary (`max` vs `min`) at which they become disabled.
 */
export function useNumberFieldStepperButton(
  componentProps: StepperButtonProps,
  isIncrement: boolean,
): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'disabled', 'nativeButton', 'style');

  const nativeButton = () => componentProps.nativeButton ?? true;

  const {
    allowInputSyncRef,
    formatOptionsRef,
    getStepAmount,
    id,
    incrementValue,
    inputRef,
    focusInput,
    maxWithDefault,
    minWithDefault,
    setValue,
    state,
    valueRef,
    locale,
    lastChangedValueRef,
    onValueCommitted,
  } = useNumberFieldRootContext();
  const contextDisabled = () => state().disabled;
  const readOnly = () => state().readOnly;

  const isAtBoundary = () => {
    const value = state().value;
    return value != null && (isIncrement ? value >= maxWithDefault() : value <= minWithDefault());
  };
  const disabled = () => (componentProps.disabled ?? false) || contextDisabled() || isAtBoundary();

  const pressReason: NumberFieldRoot.ChangeEventReason = isIncrement
    ? REASONS.incrementPress
    : REASONS.decrementPress;

  function commitValue(nativeEvent: MouseEvent) {
    const shouldCommitInputValue = !allowInputSyncRef.current;
    allowInputSyncRef.current = true;

    if (!shouldCommitInputValue) {
      // The input is already synced, so step from the authoritative numeric value rather than
      // re-parsing the rounded display text. Refresh the commit ref to the current value so a
      // subsequent canceled step can't commit a stale `lastChangedValueRef` left over from an
      // earlier change (the `setValue` that used to refresh it is now skipped on this path).
      lastChangedValueRef.current = valueRef.current;
      return;
    }

    // The input is dirty but not yet blurred, so the value won't have been committed.
    const parsedValue = parseNumber(
      untrack(state).inputValue,
      untrack(locale),
      formatOptionsRef.current,
    );

    if (parsedValue !== null) {
      // Sync the dirty typed value with no direction so it isn't directionally snapped
      // (`snapOnStep`) before the real increment/decrement runs, which would otherwise emit a
      // spurious intermediate value.
      const details = createChangeEventDetails(pressReason, nativeEvent);
      setValue(parsedValue, details);

      // Only sync the ref base when the commit wasn't canceled, so a subsequent increment in the
      // same interaction steps from the value actually applied.
      if (!details.isCanceled) {
        valueRef.current = parsedValue;
      }
    }
  }

  const { pointerHandlers, shouldSkipClick } = usePressAndHold({
    disabled: () => disabled() || readOnly(),
    elementRef: inputRef,
    tick(triggerEvent) {
      const amount = getStepAmount(triggerEvent as EventWithOptionalKeyState);
      return incrementValue(amount, {
        direction: isIncrement ? 1 : -1,
        event: triggerEvent,
        reason: pressReason,
      });
    },
    onStop(nativeEvent: PointerEvent) {
      // `onStop` fires on every release; fall back to the current value when no tick changed it.
      // Step interactions never commit `null`, so the `??` can't mask a legitimate null commit.
      const committed = lastChangedValueRef.current ?? valueRef.current;
      onValueCommitted(committed, createGenericEventDetails(pressReason, nativeEvent));
    },
  });

  const props = () => ({
    disabled: disabled(),
    'aria-label': isIncrement ? 'Increase' : 'Decrease',
    'aria-controls': id(),
    // Keyboard users shouldn't have access to the buttons, since they can use the input element
    // to change the value. On the other hand, `aria-hidden` is not applied because touch screen
    // readers should be able to use the buttons.
    tabindex: -1,
    style: SELECT_NONE_STYLE,
    ...pointerHandlers,
    onClick(event: MouseEvent) {
      const isDisabled = untrack(disabled) || untrack(readOnly);
      if (event.defaultPrevented || isDisabled || shouldSkipClick(event)) {
        return;
      }

      commitValue(event);

      const amount = getStepAmount(event);

      const prev = valueRef.current;

      incrementValue(amount, {
        direction: isIncrement ? 1 : -1,
        event,
        reason: pressReason,
      });

      const committed = lastChangedValueRef.current ?? valueRef.current;
      if (committed !== prev) {
        onValueCommitted(committed, createGenericEventDetails(pressReason, event));
      }
    },
    onPointerDown(event: PointerEvent) {
      if (event.defaultPrevented || untrack(readOnly) || event.button || untrack(disabled)) {
        return;
      }

      // Sync dirty input value before starting the hold sequence.
      commitValue(event);
      // Treat `lastChangedValueRef` as a per-hold result slot. If the first tick is a no-op or is
      // canceled, `onStop` should fall back to the current value, not a previous interaction.
      lastChangedValueRef.current = null;

      if (!isTouchLikePointerType(event.pointerType)) {
        // Focus the input so the user can continue with keyboard interactions.
        focusInput();
      }

      pointerHandlers.onPointerDown(event);
    },
  });

  const { getButtonProps, buttonRef } = useButton({
    // Read-only steppers are exposed as unavailable through button disabled semantics, while
    // `data-readonly` (from `state`) is preserved for styling. `aria-readonly` isn't valid on the
    // `button` role, so it's intentionally not set.
    disabled: () => disabled() || readOnly(),
    native: nativeButton,
    focusableWhenDisabled: () => true,
  });

  const buttonState = createMemo<NumberFieldRootState>(
    () => ({
      ...state(),
      disabled: disabled(),
    }),
    { equals: fastObjectShallowCompare },
  );

  return useRenderElement('button', componentProps, {
    ref: buttonRef,
    state: buttonState,
    props: () => [props(), elementProps, getButtonProps],
    stateAttributesMapping,
  });
}
