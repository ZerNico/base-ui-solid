import { type Accessor, createContext, useContext } from 'solid-js';
import type { AccordionRoot } from './AccordionRoot';

export interface AccordionRootContext<Value = any> {
  disabled: Accessor<boolean>;
  handleValueChange: (
    newValue: AccordionRoot.Value<Value>[number],
    nextOpen: boolean,
    eventDetails: AccordionRoot.ChangeEventDetails,
  ) => void;
  hiddenUntilFound: Accessor<boolean>;
  keepMounted: Accessor<boolean>;
  state: Accessor<AccordionRoot.State<Value>>;
  value: Accessor<AccordionRoot.Value<Value>>;
}

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const AccordionRootContext = createContext<AccordionRootContext<any> | null>(null);

export function useAccordionRootContext<Value = any>() {
  const context = (useContext(AccordionRootContext) ?? undefined) as
    AccordionRootContext<Value> | undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: AccordionRootContext is missing. Accordion parts must be placed within <Accordion.Root>.',
    );
  }
  return context;
}
