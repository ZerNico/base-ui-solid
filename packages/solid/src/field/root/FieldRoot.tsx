import { createMemo, createSignal, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { FieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import {
  DEFAULT_VALIDITY_STATE,
  fieldValidityMapping,
} from '../../internals/field-constants/constants';
import { useFieldsetRootContext } from '../../fieldset/root/FieldsetRootContext';
import type { Form } from '../../form';
import { useFormContext } from '../../internals/form-context/FormContext';
import { LabelableProvider } from '../../internals/labelable-provider';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useFieldValidation } from './useFieldValidation';
import { useFieldControlRegistration } from '../../internals/field-register-control/useFieldControlRegistration';

type StateSetter<T> = (value: T | ((prev: T) => T)) => void;

/**
 * @internal
 */
function FieldRootInner(componentProps: FieldRoot.Props) {
  const { errors, validationMode: formValidationMode, submitCountRef } = useFormContext();

  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'validate',
    'validationDebounceTime',
    'validationMode',
    'name',
    'disabled',
    'invalid',
    'dirty',
    'touched',
    'actionsRef',
    'style',
  );

  const validationMode = () => componentProps.validationMode ?? formValidationMode();
  const name = () => componentProps.name;

  const disabledFieldset = useFieldsetRootContext(true)?.disabled;

  const validate: FieldRoot.Props['validate'] & {} = (value, formValues) =>
    (untrack(() => componentProps.validate) ?? (() => null))(value, formValues);

  const disabled = () => (disabledFieldset?.() ?? false) || (componentProps.disabled ?? false);

  const [touchedState, setTouchedUnwrapped] = createSignal(false);
  const [dirtyState, setDirtyUnwrapped] = createSignal(false);
  const [filled, setFilled] = createSignal(false);
  const [focused, setFocused] = createSignal(false);
  const focusOwnerRef: RefObject<unknown> = { current: undefined };

  const dirty = () => componentProps.dirty ?? dirtyState();
  const touched = () => componentProps.touched ?? touchedState();

  const markedDirtyRef: RefObject<boolean> = { current: untrack(dirty) };
  const registeredFieldIdRef: RefObject<string | undefined> = { current: undefined };
  const [registeredFieldName, setRegisteredFieldName] = createSignal<string>();
  const effectiveName = () => name() ?? registeredFieldName();

  useIsoLayoutEffect(
    ([dirtyProp]) => {
      if (dirtyProp !== undefined) {
        markedDirtyRef.current = dirtyProp;
      }
    },
    () => [componentProps.dirty],
  );

  const setDirty: StateSetter<boolean> = (value) =>
    untrack(() => {
      if (componentProps.dirty !== undefined) {
        return;
      }

      if (value) {
        markedDirtyRef.current = true;
      }
      setDirtyUnwrapped(value);
    });

  const setTouched: StateSetter<boolean> = (value) =>
    untrack(() => {
      if (componentProps.touched !== undefined) {
        return;
      }
      setTouchedUnwrapped(value);
    });

  const shouldValidateOnChange = () =>
    untrack(
      () =>
        validationMode() === 'onChange' ||
        (validationMode() === 'onSubmit' && submitCountRef.current > 0),
    );

  const invalid = createMemo(() => {
    const currentName = effectiveName();
    const currentErrors = errors();
    const formError =
      currentName && Object.hasOwn(currentErrors, currentName) ? currentErrors[currentName] : null;
    const hasFormError = !!(Array.isArray(formError) ? formError.length : formError);
    return componentProps.invalid === true || hasFormError;
  });

  const [validityData, setValidityData] = createSignal<FieldValidityData>({
    state: DEFAULT_VALIDITY_STATE,
    error: '',
    errors: [],
    value: null,
    initialValue: null,
  });

  // App-controlled invalidity (the `invalid` prop and `<Form>` errors) keeps the field marked
  // invalid even while disabled. Only computed validity (native constraints and `validate`)
  // is suppressed when disabled, matching `:disabled` not participating in constraint validation.
  const valid = () => !invalid() && (disabled() ? null : validityData().state.valid);

  const state = createMemo<FieldRootState>(() => ({
    disabled: disabled(),
    touched: touched(),
    dirty: dirty(),
    valid: valid(),
    filled: filled(),
    focused: focused(),
  }));

  const validation = useFieldValidation({
    setValidityData,
    validate,
    validityData,
    validationDebounceTime: () => componentProps.validationDebounceTime ?? 0,
    invalid,
    markedDirtyRef,
    state,
    shouldValidateOnChange,
    validationMode,
    registeredFieldIdRef,
  });

  const [validateFieldControl, registerFieldControl] = useFieldControlRegistration({
    change: validation.change,
    commit: validation.commit,
    invalid,
    markedDirtyRef,
    name,
    setRegisteredFieldName,
    registeredFieldIdRef,
    setValidityData,
    validityData,
  });

  const actions: FieldRoot.Actions = { validate: validateFieldControl };
  // Port note: React's `useImperativeHandle` assigns the handle before ancestors' effects run.
  // Solid runs ancestors' effects first, so also assign it synchronously on setup.
  const initialActionsRef = untrack(() => componentProps.actionsRef);
  if (initialActionsRef) {
    initialActionsRef.current = actions;
  }

  useIsoLayoutEffect(
    ([actionsRef]) => {
      if (actionsRef) {
        actionsRef.current = actions;
      }
    },
    () => [componentProps.actionsRef],
  );

  const contextValue: FieldRootContext = {
    invalid,
    name: effectiveName,
    validityData,
    setValidityData,
    disabled,
    setTouched,
    setDirty,
    setFilled,
    setFocused,
    focusOwnerRef,
    validationMode,
    shouldValidateOnChange,
    state,
    registerFieldControl,
    validation,
  };

  return (
    <FieldRootContext value={contextValue}>
      {useRenderElement('div', componentProps, {
        state,
        props: elementProps,
        stateAttributesMapping: fieldValidityMapping,
      })}
    </FieldRootContext>
  );
}

