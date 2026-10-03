import { createMemo, omit, onCleanup, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { BaseUIComponentProps, HTMLProps } from '../internals/types';
import { useBaseUiId } from '../internals/useBaseUiId';
import { contains } from '../floating-ui-react/utils';
import { SHIFT } from '../internals/composite/composite';
import { CompositeRoot } from '../internals/composite/root/CompositeRoot';
import { useFieldRootContext } from '../internals/field-root-context/FieldRootContext';
import { useRegisterFieldControl } from '../internals/field-register-control/useRegisterFieldControl';
import { fieldValidityMapping } from '../internals/field-constants/constants';
import type { FieldRootState } from '../field/root/FieldRoot';
import { isEligibleInput } from '../field/root/useFieldValidation';
import { useFieldsetRootContext } from '../fieldset/root/FieldsetRootContext';
import { useFormContext } from '../internals/form-context/FormContext';
import { useLabelableContext } from '../internals/labelable-provider/LabelableContext';
import { useValueChanged } from '../internals/useValueChanged';
import { RadioGroupContext } from './RadioGroupContext';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import type { REASONS } from '../internals/reasons';

const MODIFIER_KEYS = [SHIFT];
const UNSET = Symbol('unset');

/**
 * Provides shared state to a series of radio buttons.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Radio Group](https://base-ui.com/react/components/radio-group)
 */
export function RadioGroup<Value>(componentProps: RadioGroup.Props<Value>): JSX.Element {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'disabled',
    'readOnly',
    'required',
    'onValueChange',
    'value',
    'defaultValue',
    'form',
    'name',
    'inputRef',
    'id',
    'style',
  );

  const {
    setTouched: setFieldTouched,
    setFocused,
    validationMode,
    name: fieldName,
    disabled: fieldDisabled,
    state: fieldState,
    validation,
    setDirty,
    setFilled,
    validityData,
  } = useFieldRootContext();
  const { labelId } = useLabelableContext();
  const { clearErrors, elementRef } = useFormContext();
  const fieldsetContext = useFieldsetRootContext(true);

  const disabled = () => fieldDisabled() || componentProps.disabled;
  const name = () => fieldName() ?? componentProps.name;
  // Port note: upstream re-derives the id from `idProp` on every render; it's read once here.
  const id = useBaseUiId(untrack(() => componentProps.id) as string | undefined);

  const [checkedValue, setCheckedValueUnwrapped] = useControlled<Value | undefined>({
    controlled: () => componentProps.value,
    default: untrack(() => componentProps.defaultValue),
    name: 'RadioGroup',
    state: 'value',
  });

  // Port note: a plain value instead of state, see `RadioGroupContext['touched']`.
  let touched = false;
  const setTouched = (nextTouched: boolean) => {
    touched = nextTouched;
  };

  const setCheckedValue = (value: Value, eventDetails: RadioGroup.ChangeEventDetails) => {
    componentProps.onValueChange?.(value, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setCheckedValueUnwrapped(value);
  };

  const controlRef: RefObject<HTMLElement | null> = {
    get current() {
      return validation.getInputControl();
    },
  };

  let groupInput: HTMLInputElement | null = null;
  let firstEnabledInput: HTMLInputElement | null = null;
  // Port note: upstream merges `groupInputRef` and the `inputRef` prop with `useMergedRefs`, whose
  // callback changes identity when the prop changes. The applied prop value plays that role here,
  // and `inputRefCleanup` is the merged ref's pending cleanup.
  let lastAppliedInputRef: RadioGroup.Props<Value>['inputRef'] | typeof UNSET = UNSET;
  let inputRefCleanup: (() => void) | null = null;

  function applyInputRef(
    inputRef: RadioGroup.Props<Value>['inputRef'],
    instance: HTMLInputElement | null,
  ) {
    if (inputRefCleanup) {
      inputRefCleanup();
      inputRefCleanup = null;
    }

    if (instance == null) {
      return;
    }

    groupInput = instance;
    let refCleanup: void | (() => void) | undefined;
    if (typeof inputRef === 'function') {
      refCleanup = inputRef(instance);
    } else if (inputRef) {
      inputRef.current = instance;
    }

    inputRefCleanup = () => {
      groupInput = null;
      if (typeof inputRef === 'function') {
        if (typeof refCleanup === 'function') {
          refCleanup();
        } else {
          // Legacy ref with no attach-time cleanup: detach by calling it with `null`.
          void inputRef(null);
        }
      } else if (inputRef) {
        inputRef.current = null;
      }
    };
  }

  // Only forwards the public `inputRef` and tracks the current representative for that forwarding.
  // The registry (`validation.registeredInputs`) is authoritative for validation and form-value
  // projection, so the group must not write `validation.inputRef`: a stale, unmounted radio left
  // there would become the Field's fallback once the registry empties and keep blocking submission.
  const setInputRef = (hiddenInput: HTMLInputElement | null) => {
    const inputRef = untrack(() => componentProps.inputRef);
    if (groupInput === hiddenInput && lastAppliedInputRef === inputRef) {
      return;
    }

    lastAppliedInputRef = inputRef;
    applyInputRef(inputRef, hiddenInput);
  };

  useIsoLayoutEffect(
    () => {
      setInputRef(groupInput);
    },
    () => [componentProps.inputRef],
  );

  const registerInputRef = (input: HTMLInputElement | null) => {
    if (!input) {
      return undefined;
    }

    if (!input.disabled) {
      if (!firstEnabledInput) {
        firstEnabledInput = input;
      }

      const currentInput = groupInput;
      if (input.checked || currentInput == null || currentInput.disabled) {
        setInputRef(input);
      }
    }

    // Detach when this input unmounts while still forwarded, so consumers don't
    // keep holding a disconnected node. The input may have become the forwarded
    // one after attach (via the re-registration effect), so always return this.
    return () => {
      if (firstEnabledInput === input) {
        firstEnabledInput = null;
      }
      if (groupInput === input) {
        setInputRef(null);
      }
    };
  };

  const getFormValue = () => {
    const currentCheckedValue = untrack(checkedValue);
    const formElement = elementRef.current;
    if (!formElement) {
      return currentCheckedValue ?? null;
    }

    for (const input of validation.registeredInputs.keys()) {
      if (input.checked && isEligibleInput(input, formElement)) {
        return currentCheckedValue ?? null;
      }
    }

    return null;
  };

  useRegisterFieldControl(
    controlRef,
    () => id,
    () => checkedValue() ?? null,
    getFormValue,
    () => !disabled(),
    () => componentProps.name,
  );

  useValueChanged(checkedValue, () => {
    const currentCheckedValue = untrack(checkedValue);
    clearErrors(untrack(name));

    setDirty(currentCheckedValue !== untrack(validityData).initialValue);
    setFilled(currentCheckedValue != null);

    validation.change(currentCheckedValue);

    const fallbackInput = firstEnabledInput;
    if (currentCheckedValue == null && fallbackInput && !fallbackInput.disabled) {
      setInputRef(fallbackInput);
    }
  });

  const ariaLabelledby = () => labelId() ?? fieldsetContext?.legendId();

  const state = createMemo<RadioGroupState>(() => ({
    ...fieldState(),
    disabled: disabled() ?? false,
    required: componentProps.required ?? false,
    readOnly: componentProps.readOnly ?? false,
  }));

  const contextValue: RadioGroupContext<Value> = {
    checkedValue,
    disabled,
    form: () => componentProps.form,
    validation,
    name,
    readOnly: () => componentProps.readOnly,
    registerInputRef,
    required: () => componentProps.required,
    setCheckedValue,
    setTouched,
    touched: () => touched,
  };

  const defaultProps = (): Record<string, any> => ({
    id: componentProps.id,
    role: 'radiogroup',
    'aria-required': componentProps.required || undefined,
    'aria-disabled': disabled() || undefined,
    'aria-readonly': componentProps.readOnly || undefined,
    'aria-labelledby': ariaLabelledby(),
    // Port note: React's `onBlur` bubbles (it listens to `focusout`).
    onFocusOut(event: FocusEvent) {
      if (!contains(event.currentTarget as Element, event.relatedTarget as Element | null)) {
        setTouched(false);
        setFieldTouched(true);
        setFocused(false);

        if (untrack(validationMode) === 'onBlur') {
          validation.commit(untrack(checkedValue));
        }
      }
    },
  });

  // Port note: Solid has no capture-phase event props, so upstream's `onKeyDownCapture` is a
  // native capture listener.
  const handleKeyDownCapture = (event: KeyboardEvent) => {
    if (event.key.startsWith('Arrow')) {
      setTouched(true);
    }
  };
  let keyDownCaptureElement: HTMLElement | null = null;
  const keyDownCaptureRef = (element: HTMLElement | null) => {
    if (element === keyDownCaptureElement) {
      return;
    }
    keyDownCaptureElement?.removeEventListener('keydown', handleKeyDownCapture, true);
    keyDownCaptureElement = element;
    element?.addEventListener('keydown', handleKeyDownCapture, true);
  };
  onCleanup(() => keyDownCaptureRef(null));

  return (
    <RadioGroupContext value={contextValue}>
      <CompositeRoot
        render={componentProps.render}
        class={componentProps.class}
        style={componentProps.style}
        state={state()}
        props={[
          defaultProps(),
          elementProps,
          (props: HTMLProps) => validation.getValidationProps(disabled() ?? false, props),
        ]}
        refs={[keyDownCaptureRef]}
        stateAttributesMapping={fieldValidityMapping}
        enableHomeAndEndKeys={false}
        modifierKeys={MODIFIER_KEYS}
      />
    </RadioGroupContext>
  );
}

export interface RadioGroupState extends FieldRootState {
  /**
   * Whether the user should be unable to select a different radio button in the group.
   */
  readOnly: boolean;
  /**
   * Whether the user must tick a radio button within the group before submitting a form.
   */
  required: boolean;
}

export interface RadioGroupProps<Value = any> extends Omit<
  BaseUIComponentProps<'div', RadioGroupState>,
  'value'
> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Whether the user should be unable to select a different radio button in the group.
   * @default false
   */
  readOnly?: boolean | undefined;
  /**
   * Whether the user must choose a value before submitting a form.
   * @default false
   */
  required?: boolean | undefined;
  /**
   * Identifies the field when a form is submitted.
   */
  name?: string | undefined;
  /**
   * Identifies the form that owns the radio inputs.
   * Useful when the radio group is rendered outside the form.
   */
  form?: string | undefined;
  /**
   * The controlled value of the radio item that should be currently selected.
   *
   * To render an uncontrolled radio group, use the `defaultValue` prop instead.
   */
  value?: Value | undefined;
  /**
   * The uncontrolled value of the radio button that should be initially selected.
   *
   * To render a controlled radio group, use the `value` prop instead.
   */
  defaultValue?: Value | undefined;
  /**
   * Callback fired when the value changes.
   */
  onValueChange?: ((value: Value, eventDetails: RadioGroup.ChangeEventDetails) => void) | undefined;
  /**
   * A ref to access the hidden input element.
   *
   * Port note: the group forwards a different input over time (the checked one), so this follows
   * React's ref semantics rather than Solid's: a callback is called with `null` (or its returned
   * cleanup runs) when the input is detached, and a ref object's `current` is updated.
   */
  inputRef?:
    | ((element: HTMLInputElement | null) => void | (() => void))
    | RefObject<HTMLInputElement | null>
    | undefined;
}

export type RadioGroupChangeEventReason = typeof REASONS.none;

export type RadioGroupChangeEventDetails = BaseUIChangeEventDetails<RadioGroup.ChangeEventReason>;

export namespace RadioGroup {
  export type State = RadioGroupState;
  export type Props<TValue = any> = RadioGroupProps<TValue>;
  export type ChangeEventReason = RadioGroupChangeEventReason;
  export type ChangeEventDetails = RadioGroupChangeEventDetails;
}
