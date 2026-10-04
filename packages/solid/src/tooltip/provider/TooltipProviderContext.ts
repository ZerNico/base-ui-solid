import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';

/**
 * Holds the provider's `delay` value. `closeDelay` is handled by the delay group.
 *
 * Port note: holds an accessor of the value (`null` when there's no provider).
 */
export const TooltipProviderContext = createContext<Accessor<number | undefined> | null>(null);

export function useTooltipProviderContext(): Accessor<number | undefined> {
  const context = useContext(TooltipProviderContext);
  return context ?? (() => undefined);
}
