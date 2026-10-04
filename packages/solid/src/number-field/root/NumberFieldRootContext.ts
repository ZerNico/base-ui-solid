import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { NumberFieldRoot, NumberFieldRootState } from './NumberFieldRoot';
import type { EventWithOptionalKeyState, IncrementValueParameters } from '../utils/types';

export type InputMode = 'numeric' | 'decimal' | 'text';

type StateSetter<T> = (value: T | ((prev: T) => T)) => void;

// Port note: reactive values are exposed as accessors instead of render snapshots.
export interface NumberFieldRootContext {
  minWithDefault: Accessor<number>;
  maxWithDefault: Accessor<number>;
  id: Accessor<string | undefined>;
  setValue: (value: number | null, details: NumberFieldRoot.ChangeEventDetails) => boolean;
  getStepAmount: (event?: EventWithOptionalKeyState) => number;
  incrementValue: (amount: number, params: IncrementValueParameters) => boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  focusInput: () => void;
  allowInputSyncRef: RefObject<boolean | null>;
  formatOptionsRef: RefObject<Intl.NumberFormatOptions | undefined>;
  valueRef: RefObject<number | null>;
  lastChangedValueRef: RefObject<number | null>;
  hasPendingCommitRef: RefObject<boolean>;
  name: Accessor<string | undefined>;
  nameProp: Accessor<string | undefined>;
  inputMode: Accessor<InputMode>;
  getAllowedNonNumericKeys: () => Set<string>;
  min: Accessor<number | undefined>;
  max: Accessor<number | undefined>;
  setInputValue: StateSetter<string>;
  locale: Accessor<Intl.LocalesArgument>;
  setIsScrubbing: StateSetter<boolean>;
  state: Accessor<NumberFieldRootState>;
  onValueCommitted: (
    value: number | null,
    eventDetails: NumberFieldRoot.CommitEventDetails,
  ) => void;
}

export const NumberFieldRootContext = createContext<NumberFieldRootContext | null>(null);

export function useNumberFieldRootContext() {
  const context = useContext(NumberFieldRootContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: NumberFieldRootContext is missing. NumberField parts must be placed within <NumberField.Root>.',
    );
  }

  return context;
}
