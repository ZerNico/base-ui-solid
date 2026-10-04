import { createRenderEffect, createSignal, flush, omit, untrack } from 'solid-js';
import { isServer } from '@solidjs/web';
import type { JSX } from '@solidjs/web';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { warn } from '@base-ui-solid/utils/warn';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { formatNumber } from '@base-ui-solid/utils/formatNumber';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useSetFieldFocused } from '../../internals/field-root-context/useSetFieldFocused';
import { useRegisterFieldControl } from '../../internals/field-register-control/useRegisterFieldControl';
import { useFormContext } from '../../internals/form-context/FormContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import {
  getNumberLocaleDetails,
  isNumeralChar,
  parseNumber,
  ANY_MINUS_RE,
  ANY_PLUS_RE,
  ANY_MINUS_DETECT_RE,
  ANY_PLUS_DETECT_RE,
  FORMAT_CONTROL_DETECT_RE,
} from '../utils/parse';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { useRenderElement } from '../../internals/useRenderElement';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '../../internals/createBaseUIEventDetails';
import { useValueChanged } from '../../internals/useValueChanged';
import { REASONS } from '../../internals/reasons';
import { hasNumberFormatRoundingOptions, removeFloatingPointErrors } from '../utils/validate';

const NAVIGATE_KEYS = new Set([
  'Backspace',
  'Delete',
  'ArrowLeft',
  'ArrowRight',
  'Tab',
  'Enter',
  'Escape',
]);

