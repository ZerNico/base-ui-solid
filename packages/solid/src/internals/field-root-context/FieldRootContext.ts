import { type Accessor, createContext, useContext } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { NOOP } from '../noop';
import { DEFAULT_FIELD_ROOT_STATE, DEFAULT_VALIDITY_STATE } from '../field-constants/constants';
import type { FieldValidityData, FieldRootState } from '../../field/root/FieldRoot';
import type { Form } from '../../form';
import type { UseFieldValidationReturnValue } from '../../field/root/useFieldValidation';
import type { HTMLProps } from '../types';
import type { FieldControlRegistration } from '../field-register-control/useFieldControlRegistration';

type StateSetter<T> = (value: T | ((prev: T) => T)) => void;

export interface FieldRootContext {
  invalid: Accessor<boolean | undefined>;
  name: Accessor<string | undefined>;
  validityData: Accessor<FieldValidityData>;
  setValidityData: StateSetter<FieldValidityData>;
  disabled: Accessor<boolean | undefined>;
  setTouched: StateSetter<boolean>;
  setDirty: StateSetter<boolean>;
  setFilled: StateSetter<boolean>;
  setFocused: StateSetter<boolean>;
  /**
   * Identifies the control the focused state belongs to, so that disabling or unmounting a
   * different control in the same field can't clear it. Written through `useSetFieldFocused`.
   */
  focusOwnerRef: RefObject<unknown>;
  validationMode: Accessor<Form.ValidationMode>;
  shouldValidateOnChange: () => boolean;
  state: Accessor<FieldRootState>;
  registerFieldControl: (
    source: symbol,
    registration: FieldControlRegistration | undefined,
  ) => void;
  validation: UseFieldValidationReturnValue;
}

const DEFAULT_VALIDITY_DATA: FieldValidityData = {
  state: DEFAULT_VALIDITY_STATE,
  errors: [],
  error: '',
  value: '',
  initialValue: null,
};

export const DEFAULT_FIELD_ROOT_CONTEXT: FieldRootContext = {
  invalid: () => undefined,
  name: () => undefined,
  validityData: () => DEFAULT_VALIDITY_DATA,
  setValidityData: NOOP,
  disabled: () => undefined,
  setTouched: NOOP,
  setDirty: NOOP,
  setFilled: NOOP,
  setFocused: NOOP,
  focusOwnerRef: { current: undefined },
  validationMode: () => 'onSubmit',
  shouldValidateOnChange: () => false,
  state: () => DEFAULT_FIELD_ROOT_STATE,
  registerFieldControl: NOOP,
  validation: {
    getValidationProps: (_disabled: boolean, props: HTMLProps = EMPTY_OBJECT) => props,
    inputRef: { current: null },
    registeredInputs: new Map(),
    registerInput: NOOP,
    getInputControl: () => null,
    commit: async () => {},
    change: NOOP,
  },
};

export const FieldRootContext = createContext<FieldRootContext>(DEFAULT_FIELD_ROOT_CONTEXT);

export function useFieldRootContext(optional = true) {
  const context = useContext(FieldRootContext);

  if (context.setValidityData === NOOP && !optional) {
    throw new Error(
      'Base UI: FieldRootContext is missing. Field parts must be placed within <Field.Root>.',
    );
  }

  return context;
}
