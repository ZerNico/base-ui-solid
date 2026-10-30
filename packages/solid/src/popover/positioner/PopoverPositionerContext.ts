import { createContext, useContext } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { Side, Align } from '../../internals/useAnchorPositioning';
import type { PopupPositioningContext } from '../../utils/popups/types';

/**
 * Port note: `side`, `align`, `arrowUncentered` and `arrowStyles` are getters (the value is the
 * object returned by `useAnchorPositioning`): read them in a reactive scope.
 */
export interface PopoverPositionerContext {
  readonly side: Side;
  readonly align: Align;
  arrowRef: (element: Element | null) => void;
  readonly arrowUncentered: boolean;
  readonly arrowStyles: JSX.CSSProperties;
  context: PopupPositioningContext;
}

export const PopoverPositionerContext = createContext<PopoverPositionerContext | null>(null);

export function usePopoverPositionerContext() {
  const context = useContext(PopoverPositionerContext) ?? undefined;
  if (!context) {
    throw new Error(
      'Base UI: PopoverPositionerContext is missing. PopoverPositioner parts must be placed within <Popover.Positioner>.',
    );
  }
  return context;
}
