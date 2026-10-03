import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';

export interface FieldsetRootContext {
  legendId: Accessor<string | undefined>;
  setLegendId: (
    value: string | undefined | ((prev: string | undefined) => string | undefined),
  ) => void;
  disabled: Accessor<boolean>;
}

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const FieldsetRootContext = createContext<FieldsetRootContext | null>(null);

export function useFieldsetRootContext(optional: true): FieldsetRootContext | undefined;
export function useFieldsetRootContext(optional?: false): FieldsetRootContext;
export function useFieldsetRootContext(optional = false) {
  const context = useContext(FieldsetRootContext) ?? undefined;
  if (!context && !optional) {
    throw new Error(
      'Base UI: FieldsetRootContext is missing. Fieldset parts must be placed within <Fieldset.Root>.',
    );
  }
  return context;
}