/**
 * The native input control in the number field.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldInput(componentProps: NumberFieldInput.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const {
    allowInputSyncRef,
    formatOptionsRef,
    getAllowedNonNumericKeys,
    getStepAmount,
    id,
    incrementValue,
    inputMode,
    max,
    min,
    name,
    nameProp,
    setValue,
    state,
    setInputValue,
    locale,
    inputRef,
    onValueCommitted,
    lastChangedValueRef,
    hasPendingCommitRef,
    valueRef,
  } = useNumberFieldRootContext();
  const disabled = () => state().disabled;
  const readOnly = () => state().readOnly;
  const required = () => state().required;
  const value = () => state().value;
  const inputValue = () => state().inputValue;

  const { clearErrors } = useFormContext();
  const { validationMode, setTouched, invalid, shouldValidateOnChange, validation } =
    useFieldRootContext();
  const { labelId } = useLabelableContext();

  const setFocused = useSetFieldFocused(disabled, () => inputRef.current);

  let blockRevalidation = false;
  let pendingCaret: number | null = null;
  // Port note: upstream restores the caret in a layout effect that runs after every render.
  // Here a paste requests it explicitly, and it's restored once the update has been rendered.
  // A counter, because `useIsoLayoutEffect` only re-runs when a dependency changes.
  const [caretRequest, setCaretRequest] = createSignal(0);
  const requestCaretRestore = () => setCaretRequest((request) => request + 1);

  useRegisterFieldControl(inputRef, id, value, undefined, () => !disabled(), nameProp);

  // Port note: Solid re-assigns an input's `value` property whenever any spread prop changes, even
  // when the value is unchanged, and programmatic writes can move the caret (user-event does so
  // on every write). React only writes a controlled value that differs from the DOM, so the DOM
  // value is synced here when it differs instead of being passed as a client-side prop.
  createRenderEffect(inputValue, (nextValue) => {
    const input = inputRef.current;
    if (input && input.value !== nextValue) {
      input.value = nextValue;
    }
  });

  // After a paste splices text into the controlled value, the browser would otherwise drop the
  // caret at the end of the new value. Restore it just after the inserted text.
  useIsoLayoutEffect(
    () => {
      if (pendingCaret != null) {
        const caret = pendingCaret;
        pendingCaret = null;
        inputRef.current?.setSelectionRange(caret, caret);
      }
    },
    () => [caretRequest()],
  );

  useValueChanged(value, () => {
    clearErrors(untrack(name));

    if (blockRevalidation && !shouldValidateOnChange()) {
      blockRevalidation = false;
      return;
    }

    validation.change(untrack(value));
  });

  const inputProps = () => ({
    id: id(),
    required: required(),
    disabled: disabled(),
    readonly: readOnly(),
    inputmode: inputMode(),
    // The server markup still renders the value (see the Port note on the value sync above).
    ...(isServer ? { value: inputValue() } : EMPTY_OBJECT),
    type: 'text',
    autocomplete: 'off',
    autocorrect: 'off',
    spellcheck: 'false',
    'aria-roledescription': 'Number field',
    'aria-invalid': !disabled() && invalid() ? true : undefined,
    'aria-labelledby': labelId(),
    // Port note: the input is the focus target itself, so the non-bubbling native events suffice.
    onFocus(event: FocusEvent) {
      // Read-only inputs are still focusable; only the value-changing handlers stay gated on it.
      if (event.defaultPrevented || untrack(disabled)) {
        return;
      }

      setFocused(true);
    },
    onBlur(event: FocusEvent) {
      if (event.defaultPrevented || untrack(disabled)) {
        return;
      }

      setTouched(true);
      setFocused(false);

      if (untrack(readOnly)) {
        return;
      }

      const currentInputValue = untrack(inputValue);
      const currentValue = untrack(value);
      const currentLocale = untrack(locale);
      const currentValidationMode = untrack(validationMode);

      const hadManualInput = !allowInputSyncRef.current;
      const hadPendingProgrammaticChange = hasPendingCommitRef.current;

      allowInputSyncRef.current = true;

      if (currentInputValue.trim() === '') {
        const clearDetails = createChangeEventDetails(REASONS.inputClear, event);
        setValue(null, clearDetails);
        // Respect a canceled clear, mirroring the non-empty blur path below.
        if (clearDetails.isCanceled) {
          return;
        }
        if (currentValidationMode === 'onBlur') {
          validation.commit(null);
        }
        // Don't report a commit when blurring an already-empty field that the user never
        // interacted with: nothing was cleared and no programmatic change is pending.
        if (hadManualInput || hadPendingProgrammaticChange || currentValue !== null) {
          onValueCommitted(null, createGenericEventDetails(REASONS.inputClear, event));
        }
        return;
      }

      const formatOptions = formatOptionsRef.current;
      const parsedValue = parseNumber(currentInputValue, currentLocale, formatOptions);
      if (parsedValue === null) {
        return;
      }

      // Avoid applying Intl's default precision unless the format opts into rounding.
      const hasRoundingOptions = hasNumberFormatRoundingOptions(formatOptions);

      let committed: number | null;
      if (!hadManualInput && !hasRoundingOptions) {
        // No rounding options and no manual edit: the visible text is purely formatted
        // display, so keep the authoritative numeric value as-is rather than re-parsing the
        // rounded text and discarding precision (e.g. focus/blur with no edits, or blur after
        // a programmatic change).
        committed = currentValue;
      } else if (hasRoundingOptions) {
        // Explicit rounding options apply to the committed value, whether typed or external.
        committed = removeFloatingPointErrors(parsedValue, formatOptions);
      } else {
        committed = parsedValue;
      }

      const nextEventDetails = createGenericEventDetails(REASONS.inputBlur, event);
      const shouldUpdateValue = currentValue !== committed;
      const shouldCommit = hadManualInput || shouldUpdateValue || hadPendingProgrammaticChange;

      // Use the stored value after `setValue` clamps it.
      let committedValue = committed;
      if (shouldUpdateValue) {
        const changeDetails = createChangeEventDetails(REASONS.inputBlur, event);
        blockRevalidation = true;
        setValue(committed, changeDetails);
        if (changeDetails.isCanceled) {
          blockRevalidation = false;
          return;
        }
        committedValue = lastChangedValueRef.current;
        // If validation normalized back to the current value, `useValueChanged` won't fire to
        // reset the flag, so reset it here or the next external change won't revalidate.
        if (committedValue === currentValue) {
          blockRevalidation = false;
        }
      }
      if (currentValidationMode === 'onBlur') {
        validation.commit(committedValue);
      }
      if (shouldCommit) {
        onValueCommitted(committedValue, nextEventDetails);
      }

      // Normalize only the displayed text
      const canonicalText = formatNumber(committedValue, currentLocale, formatOptions);
      if (currentInputValue !== canonicalText) {
        setInputValue(canonicalText);
      }
    },
    // Port note: React's `onChange` fires on every `input` event. React also restores the
    // controlled value when the state doesn't follow the change; Solid doesn't, so restore it
    // once the update has been applied.
    onInput(event: InputEvent) {
      const input = event.currentTarget as HTMLInputElement;
      handleInput(event, input);
      flush();
      const currentInputValue = untrack(inputValue);
      if (input.value !== currentInputValue) {
        input.value = currentInputValue;
      }
    },
    onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || untrack(readOnly) || untrack(disabled)) {
        return;
      }

      const nativeEvent = event;
      const currentInputValue = untrack(inputValue);
      const currentLocale = untrack(locale);

      // Snapshot the dirty state without clearing it: navigation/allowed keys (ArrowLeft, Tab,
      // Enter, Escape, …) return early without changing the value, so marking the input synced
      // here would wrongly discard dirty-input authority. Only the value-changing branches below
      // mark it synced.
      const hadManualInput = !allowInputSyncRef.current;

      const allowedNonNumericKeys = getAllowedNonNumericKeys();

      let isAllowedNonNumericKey = allowedNonNumericKeys.has(event.key);

      const { decimal, currency, percentSign } = getNumberLocaleDetails(
        currentLocale,
        formatOptionsRef.current,
      );

      const target = event.currentTarget as HTMLInputElement;
      const selectionStart = target.selectionStart;
      const selectionEnd = target.selectionEnd;
      const isAllSelected = selectionStart === 0 && selectionEnd === currentInputValue.length;

      const selectionContainsIndex = (index: number) =>
        selectionStart != null &&
        selectionEnd != null &&
        index >= selectionStart &&
        index < selectionEnd;

      // Only allow a single sign character: permit it when there is no existing sign of either
      // kind, when all text is selected, or when the selection covers the existing sign so it's
      // being replaced.
      const signGroups = [
        [ANY_MINUS_DETECT_RE, ANY_MINUS_RE],
        [ANY_PLUS_DETECT_RE, ANY_PLUS_RE],
      ] as const;
      signGroups.forEach(([detectRe, globalRe]) => {
        if (
          detectRe.test(event.key) &&
          Array.from(allowedNonNumericKeys).some((k) => detectRe.test(k))
        ) {
          const existingIndex = currentInputValue.search(globalRe);
          const isReplacingExisting = existingIndex !== -1 && selectionContainsIndex(existingIndex);
          isAllowedNonNumericKey =
            !(
              ANY_MINUS_DETECT_RE.test(currentInputValue) ||
              ANY_PLUS_DETECT_RE.test(currentInputValue)
            ) ||
            isAllSelected ||
            isReplacingExisting;
        }
      });

      // Only allow one of each symbol.
      [decimal, currency, percentSign].forEach((symbol) => {
        if (event.key === symbol) {
          const symbolIndex = currentInputValue.indexOf(symbol);
          const isSymbolHighlighted = selectionContainsIndex(symbolIndex);
          isAllowedNonNumericKey = symbolIndex === -1 || isAllSelected || isSymbolHighlighted;
        }
      });

      const isNavigateKey = NAVIGATE_KEYS.has(event.key);
      // Alt+ArrowUp/ArrowDown selects smallStep, so don't treat it as a bypass modifier.
      const isStepKey = event.key === 'ArrowUp' || event.key === 'ArrowDown';

      if (
        // Allow composition events (e.g., pinyin)
        // event.nativeEvent.isComposing does not work in Safari:
        // https://bugs.webkit.org/show_bug.cgi?id=165004
        event.which === 229 ||
        (event.altKey && !isStepKey) ||
        event.ctrlKey ||
        event.metaKey ||
        isAllowedNonNumericKey ||
        isNumeralChar(event.key) ||
        isNavigateKey
      ) {
        return;
      }

      const currentMin = untrack(min);
      const currentMax = untrack(max);

      // Home/End jump to the corresponding bound, but only when that bound is defined.
      let boundaryValue: number | null = null;
      if (event.key === 'Home' && currentMin != null) {
        boundaryValue = currentMin;
      } else if (event.key === 'End' && currentMax != null) {
        boundaryValue = currentMax;
      }

      // Let the browser handle multi-character keys we don't act on (PageUp, Insert, F-keys,
      // Home/End without min/max); invalid single characters are still blocked below.
      if (event.key.length > 1 && !isStepKey && boundaryValue === null) {
        return;
      }

      // Step from the authoritative numeric value unless the input has unsaved manual edits.
      // When the text is already synced, parsing the rounded display would collapse precision,
      // so pass no `currentValue` and let `incrementValue` fall back to the numeric state
      // (mirrors the button path).
      const currentValue = hadManualInput
        ? parseNumber(currentInputValue, currentLocale, formatOptionsRef.current)
        : null;

      const amount = getStepAmount(event);

      // Prevent insertion of text or caret from moving.
      event.preventDefault();
      event.stopPropagation();

      const commitDetails = createGenericEventDetails(REASONS.keyboard, nativeEvent);

      let changed = false;
      if (isStepKey || boundaryValue !== null) {
        allowInputSyncRef.current = true;
      }
      if (isStepKey) {
        // When stepping from the synced numeric state, refresh the commit ref to the current
        // value so a canceled step can't commit a stale `lastChangedValueRef` left over from an
        // earlier change (mirrors the button path).
        if (!hadManualInput) {
          lastChangedValueRef.current = valueRef.current;
        }

        changed = incrementValue(amount, {
          direction: event.key === 'ArrowUp' ? 1 : -1,
          currentValue,
          event: nativeEvent,
          reason: REASONS.keyboard,
        });
      } else if (boundaryValue !== null) {
        changed = setValue(boundaryValue, createChangeEventDetails(REASONS.keyboard, nativeEvent));
      }

      // `changed` is only true when `setValue` applied the change, which records the stored
      // (clamped/snapped) value, so commit that rather than the pre-validation input.
      if (changed) {
        onValueCommitted(lastChangedValueRef.current, commitDetails);
      }
    },
    onPaste(event: ClipboardEvent) {
      if (event.defaultPrevented || untrack(readOnly) || untrack(disabled)) {
        return;
      }

      let pastedData = '';

      try {
        pastedData = event.clipboardData?.getData('text/plain') ?? '';
      } catch {
        if (IS_DEV) {
          // Port note: Solid has no owner stacks, so the stack part of the message is empty.
          const ownerStackMessage = '';
          warn(
            '<NumberField.Input> could not read clipboard text during paste handling.',
            ownerStackMessage,
          );
        }

        return;
      }

      // Prevent `onChange` from being called.
      event.preventDefault();

      // Insert the pasted text at the caret/selection instead of replacing the entire value,
      // matching native input behavior (e.g. pasting "5" into "123|" yields "1235").
      // The component renders `type="text"`, which always reports a selection range. Overriding
      // `type` with a selection-less one (`email`, `number`) is unsupported either way: the caret
      // restore above throws on those, so there is no working behavior to preserve here.
      const input = event.currentTarget as HTMLInputElement;
      const selectionStart = input.selectionStart!;
      const selectionEnd = input.selectionEnd!;
      const currentInputValue = untrack(inputValue);
      const nextText =
        currentInputValue.slice(0, selectionStart) +
        pastedData +
        currentInputValue.slice(selectionEnd);

      const parsedValue = parseNumber(nextText, untrack(locale), formatOptionsRef.current);

      if (parsedValue !== null) {
        allowInputSyncRef.current = false;
        pendingCaret = selectionStart + pastedData.length;
        setValue(parsedValue, createChangeEventDetails(REASONS.inputPaste, event));
        setInputValue(nextText);
        requestCaretRestore();
      }
    },
  });

  function handleInput(event: InputEvent, input: HTMLInputElement) {
    // Workaround for https://github.com/react/react/issues/9023
    if (event.defaultPrevented) {
      return;
    }

    allowInputSyncRef.current = false;
    const targetValue = input.value;

    if (targetValue.trim() === '') {
      setInputValue(targetValue);
      setValue(null, createChangeEventDetails(REASONS.inputClear, event));
      return;
    }

    // Update the input text immediately and only fire onValueChange if the typed value is
    // currently parseable into a number. This preserves good UX for IME
    // composition/partial input while still providing live numeric updates when possible.
    const allowedNonNumericKeys = getAllowedNonNumericKeys();
    const isValidCharacterString = Array.from(targetValue).every(
      (ch) =>
        isNumeralChar(ch) ||
        ANY_MINUS_DETECT_RE.test(ch) ||
        allowedNonNumericKeys.has(ch) ||
        // Bidi/format controls are stripped by `parseNumber`; don't let them reject the string
        // (RTL locales insert them around exponent/currency signs, e.g. scientific notation).
        FORMAT_CONTROL_DETECT_RE.test(ch),
    );

    if (!isValidCharacterString) {
      return;
    }

    const parsedValue = parseNumber(targetValue, untrack(locale), formatOptionsRef.current);

    setInputValue(targetValue);

    if (parsedValue !== null) {
      setValue(parsedValue, createChangeEventDetails(REASONS.inputChange, event));
    }
  }

  const element = useRenderElement('input', componentProps, {
    ref: (element: HTMLInputElement | null) => {
      inputRef.current = element;
      if (element && element.value !== untrack(inputValue)) {
        element.value = untrack(inputValue);
      }
    },
    state,
    props: () => [
      inputProps(),
      elementProps,
      (props: Record<string, any>) => validation.getValidationProps(disabled(), props),
    ],
    stateAttributesMapping,
  });

  return element;
}

export interface NumberFieldInputState extends NumberFieldRootState {}

export interface NumberFieldInputProps extends BaseUIComponentProps<
  'input',
  NumberFieldInputState,
  JSX.IntrinsicElements['input']
> {
  /**
   * A user-friendly description of the input's role for assistive tech. This is a role
   * description, not an accessible name — use `Field.Label` or `aria-label` to name the control.
   * @default 'Number field'
   */
  'aria-roledescription'?: string | undefined;
}

export namespace NumberFieldInput {
  export type State = NumberFieldInputState;
  export type Props = NumberFieldInputProps;
}
