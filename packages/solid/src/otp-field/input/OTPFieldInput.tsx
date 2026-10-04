import { createMemo, createRenderEffect, createSignal, flush, omit, untrack } from 'solid-js';
import { isServer } from '@solidjs/web';
import type { JSX } from '@solidjs/web';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { warn } from '@base-ui-solid/utils/warn';
import { platform } from '@base-ui-solid/utils/platform';
import { stopEvent } from '../../floating-ui-react/utils';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import type { BaseUIComponentProps } from '../../internals/types';
import { useDirection } from '../../internals/direction-context/DirectionContext';
import { useSetFieldFocused } from '../../internals/field-root-context/useSetFieldFocused';
import { useRenderElement } from '../../internals/useRenderElement';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useOTPFieldRootContext, getOTPFieldInputState } from '../root/OTPFieldRootContext';
import type { OTPFieldRootState } from '../root/OTPFieldRoot';
import { inputStateAttributesMapping } from '../utils/stateAttributesMapping';
import { normalizeOTPValueWithDetails, removeOTPCharacter, replaceOTPValue } from '../utils/otp';

/**
 * An individual OTP character input.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI OTP Field](https://base-ui.com/react/components/otp-field)
 */
export function OTPFieldInput(componentProps: OTPFieldInput.Props): JSX.Element {
  const elementProps = omit(
    componentProps,
    'aria-label',
    'aria-labelledby',
    'render',
    'class',
    'style',
  );

  const {
    activeIndex,
    autoComplete,
    disabled,
    form,
    focusInput,
    queueFocusInput,
    getInputId,
    handleInputBlur,
    handleInputFocus,
    inputMode,
    inputAriaLabelledBy,
    invalid,
    length,
    mask,
    pattern,
    reportValueInvalid,
    readOnly,
    required,
    normalizeValue,
    setFocused: setRootFocused,
    setValue,
    state,
    validationType,
    value,
  } = useOTPFieldRootContext();

  const { ref: listItemRef, index } = useCompositeListItem({ guess: true });
  let inputElement: HTMLInputElement | null = null;
  const setFocused = useSetFieldFocused(disabled, () => inputElement, setRootFocused);
  const direction = useDirection();

  // While an IME composition is active, Safari exposes the in-progress text through `onChange`
  // as an accumulating string (`d`, then `dd`, then `ddd`). Committing those intermediate values
  // would treat them as bulk input and fill too many slots, so the text is only buffered here
  // and committed once on `compositionend`.
  const [composingValue, setComposingValue] = createSignal<string | null>(null);

  const slotValue = () => value()[index()] ?? '';
  const renderedValue = () => composingValue() ?? slotValue();

  // Port note: Solid re-assigns an input's `value` property whenever any spread prop changes, even
  // when the value is unchanged, and programmatic writes can move the caret (user-event does so
  // on every write). React only writes a controlled value that differs from the DOM, so the DOM
  // value is synced here when it differs instead of being passed as a client-side prop.
  createRenderEffect(renderedValue, (nextValue) => {
    if (inputElement && inputElement.value !== nextValue) {
      inputElement.value = nextValue;
    }
  });

  const inputState = createMemo(() => getOTPFieldInputState(state(), slotValue(), index()));
  const slotAriaLabel = () => componentProps['aria-label'];
  const inheritedLabel = () => componentProps['aria-labelledby'] ?? inputAriaLabelledBy();
  const ariaLabel = () => (index() === 0 ? undefined : slotAriaLabel());

  /* istanbul ignore else -- `IS_DEV` is a build-time constant under test */
  if (IS_DEV) {
    // Port note: React's `captureOwnerStack` has no Solid counterpart, so no owner stack is
    // appended.
    useEffect(
      ([currentIndex, currentSlotAriaLabel]) => {
        if (currentIndex !== 0 || currentSlotAriaLabel == null || inputElement?.labels?.length) {
          return;
        }

        warn(
          '<OTPField.Input> ignores `aria-label` on the first input. Use a `<label>` or `<Field.Label>` to label the OTP field.',
        );
      },
      () => [index(), slotAriaLabel()],
    );
  }

  function commitValue(
    rawValue: string,
    reason: typeof REASONS.inputChange | typeof REASONS.inputPaste,
    event: Event,
    input: HTMLInputElement,
  ) {
    const currentLength = untrack(length);
    const currentValue = untrack(value);
    const currentIndex = untrack(index);
    const currentSlotValue = untrack(slotValue);
    const [nextDigits, didRejectCharacters] = normalizeOTPValueWithDetails(
      rawValue,
      currentLength,
      untrack(validationType),
      untrack(normalizeValue),
    );

    if (didRejectCharacters) {
      reportValueInvalid(rawValue, createGenericEventDetails(reason, event));
    }

    if (nextDigits === '') {
      // Typed input edits the slot in place: clear it, or restore its character when every
      // typed character was rejected. An empty or fully rejected paste changes nothing.
      if (reason === REASONS.inputChange) {
        if (rawValue === '') {
          setValue(
            removeOTPCharacter(currentValue, currentIndex),
            createChangeEventDetails(REASONS.inputClear, event),
          );
        } else if (currentSlotValue !== '') {
          input.value = currentSlotValue;
          input.select();
        }
      }
      return;
    }

    const committedValue = setValue(
      replaceOTPValue(
        currentValue,
        currentIndex,
        nextDigits,
        currentLength,
        untrack(validationType),
        untrack(normalizeValue),
      ),
      createChangeEventDetails(reason, event),
    );

    if (committedValue != null) {
      queueFocusInput(
        Math.min(currentIndex + nextDigits.length, currentLength - 1),
        committedValue,
      );
    }
  }

  function handleChange(event: InputEvent, input: HTMLInputElement) {
    if (event.defaultPrevented || untrack(disabled) || untrack(readOnly)) {
      return;
    }

    if (untrack(composingValue) != null) {
      setComposingValue(input.value);
      return;
    }

    commitValue(input.value, REASONS.inputChange, event, input);
  }

  const eventHandlers = {
    onMouseDown(event: MouseEvent) {
      if (event.defaultPrevented || untrack(disabled)) {
        return;
      }

      event.preventDefault();
      focusInput(untrack(index));
    },
    onFocus(event: FocusEvent) {
      if (event.defaultPrevented || untrack(disabled)) {
        return;
      }

      setFocused(true);
      handleInputFocus(untrack(index), event);
    },
    onBlur(event: FocusEvent) {
      if (event.defaultPrevented) {
        return;
      }

      // Focus moving to a sibling slot stays inside the root; `handleInputBlur` clears the
      // focused state only when focus leaves the root, so slot-to-slot moves don't churn it.
      handleInputBlur(event);
    },
    onCompositionStart() {
      // Some Android keyboards report all text as always-composing, so Android keeps
      // committing through `onChange`.
      if (!platform.os.android) {
        setComposingValue(untrack(slotValue));
      }
    },
    onCompositionEnd(event: CompositionEvent) {
      if (untrack(composingValue) == null) {
        return;
      }

      setComposingValue(null);

      if (!untrack(disabled) && !untrack(readOnly)) {
        const input = event.currentTarget as HTMLInputElement;
        commitValue(input.value, REASONS.inputChange, event, input);
      }
    },
    // Port note: React's `onChange` on text inputs is the native `input` event.
    onInput(event: InputEvent) {
      const input = event.currentTarget as HTMLInputElement;
      handleChange(event, input);

      // Port note: React restores a controlled input's value when the slot doesn't follow the
      // change (a canceled change, a locked field, or extra characters spread to later slots).
      // Solid doesn't, so restore it once the update has been applied.
      flush();
      const currentRenderedValue = untrack(renderedValue);
      if (input.value !== currentRenderedValue) {
        input.value = currentRenderedValue;
      }
    },
    onKeyDown(event: KeyboardEvent) {
      // Browsers deliver real key names (such as `Backspace`) for keydowns inside a composition.
      // The IME owns editing until `compositionend`, so OTP commands must not run on them.
      if (event.defaultPrevented || untrack(disabled) || untrack(composingValue) != null) {
        return;
      }

      const currentIndex = untrack(index);
      const currentLength = untrack(length);
      const currentValue = untrack(value);
      const currentSlotValue = untrack(slotValue);
      const firstIndex = 0;
      const lastIndex = Math.max(currentLength - 1, firstIndex);
      const endTargetIndex = Math.min(currentValue.length, lastIndex);
      const hasBoundaryModifier = (event.ctrlKey || event.metaKey) && !event.altKey;
      const isRtl = untrack(direction) === 'rtl';
      const previousKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
      const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight';

      if (event.key === previousKey) {
        stopEvent(event);
        focusInput(hasBoundaryModifier ? firstIndex : Math.max(firstIndex, currentIndex - 1));
        return;
      }

      if (event.key === nextKey) {
        stopEvent(event);
        focusInput(hasBoundaryModifier ? endTargetIndex : Math.min(lastIndex, currentIndex + 1));
        return;
      }

      if (event.key === 'Home' || event.key === 'ArrowUp') {
        stopEvent(event);
        focusInput(firstIndex);
        return;
      }

      if (event.key === 'End' || event.key === 'ArrowDown') {
        stopEvent(event);
        focusInput(endTargetIndex);
        return;
      }

      if (untrack(readOnly)) {
        return;
      }

      function setKeyboardValue(nextValue: string, targetIndex: number) {
        const committedValue = setValue(
          nextValue,
          createChangeEventDetails(REASONS.keyboard, event),
        );

        if (committedValue != null) {
          queueFocusInput(targetIndex, committedValue);
        }
      }

      if (event.key === 'Backspace' && hasBoundaryModifier) {
        stopEvent(event);
        setKeyboardValue('', firstIndex);
        return;
      }

      if (event.key === 'Delete') {
        stopEvent(event);
        setKeyboardValue(removeOTPCharacter(currentValue, currentIndex), currentIndex);
        return;
      }

      const input = event.currentTarget as HTMLInputElement;
      const inputValue = input.value;
      const fullSelection = input.selectionStart === 0 && input.selectionEnd === inputValue.length;

      if (event.key.length === 1 && fullSelection && currentSlotValue === event.key) {
        stopEvent(event);
        if (currentIndex < currentLength - 1) {
          focusInput(currentIndex + 1);
        }
        return;
      }

      if (event.key === 'Backspace') {
        stopEvent(event);
        const targetIndex = Math.max(firstIndex, currentIndex - 1);
        const deleteIndex = currentSlotValue === '' ? targetIndex : currentIndex;
        setKeyboardValue(removeOTPCharacter(currentValue, deleteIndex), targetIndex);
      }
    },
    onPaste(event: ClipboardEvent) {
      if (event.defaultPrevented || untrack(disabled) || untrack(readOnly)) {
        return;
      }

      let rawValue = '';

      try {
        rawValue = event.clipboardData?.getData('text/plain') ?? '';
      } catch {
        /* istanbul ignore else -- `IS_DEV` is a build-time constant under test */
        if (IS_DEV) {
          warn('<OTPField.Input> could not read clipboard text during paste handling.');
        }

        return;
      }

      event.preventDefault();
      commitValue(rawValue, REASONS.inputPaste, event, event.currentTarget as HTMLInputElement);
    },
  };

  const inputProps = () => {
    const currentIndex = index();
    const currentLength = length();
    const currentAriaLabel = ariaLabel();
    const isDisabled = disabled();
    return {
      id: getInputId(currentIndex),
      // The server markup still renders the value (see the Port note on `renderedValue`).
      ...(isServer ? { value: renderedValue() } : EMPTY_OBJECT),
      type: mask() ? 'password' : 'text',
      inputmode: inputMode(),
      autocomplete: currentIndex === 0 ? autoComplete() : 'off',
      autocorrect: 'off',
      spellcheck: 'false',
      enterkeyhint: currentIndex === currentLength - 1 ? 'done' : 'next',
      // Only the first slot has a max length to avoid password manager bubbles appearing after later inputs.
      maxlength: currentIndex === 0 ? currentLength : undefined,
      tabindex: activeIndex() === currentIndex ? 0 : -1,
      disabled: isDisabled,
      form: form(),
      pattern: pattern(),
      readonly: readOnly(),
      required: required(),
      'aria-labelledby': currentAriaLabel == null ? inheritedLabel() : undefined,
      'aria-invalid': !isDisabled && invalid() ? true : undefined,
      'aria-label': currentAriaLabel,
      ...eventHandlers,
    };
  };

  return useRenderElement('input', componentProps, {
    ref: [
      listItemRef,
      (element: HTMLInputElement | null) => {
        inputElement = element;
        if (!element) {
          return;
        }
        if (element.value !== untrack(renderedValue)) {
          element.value = untrack(renderedValue);
        }
        // Port note: React's synthetic `preventDefault()` marks any event as default-prevented,
        // including the non-cancelable `focus` and `blur` events, so a composed handler can opt
        // out of the internal focus handling. Native events ignore it, so record the call from a
        // capture listener, which runs before the element's own handlers.
        element.addEventListener('focus', trackPreventDefault, true);
        element.addEventListener('blur', trackPreventDefault, true);
        // Port note: Solid's delegated handlers skip disabled elements, so `onInput` doesn't run
        // for an input event dispatched on a disabled slot. React still calls `onChange` and
        // restores the controlled value, so restore it from a native listener.
        element.addEventListener('input', () => {
          if (element.disabled) {
            element.value = untrack(renderedValue);
          }
        });
      },
    ],
    state: inputState,
    props: () => [inputProps(), elementProps],
    stateAttributesMapping: inputStateAttributesMapping,
  });
}

function trackPreventDefault(event: Event) {
  if (event.cancelable) {
    return;
  }

  const preventDefault = event.preventDefault;
  event.preventDefault = function trackedPreventDefault(this: Event) {
    preventDefault.call(this);
    Object.defineProperty(this, 'defaultPrevented', { configurable: true, value: true });
  };
}

export interface OTPFieldInputState extends Omit<OTPFieldRootState, 'filled' | 'value'> {
  /**
   * Whether this input contains a character.
   */
  filled: boolean;
  /**
   * The input index.
   */
  index: number;
  /**
   * The character rendered in this slot.
   */
  value: string;
}

export interface OTPFieldInputProps extends BaseUIComponentProps<
  'input',
  OTPFieldInputState,
  JSX.InputHTMLAttributes<HTMLInputElement>
> {}

export namespace OTPFieldInput {
  export type State = OTPFieldInputState;
  export type Props = OTPFieldInputProps;
}
