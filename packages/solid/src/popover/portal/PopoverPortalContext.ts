import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';

// Solid treats an `undefined` default as "no default" (reading it without a provider throws),
// so `null` stands in for upstream's `undefined` default. The value is a `keepMounted` accessor.
export const PopoverPortalContext = createContext<Accessor<boolean> | null>(null);

export function usePopoverPortalContext() {
  const value = useContext(PopoverPortalContext) ?? undefined;
  if (value === undefined) {
    throw new Error('Base UI: <Popover.Portal> is missing.');
  }
  return value;
}