/**
 * Groups all parts of the field.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldRoot(componentProps: FieldRoot.Props): JSX.Element {
  return (
    <LabelableProvider>
      <FieldRootInner {...componentProps} />
    </LabelableProvider>
  );
}

export interface FieldValidityData {
  state: {
    badInput: boolean;
    customError: boolean;
    patternMismatch: boolean;
    rangeOverflow: boolean;
    rangeUnderflow: boolean;
    stepMismatch: boolean;
    tooLong: boolean;
    tooShort: boolean;
    typeMismatch: boolean;
    valueMissing: boolean;
    valid: boolean | null;
  };
  error: string;
  errors: string[];
  value: unknown;
  initialValue: unknown;
}

export interface FieldRootActions {
  validate: () => void;
}

export interface FieldRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the field has been touched.
   */
  touched: boolean;
  /**
   * Whether the field value has changed from its initial value.
   */
  dirty: boolean;
  /**
   * Whether the field is valid.
   */
  valid: boolean | null;
  /**
   * Whether the field has a value.
   */
  filled: boolean;
  /**
   * Whether the field is focused.
   */
  focused: boolean;
}

export interface FieldRootProps extends BaseUIComponentProps<'div', FieldRootState> {
  /**
   * Whether the component should ignore user interaction.
   * Takes precedence over the `disabled` prop on the `<Field.Control>` component.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Identifies the field when a form is submitted.
   * Takes precedence over the `name` prop on the `<Field.Control>` component.
   */
  name?: string | undefined;
  /**
   * A function for custom validation. Return a string or an array of strings with
   * the error message(s) if the value is invalid. Returning nothing, `null`, an empty
   * string, or an empty array means the value is valid.
   * Asynchronous functions are supported, but they do not prevent form submission
   * when using `validationMode="onSubmit"`.
   */
  validate?:
    | ((
        value: unknown,
        formValues: Form.Values,
      ) => string | string[] | null | void | Promise<string | string[] | null | void>)
    | undefined;
  /**
   * Determines when the field should be validated.
   * This takes precedence over the `validationMode` prop on `<Form>`.
   *
   * - `onSubmit`: triggers validation when the form is submitted, and re-validates on change after submission.
   * - `onBlur`: triggers validation when the control loses focus.
   * - `onChange`: triggers validation on every change to the control value.
   *
   * @default 'onSubmit'
   */
  validationMode?: Form.ValidationMode | undefined;
  /**
   * How long to wait between `validate` callbacks if
   * `validationMode="onChange"` is used. Specified in milliseconds.
   * @default 0
   */
  validationDebounceTime?: number | undefined;
  /**
   * Whether the field is invalid.
   * Useful when the field state is controlled by an external library.
   */
  invalid?: boolean | undefined;
  /**
   * Whether the field's value has been changed from its initial value.
   * Useful when the field state is controlled by an external library.
   */
  dirty?: boolean | undefined;
  /**
   * Whether the field has been touched.
   * Useful when the field state is controlled by an external library.
   */
  touched?: boolean | undefined;
  /**
   * A ref to imperative actions.
   * - `validate`: Validates the field when called.
   */
  actionsRef?: RefObject<FieldRoot.Actions | null> | undefined;
}

export namespace FieldRoot {
  export type State = FieldRootState;
  export type Props = FieldRootProps;
  export type Actions = FieldRootActions;
}
