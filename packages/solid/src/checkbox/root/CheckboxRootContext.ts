import { type Accessor, createContext, useContext } from 'solid-js';
import type { CheckboxRootState } from './CheckboxRoot';

/**
 * Port note: the context holds an accessor to the root state rather than a snapshot.
 */
export type CheckboxRootContext = Accessor<CheckboxRootState>;

export const CheckboxRootContext = createContext<CheckboxRootContext | null>(null);

export function useCheckboxRootContext() {
  const context = useContext(CheckboxRootContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: CheckboxRootContext is missing. Checkbox parts must be placed within <Checkbox.Root>.',
    );
  }

  return context;
}
