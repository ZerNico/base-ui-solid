import { createMemo, createSignal, flush, omit, Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { useIsoLayoutEffect, useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { visuallyHidden, visuallyHiddenInput } from '@base-ui-solid/utils/visuallyHidden';
import { warn } from '@base-ui-solid/utils/warn';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { contains } from '../../floating-ui-solid/utils';
import { CompositeList } from '../../internals/composite/list/CompositeList';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '../../internals/field-register-control/useRegisterFieldControl';
import type { FieldRootState } from '../../field/root/FieldRoot';
import { useFormContext } from '../../internals/form-context/FormContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { useAriaLabelledBy } from '../../internals/labelable-provider/useAriaLabelledBy';
import { useLabelableId } from '../../internals/labelable-provider/useLabelableId';
import { useRenderElement } from '../../internals/useRenderElement';
import { useValueChanged } from '../../internals/useValueChanged';
import type { BaseUIComponentProps } from '../../internals/types';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '../../internals/createBaseUIEventDetails';
import type {
  BaseUIChangeEventDetails,
  BaseUIGenericEventDetails,
} from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { OTPFieldRootContext } from './OTPFieldRootContext';
import { rootStateAttributesMapping } from '../utils/stateAttributesMapping';
import {
  getOTPValidationConfig,
  normalizeOTPValue,
  normalizeOTPValueWithDetails,
} from '../utils/otp';
import type { OTPValidationType } from '../utils/otp';

/**
 * Groups all OTP field parts and manages their state.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI OTP Field](https://base-ui.com/react/components/otp-field)
 */
export function OTPFieldRoot(componentProps: OTPFieldRoot.Props): JSX.Element {
  const elementProps = omit(
    componentProps,
    'aria-describedby',
    'aria-labelledby',
    'id',
    'autoComplete',
    'defaultValue',
    'value',
    'onValueChange',
    'onValueComplete',
    'form',
    'length',
    'autoSubmit',
    'mask',
    'inputMode',
    'validationType',
    'normalizeValue',
    'disabled',
    'readOnly',
    'required',
    'name',
    'onValueInvalid',
    'render',
    'class',
    'style',
  );

  const autoComplete = () => componentProps.autoComplete ?? 'one-time-code';
  const form = () => componentProps.form;
  const length = () => componentProps.length;
  const autoSubmit = () => componentProps.autoSubmit ?? false;
  const mask = () => componentProps.mask ?? false;
  const validationType = () => componentProps.validationType ?? 'numeric';
  const normalizeValue = () => componentProps.normalizeValue;
  const readOnly = () => componentProps.readOnly ?? false;
  const required = () => componentProps.required ?? false;
  const nameProp = () => componentProps.name;

  const {
    setDirty,
    validityData,
    disabled: fieldDisabled,
    setFilled,
    invalid,
    name: fieldName,
    state: fieldState,
    validation,
    validationMode,
    setFocused: setFieldFocused,
    setTouched,
  } = useFieldRootContext();
  const { clearErrors } = useFormContext();
  const { getDescriptionProps, labelId } = useLabelableContext();

  const disabled = () => (fieldDisabled() ?? false) || (componentProps.disabled ?? false);
  const name = () => fieldName() ?? nameProp();

  const [valueUnwrapped, setValueUnwrapped] = useControlled<string>({
    controlled: () => componentProps.value,
    // Port note: keep the default reactive for upstream's development warning; state initializes once.
    get default() {
      return componentProps.defaultValue ?? '';
    },
    name: 'OTPField',
    state: 'value',
  });

  let rootElement: HTMLDivElement | null = null;
  const inputRefs: RefObject<Array<HTMLElement | null>> = { current: [] };
  let pendingFocus: {
    index: number;
    value: string;
  } | null = null;
  let pendingCompleteValue: {
    value: string;
    eventDetails: OTPFieldRoot.CompleteEventDetails;
  } | null = null;
  const firstInputRef: RefObject<HTMLInputElement | null> = {
    get current() {
      return (inputRefs.current[0] as HTMLInputElement | undefined) ?? null;
    },
  };

  const id = useLabelableId({ id: () => componentProps.id });
  const [inputCount, setInputCount] = createSignal(0);
  const ariaLabelledBy = useAriaLabelledBy(
    () => componentProps['aria-labelledby'] || undefined,
    labelId,
    () => firstInputRef.current,
    // Port note: upstream re-reads the first slot on every commit. The slots register after the
    // root's effects have run, so the fallback is enabled once they have been counted.
    () => inputCount() > 0,
    id,
  );
  const inputAriaLabelledBy = () =>
    componentProps['aria-labelledby'] == null ? ariaLabelledBy() : undefined;
  const ariaDescribedBy = () =>
    mergeAriaIds(
      componentProps['aria-describedby'] || undefined,
      getDescriptionProps({})['aria-describedby'] as string | undefined,
    );
  const validationConfig = () => getOTPValidationConfig(validationType());
  const pattern = () => validationConfig()?.slotPattern;
  const hiddenInputPattern = () => validationConfig()?.getRootPattern(length());
  const inputMode = () => componentProps.inputMode ?? validationConfig()?.inputMode;
  const hasValidLength = () => Number.isInteger(length()) && length() > 0;

  const value = createMemo(() =>
    normalizeOTPValue(valueUnwrapped(), length(), validationType(), normalizeValue()),
  );
  // Port note: upstream's `useValueAsRef(value)` is read as `untrack(value)`.
  const filled = () => value() !== '';

  const [focusedIndex, setFocusedIndex] = createSignal(
    untrack(() => Math.min(value().length, length() - 1)),
  );
  const [focused, setFocusedState] = createSignal(false);

  const activeIndex = createMemo(() =>
    focused()
      ? Math.min(focusedIndex(), Math.max(length() - 1, 0))
      : Math.min(value().length, length() - 1),
  );

  useIsoLayoutEffect(
    ([currentFilled]) => {
      setFilled(currentFilled);
    },
    () => [filled()],
  );

  /* istanbul ignore else -- `IS_DEV` is a build-time constant under test */
  if (IS_DEV) {
    useOTPFieldRootDevWarnings({
      inputCount,
      length,
    });
  }

  useRegisterFieldControl(firstInputRef, id, value, undefined, () => !disabled(), nameProp);

  function focusInput(index: number) {
    const targetIndex = Math.min(Math.max(index, 0), Math.max(inputRefs.current.length - 1, 0));
    const target = inputRefs.current[targetIndex] as HTMLInputElement | null | undefined;
    target?.focus();
    target?.select();
  }

  function queueFocusInput(index: number, nextValue: string) {
    pendingFocus = { index, value: nextValue };
  }

  function requestSubmit() {
    // The hidden validation input only renders for a valid `length`, but the slots always do,
    // so fall back to the owning form of the first slot.
    let formElement = validation.inputRef.current?.form ?? firstInputRef.current?.form ?? null;

    const formId = untrack(form);
    if (formId) {
      const associatedElement = ownerDocument(rootElement).getElementById(formId);
      if (associatedElement?.tagName === 'FORM') {
        formElement = associatedElement as HTMLFormElement;
      }
    }

    if (formElement && typeof formElement.requestSubmit === 'function') {
      formElement.requestSubmit();
    }
  }

  function completeValue(completedValue: string, eventDetails: OTPFieldRoot.CompleteEventDetails) {
    componentProps.onValueComplete?.(completedValue, eventDetails);

    if (untrack(autoSubmit)) {
      requestSubmit();
    }
  }

  useValueChanged(value, () => {
    const currentValue = untrack(value);
    clearErrors(untrack(name));
    setDirty(currentValue !== untrack(validityData).initialValue);

    validation.change(currentValue);

    const currentPendingFocus = pendingFocus;

    if (currentPendingFocus != null) {
      pendingFocus = null;

      if (currentPendingFocus.value === currentValue) {
        focusInput(currentPendingFocus.index);
      }
    }

    const currentPendingCompleteValue = pendingCompleteValue;

    if (currentPendingCompleteValue != null) {
      pendingCompleteValue = null;

      if (currentPendingCompleteValue.value === currentValue) {
        completeValue(currentValue, currentPendingCompleteValue.eventDetails);
      }
    }
  });

  function setValue(nextValue: string, details: OTPFieldRoot.ChangeEventDetails) {
    const currentLength = untrack(length);
    const currentValue = untrack(value);
    const normalizedValue = normalizeOTPValue(
      nextValue,
      currentLength,
      untrack(validationType),
      untrack(normalizeValue),
    );
    const canComplete =
      details.reason === REASONS.inputChange || details.reason === REASONS.inputPaste;
    const completeEventDetails =
      canComplete &&
      normalizedValue.length === currentLength &&
      (currentValue.length !== currentLength || details.reason === REASONS.inputPaste)
        ? createGenericEventDetails(details.reason, details.event)
        : null;

    if (normalizedValue === currentValue) {
      if (completeEventDetails != null) {
        completeValue(normalizedValue, completeEventDetails);
      }

      return null;
    }

    componentProps.onValueChange?.(normalizedValue, details);

    if (details.isCanceled) {
      return null;
    }

    setValueUnwrapped(normalizedValue);
    if (completeEventDetails != null) {
      pendingCompleteValue = {
        value: normalizedValue,
        eventDetails: completeEventDetails,
      };
    } else if (normalizedValue.length !== currentLength) {
      pendingCompleteValue = null;
    }

    return normalizedValue;
  }

  function reportValueInvalid(invalidValue: string, details: OTPFieldRoot.InvalidEventDetails) {
    componentProps.onValueInvalid?.(invalidValue, details);
  }

  function handleInputFocus(index: number, event: FocusEvent) {
    const currentValue = untrack(value);
    if (index > currentValue.length) {
      focusInput(Math.min(currentValue.length, untrack(length) - 1));
      return;
    }

    setFocusedIndex(index);
    (event.currentTarget as HTMLInputElement).select();
  }

  function handleInputBlur(event: FocusEvent) {
    if (contains(rootElement, event.relatedTarget as Element | null)) {
      return;
    }

    setTouched(true);
    setFocusedState(false);
    setFieldFocused(false);

    if (untrack(validationMode) === 'onBlur') {
      validation.commit(untrack(value));
    }
  }

  function getInputId(index: number) {
    const currentId = id();
    if (currentId == null) {
      return undefined;
    }

    return index === 0 ? currentId : `${currentId}-${index + 1}`;
  }

  const state = createMemo<OTPFieldRootState>(() => ({
    ...fieldState(),
    complete: value().length === length(),
    disabled: disabled(),
    filled: filled(),
    focused: focused(),
    length: length(),
    readOnly: readOnly(),
    required: required(),
    value: value(),
  }));

  const contextValue: OTPFieldRootContext = {
    autoComplete,
    activeIndex,
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
    setValue,
    setFocused: setFocusedState,
    state,
    validationType,
    value,
  };

  let hiddenInputElement: HTMLInputElement | null = null;

  function handleHiddenInputChange(event: InputEvent) {
    if (event.defaultPrevented || untrack(disabled) || untrack(readOnly)) {
      return;
    }

    const rawValue = (event.currentTarget as HTMLInputElement).value;
    const [normalizedValue, didRejectCharacters] = normalizeOTPValueWithDetails(
      rawValue,
      untrack(length),
      untrack(validationType),
      untrack(normalizeValue),
    );

    if (didRejectCharacters) {
      reportValueInvalid(rawValue, createGenericEventDetails(REASONS.inputChange, event));
    }

    const committedValue = setValue(
      normalizedValue,
      createChangeEventDetails(REASONS.inputChange, event),
    );

    if (committedValue != null && committedValue !== '') {
      queueFocusInput(committedValue.length - 1, committedValue);
    }
  }

  return (
    <CompositeList
      elementsRef={inputRefs}
      onMapChange={(newMap) => {
        setInputCount(newMap.size);
      }}
    >
      <OTPFieldRootContext value={contextValue}>
        {useRenderElement('div', componentProps, {
          ref: (element: HTMLDivElement | null) => {
            rootElement = element;
          },
          state,
          props: () => [
            {
              role: 'group',
              'aria-describedby': ariaDescribedBy(),
              'aria-labelledby': ariaLabelledBy(),
            },
            elementProps,
          ],
          stateAttributesMapping: rootStateAttributesMapping,
        })}
        <Show when={hasValidLength()}>
          {useRenderElement('input', EMPTY_OBJECT, {
            ref: (element: HTMLInputElement | null) => {
              // Port note: Solid disposes a replaced element after its replacement has mounted, so
              // only clear the shared ref when it still points to this input.
              if (element) {
                validation.inputRef.current = element;
              } else if (validation.inputRef.current === hiddenInputElement) {
                validation.inputRef.current = null;
              }
              hiddenInputElement = element;
              // Port note: Solid's delegated handlers skip disabled elements, so `onInput` doesn't
              // run for an input event dispatched on the disabled hidden input. React still calls
              // `onChange` and restores the controlled value, so restore it from a native listener.
              element?.addEventListener('input', () => {
                if (element.disabled) {
                  element.value = untrack(value);
                }
              });
            },
            props: () => [
              validation.getValidationProps(disabled(), {
                onFocus() {
                  focusInput(0);
                },
                // Port note: React's `onChange` on text inputs is the native `input` event.
                onInput(event: InputEvent) {
                  const input = event.currentTarget as HTMLInputElement;
                  handleHiddenInputChange(event);

                  // Port note: React restores a controlled input's value when the change isn't
                  // applied (rejected characters, a canceled change or a locked field). Solid
                  // doesn't, so restore it once the update has been applied.
                  flush();
                  const currentValue = untrack(value);
                  if (input.value !== currentValue) {
                    input.value = currentValue;
                  }
                },
              }),
              {
                type: 'text',
                id: id() && name() == null ? `${id()}-hidden-input` : undefined,
                form: form(),
                name: name(),
                value: value(),
                autocomplete: autoComplete(),
                inputmode: inputMode(),
                minlength: length(),
                maxlength: length(),
                pattern: hiddenInputPattern(),
                disabled: disabled(),
                readonly: readOnly(),
                required: required(),
                'aria-hidden': true,
                tabindex: -1,
                style: name() ? visuallyHiddenInput : visuallyHidden,
              },
            ],
          })}
        </Show>
      </OTPFieldRootContext>
    </CompositeList>
  );
}

export interface OTPFieldRootProps extends Omit<
  BaseUIComponentProps<'div', OTPFieldRootState>,
  'onChange'
> {
  /**
   * The id of the first input element.
   * Subsequent inputs derive their ids from it (`{id}-2`, `{id}-3`, and so on).
   */
  id?: string | undefined;
  /**
   * The input autocomplete attribute. Applied to the first slot and hidden validation input.
   * @default 'one-time-code'
   */
  autoComplete?: string | undefined;
  /**
   * A string specifying the `form` element with which the hidden input is associated.
   * This string's value must match the id of a `form` element in the same document.
   */
  form?: string | undefined;
  /**
   * The number of OTP input slots.
   * Required so the root can clamp values, detect completion, and generate
   * consistent validation markup before all slots hydrate.
   */
  length: number;
  /**
   * Whether to submit the owning form when the OTP becomes complete.
   * @default false
   */
  autoSubmit?: boolean | undefined;
  /**
   * Whether the slot inputs should mask entered characters.
   * Pass `type` directly to individual `<OTPField.Input>` parts to use a custom
   * input type.
   * @default false
   */
  mask?: boolean | undefined;
  /**
   * The virtual keyboard hint applied to the slot inputs and hidden validation input.
   *
   * Built-in validation modes provide sensible defaults, but you can override them when needed.
   */
  inputMode?: JSX.HTMLAttributes<HTMLInputElement>['inputmode'] | undefined;
  /**
   * The type of input validation to apply to the OTP value.
   * @default 'numeric'
   */
  validationType?: OTPFieldRoot.ValidationType | undefined;
  /**
   * Function that normalizes the OTP value after whitespace and `validationType` filtering.
   * It runs whenever OTP Field normalizes a value, including initial/default values, controlled
   * values, and user edits.
   *
   * The returned value is filtered by `validationType` again, then clamped to `length`.
   * It should be idempotent because OTP Field may normalize the same value more than once while
   * handling edits, storing state, and rendering controlled or uncontrolled values. Non-idempotent
   * normalizers can compound across those normalization passes. Characters rejected while
   * normalizing typed or pasted text are reported through `onValueInvalid`.
   */
  normalizeValue?: ((value: string) => string) | undefined;
  /**
   * Whether the user must enter a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the user should be unable to change the field value.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * The OTP value.
   */
  value?: string | undefined;
  /**
   * The uncontrolled OTP value when the component is initially rendered.
   */
  defaultValue?: string | undefined;
  /**
   * Callback fired when the OTP value changes.
   *
   * The `eventDetails.reason` indicates what triggered the change:
   * - `'input-change'` for typing or autofill
   * - `'input-clear'` when a character is removed by text input
   * - `'input-paste'` for paste interactions
   * - `'keyboard'` for keyboard interactions that change the value
   */
  onValueChange?:
    ((value: string, eventDetails: OTPFieldRoot.ChangeEventDetails) => void) | undefined;
  /**
   * Callback fired when entered text contains characters that are rejected by validation or
   * normalization before the OTP value updates.
   *
   * The `value` argument is the attempted user-entered string before normalization.
   */
  onValueInvalid?:
    ((value: string, eventDetails: OTPFieldRoot.InvalidEventDetails) => void) | undefined;
  /**
   * Callback function that is fired when the OTP value becomes complete, or when a complete value
   * is pasted while the OTP is already complete.
   *
   * When the value changes, it runs later than `onValueChange`, after the internal value update is
   * applied. If a complete pasted value matches the current value, `onValueChange` does not fire.
   *
   * If `autoSubmit` is enabled, it runs immediately before the owning form is submitted.
   */
  onValueComplete?:
    ((value: string, eventDetails: OTPFieldRoot.CompleteEventDetails) => void) | undefined;
}

export interface OTPFieldRootState extends FieldRootState {
  /**
   * Whether all slots are filled.
   */
  complete: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * The number of OTP input slots.
   */
  length: number;
  /**
   * Whether the user should be unable to change the field value.
   */
  readOnly: boolean;
  /**
   * Whether the user must enter a value before submitting a form.
   */
  required: boolean;
  /**
   * The OTP value.
   */
  value: string;
}

export type OTPFieldRootChangeEventReason =
  | typeof REASONS.inputChange
  | typeof REASONS.inputClear
  | typeof REASONS.inputPaste
  | typeof REASONS.keyboard;
export type OTPFieldRootChangeEventDetails =
  BaseUIChangeEventDetails<OTPFieldRoot.ChangeEventReason>;

export type OTPFieldRootInvalidEventReason = typeof REASONS.inputChange | typeof REASONS.inputPaste;
export type OTPFieldRootInvalidEventDetails =
  BaseUIGenericEventDetails<OTPFieldRoot.InvalidEventReason>;

export type OTPFieldRootCompleteEventReason =
  typeof REASONS.inputChange | typeof REASONS.inputPaste;
export type OTPFieldRootCompleteEventDetails =
  BaseUIGenericEventDetails<OTPFieldRoot.CompleteEventReason>;

export namespace OTPFieldRoot {
  export type State = OTPFieldRootState;
  export type Props = OTPFieldRootProps;
  export type ValidationType = OTPValidationType;
  export type ChangeEventReason = OTPFieldRootChangeEventReason;
  export type ChangeEventDetails = OTPFieldRootChangeEventDetails;
  export type InvalidEventReason = OTPFieldRootInvalidEventReason;
  export type InvalidEventDetails = OTPFieldRootInvalidEventDetails;
  export type CompleteEventReason = OTPFieldRootCompleteEventReason;
  export type CompleteEventDetails = OTPFieldRootCompleteEventDetails;
}

function mergeAriaIds(...values: Array<string | undefined>) {
  const ids = values.flatMap((value) => value?.split(/\s+/).filter(Boolean) ?? []);
  return ids.length > 0 ? Array.from(new Set(ids)).join(' ') : undefined;
}

interface UseOTPFieldRootDevWarningsParameters {
  inputCount: () => number;
  length: () => number;
}

function useOTPFieldRootDevWarnings(parameters: UseOTPFieldRootDevWarningsParameters) {
  const { inputCount, length } = parameters;

  // Port note: React's `captureOwnerStack` has no Solid counterpart, so no owner stack is appended.
  useEffect(
    ([currentInputCount, currentLength]) => {
      if (
        !Number.isInteger(currentLength) ||
        currentLength <= 0 ||
        currentInputCount === 0 ||
        currentInputCount === currentLength
      ) {
        return;
      }

      const message =
        '<OTPField.Root> `length` must match the number of rendered ' +
        `<OTPField.Input /> parts. Received \`length={${currentLength}}\` but rendered ` +
        `${currentInputCount} input${currentInputCount === 1 ? '' : 's'}.`;
      warn(message);
    },
    () => [inputCount(), length()],
  );

  useEffect(
    ([currentLength]) => {
      if (Number.isInteger(currentLength) && currentLength > 0) {
        return;
      }

      warn(
        `<OTPField.Root> \`length\` must be a positive integer. Received \`length={${String(currentLength)}}\`.`,
      );
    },
    () => [length()],
  );
}
