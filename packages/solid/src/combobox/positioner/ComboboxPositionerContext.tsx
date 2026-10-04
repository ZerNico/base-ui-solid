import { createContext, useContext } from 'solid-js';
import type { UseAnchorPositioningReturnValue } from '../../internals/useAnchorPositioning';

/**
 * Port note: the reactive fields are getters (see `useAnchorPositioning`).
 */
export type ComboboxPositionerContext = Pick<
  UseAnchorPositioningReturnValue,
  | 'side'
  | 'align'
  | 'arrowRef'
  | 'arrowUncentered'
  | 'arrowStyles'
  | 'anchorHidden'
  | 'isPositioned'
>;

export const ComboboxPositionerContext = createContext<ComboboxPositionerContext | null>(null);

export function useComboboxPositionerContext(optional?: false): ComboboxPositionerContext;
export function useComboboxPositionerContext(optional: true): ComboboxPositionerContext | undefined;
export function useComboboxPositionerContext(optional?: boolean) {
  const context = useContext(ComboboxPositionerContext) ?? undefined;
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: <Combobox.Popup> and <Combobox.Arrow> must be used within the <Combobox.Positioner> component',
    );
  }
  return context;
}
