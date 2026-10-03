import { type Accessor, createContext, useContext } from 'solid-js';
import type { UseFieldValidationReturnValue } from '../field/root/useFieldValidation';
import type { BaseUIChangeEventDetails } from '../internals/createBaseUIEventDetails';
import type { BaseUIEventReasons } from '../internals/reasons';

export interface RadioGroupContext<Value> {
  disabled: Accessor<boolean | undefined>;
  readOnly: Accessor<boolean | undefined>;
  required: Accessor<boolean | undefined>;
  form: Accessor<string | undefined>;
  name: Accessor<string | undefined>;
  checkedValue: Accessor<Value | undefined>;
  setCheckedValue: (
    value: Value,
    eventDetails: BaseUIChangeEventDetails<BaseUIEventReasons['none']>,
  ) => void;
  /**
   * Port note: upstream keeps `touched` in React state. It's only read by event handlers, and
   * Solid's batched signal writes wouldn't be visible to the `focus` handler that runs right after
   * the arrow key's `keydown`, so it's a plain mutable value read through this getter.
   */
  touched: () => boolean;
  setTouched: (touched: boolean) => void;
  validation?: UseFieldValidationReturnValue | undefined;
  registerInputRef: (element: HTMLInputElement | null) => (() => void) | undefined;
}

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const RadioGroupContext = createContext<RadioGroupContext<any> | null>(null);

export function useRadioGroupContext() {
  return useContext(RadioGroupContext) ?? undefined;
}
