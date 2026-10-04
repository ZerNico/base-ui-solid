import { createContext, useContext } from 'solid-js';
import type { UseAnchorPositioningReturnValue } from '../../internals/useAnchorPositioning';

/**
 * Port note: the reactive fields are getters (see `UseAnchorPositioningReturnValue`).
 */
export type PreviewCardPositionerContext = Pick<
  UseAnchorPositioningReturnValue,
  'side' | 'align' | 'arrowRef' | 'arrowUncentered' | 'arrowStyles'
>;

export const PreviewCardPositionerContext = createContext<PreviewCardPositionerContext | null>(
  null,
);

export function usePreviewCardPositionerContext() {
  const context = useContext(PreviewCardPositionerContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: PreviewCardPositionerContext is missing. PreviewCardPositioner parts must be placed within <PreviewCard.Positioner>.',
    );
  }
  return context;
}
