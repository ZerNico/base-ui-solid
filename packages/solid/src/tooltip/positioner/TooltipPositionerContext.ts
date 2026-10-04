import { createContext, useContext } from 'solid-js';
import type { UseAnchorPositioningReturnValue } from '../../internals/useAnchorPositioning';

/**
 * Port note: the reactive fields are getters (see `UseAnchorPositioningReturnValue`).
 */
export type TooltipPositionerContext = Pick<
  UseAnchorPositioningReturnValue,
  'side' | 'align' | 'arrowRef' | 'arrowUncentered' | 'arrowStyles'
>;

export const TooltipPositionerContext = createContext<TooltipPositionerContext | null>(null);

export function useTooltipPositionerContext() {
  const context = useContext(TooltipPositionerContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: TooltipPositionerContext is missing. TooltipPositioner parts must be placed within <Tooltip.Positioner>.',
    );
  }
  return context;
}
