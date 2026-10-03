import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { RadioRootState } from './RadioRoot';

// Port note: the context holds an accessor to the root state instead of a snapshot.
export type RadioRootContext = Accessor<RadioRootState>;

export const RadioRootContext = createContext<RadioRootContext | null>(null);

export function useRadioRootContext() {
  const value = useContext(RadioRootContext) ?? undefined;
  if (value === undefined) {
    throw new Error(
      'Base UI: RadioRootContext is missing. Radio parts must be placed within <Radio.Root>.',
    );
  }

  return value;
}
