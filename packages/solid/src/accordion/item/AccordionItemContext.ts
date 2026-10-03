import { type Accessor, type Setter, createContext, useContext } from 'solid-js';
import type { AccordionItemState } from './AccordionItem';

export interface AccordionItemContext {
  defaultTriggerId?: string | undefined;
  open: Accessor<boolean>;
  state: Accessor<AccordionItemState>;
  setTriggerId: Setter<string | null | undefined>;
  triggerId: Accessor<string | undefined>;
}

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const AccordionItemContext = createContext<AccordionItemContext | null>(null);

export function useAccordionItemContext() {
  const context = useContext(AccordionItemContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: AccordionItemContext is missing. Accordion parts must be placed within <Accordion.Item>.',
    );
  }
  return context;
}
