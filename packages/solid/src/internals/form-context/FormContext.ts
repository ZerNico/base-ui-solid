import { type Accessor, createContext, useContext } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { FieldValidityData } from '../../field/root/FieldRoot';
import { NOOP } from '../noop';
import type { Form } from '../../form/Form';

export type Errors = Record<string, string | string[]>;

export interface FormContext {
  errors: Accessor<Errors>;
  clearErrors: (name: string | undefined) => void;
  elementRef: RefObject<HTMLFormElement | null>;
  formRef: RefObject<{
    fields: Map<
      string,
      {
        name: string | undefined;
        /**
         * After this returns, the field registry entry reflects the latest synchronous
         * validity verdict. Async validators do not block submit.
         */
        validate: () => void;
        validityData: FieldValidityData;
        controlRef: RefObject<HTMLElement | null>;
        getValue: () => unknown;
      }
    >;
  }>;
  validationMode: Accessor<Form.ValidationMode>;
  submitCountRef: RefObject<number>;
}

export const FormContext = createContext<FormContext>({
  elementRef: { current: null },
  formRef: {
    current: {
      fields: new Map(),
    },
  },
  errors: () => ({}),
  clearErrors: NOOP,
  validationMode: () => 'onSubmit',
  submitCountRef: {
    current: 0,
  },
});

export function useFormContext() {
  return useContext(FormContext);
}
