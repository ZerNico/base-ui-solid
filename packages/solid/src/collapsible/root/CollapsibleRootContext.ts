import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { UseCollapsibleRootReturnValue } from './useCollapsibleRoot';
import type { CollapsibleRoot, CollapsibleRootState } from './CollapsibleRoot';

export interface CollapsibleRootContext extends UseCollapsibleRootReturnValue {
  onOpenChange: (open: boolean, eventDetails: CollapsibleRoot.ChangeEventDetails) => void;
  state: Accessor<CollapsibleRootState>;
}

// Solid treats an `undefined` default as "no default" (reading it without a provider throws),
// so `null` stands in for upstream's `undefined` default.
export const CollapsibleRootContext = createContext<CollapsibleRootContext | null>(null);

export function useCollapsibleRootContext() {
  const context = useContext(CollapsibleRootContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: CollapsibleRootContext is missing. Collapsible parts must be placed within <Collapsible.Root>.',
    );
  }

  return context;
}
