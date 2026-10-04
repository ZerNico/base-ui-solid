import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';

export interface SelectGroupContext {
  labelId: Accessor<string | undefined>;
  setLabelId: (
    value: string | undefined | ((prev: string | undefined) => string | undefined),
  ) => void;
}

export const SelectGroupContext = createContext<SelectGroupContext | null>(null);

export function useSelectGroupContext() {
  const context = useContext(SelectGroupContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: SelectGroupContext is missing. SelectGroup parts must be placed within <Select.Group>.',
    );
  }
  return context;
}
