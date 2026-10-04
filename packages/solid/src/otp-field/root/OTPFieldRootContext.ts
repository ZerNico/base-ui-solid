import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { OTPFieldRoot, OTPFieldRootState } from './OTPFieldRoot';
import type { OTPFieldInputState } from '../input/OTPFieldInput';

type StateSetter<T> = (value: T | ((prev: T) => T)) => void;

/**
 * Port note: reactive values are accessors (see PORTING.md).
 */
export interface OTPFieldRootContext {
  activeIndex: Accessor<number>;
  autoComplete: Accessor<string | undefined>;
  disabled: Accessor<boolean>;
  form: Accessor<string | undefined>;
  focusInput: (index: number) => void;
  queueFocusInput: (index: number, value: string) => void;
  getInputId: (index: number) => string | undefined;
  handleInputBlur: (event: FocusEvent) => void;
  handleInputFocus: (index: number, event: FocusEvent) => void;
  inputMode: Accessor<JSX.HTMLAttributes<HTMLInputElement>['inputmode']>;
  inputAriaLabelledBy: Accessor<string | undefined>;
  invalid: Accessor<boolean | undefined>;
  length: Accessor<number>;
  mask: Accessor<boolean>;
  pattern: Accessor<string | undefined>;
  reportValueInvalid: (value: string, details: OTPFieldRoot.InvalidEventDetails) => void;
  readOnly: Accessor<boolean>;
  required: Accessor<boolean>;
  normalizeValue: Accessor<((value: string) => string) | undefined>;
  setFocused: StateSetter<boolean>;
  setValue: (value: string, details: OTPFieldRoot.ChangeEventDetails) => string | null;
  state: Accessor<OTPFieldRootState>;
  validationType: Accessor<OTPFieldRoot.ValidationType>;
  value: Accessor<string>;
}

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const OTPFieldRootContext = createContext<OTPFieldRootContext | null>(null);

export function useOTPFieldRootContext() {
  const context = useContext(OTPFieldRootContext) ?? undefined;

  if (context === undefined) {
    throw new Error(
      'Base UI: OTPFieldRootContext is missing. OTPField parts must be placed within <OTPField.Root>.',
    );
  }

  return context;
}

export function getOTPFieldInputState(
  state: OTPFieldRootState,
  value: string,
  index: number,
): OTPFieldInputState {
  return {
    ...state,
    value,
    index,
    filled: value !== '',
  };
}
