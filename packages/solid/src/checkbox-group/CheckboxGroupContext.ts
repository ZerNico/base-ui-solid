import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { UseFieldValidationReturnValue } from '../field/root/useFieldValidation';
import type { UseCheckboxGroupParentReturnValue } from './useCheckboxGroupParent';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '../internals/reasons';
import type { LabelableContext } from '../internals/labelable-provider/LabelableContext';

export interface CheckboxGroupContext {
  value: Accessor<string[]>;
  setValue: (
    value: string[],
    eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
  ) => void;
  allValues: Accessor<string[] | undefined>;
  parent: UseCheckboxGroupParentReturnValue;
  disabled: Accessor<boolean>;
  validation: UseFieldValidationReturnValue;
  /**
   * `registerControlId` of the labelable scope the group renders in. A checkbox seeing the same
   * function shares that scope, so the group, not the checkbox, is the field's control.
   */
  registerControlId: LabelableContext['registerControlId'];
}

export const CheckboxGroupContext = createContext<CheckboxGroupContext | null>(null);

export function useCheckboxGroupContext() {
  return useContext(CheckboxGroupContext) ?? undefined;
}
