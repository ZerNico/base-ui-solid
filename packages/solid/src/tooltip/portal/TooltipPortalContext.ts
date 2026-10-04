import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';

// Port note: the context holds an accessor of `keepMounted`, and `null` stands in for upstream's
// `undefined` default (Solid treats an `undefined` default as "no default").
export const TooltipPortalContext = createContext<Accessor<boolean> | null>(null);

export function useTooltipPortalContext() {
  const value = useContext(TooltipPortalContext) ?? undefined;
  if (value === undefined) {
    throw new Error('Base UI: <Tooltip.Portal> is missing.');
  }
  return value;
}
