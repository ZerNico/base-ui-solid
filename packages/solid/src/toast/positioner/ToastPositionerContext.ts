import { createContext, useContext } from 'solid-js';
import type { UseAnchorPositioningReturnValue } from '../../internals/useAnchorPositioning';

/**
 * Port note: the reactive fields are getters (see `useAnchorPositioning`).
 */
export type ToastPositionerContext = Pick<
  UseAnchorPositioningReturnValue,
  'side' | 'align' | 'arrowRef' | 'arrowUncentered' | 'arrowStyles'
>;

export const ToastPositionerContext = createContext<ToastPositionerContext | null>(null);

export function useToastPositionerContext() {
  const context = useContext(ToastPositionerContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: ToastPositionerContext is missing. ToastPositioner parts must be placed within <Toast.Positioner>.',
    );
  }
  return context;
}
