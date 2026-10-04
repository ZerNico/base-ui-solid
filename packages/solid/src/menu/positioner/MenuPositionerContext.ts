import { createContext, useContext } from 'solid-js';
import type { UseAnchorPositioningReturnValue } from '../../internals/useAnchorPositioning';

/**
 * Port note: the context value is the object returned by `useAnchorPositioning`, whose reactive
 * values are getters.
 */
export type MenuPositionerContext = Pick<
  UseAnchorPositioningReturnValue,
  'side' | 'align' | 'arrowRef' | 'arrowUncentered' | 'arrowStyles' | 'context'
>;

export const MenuPositionerContext = createContext<MenuPositionerContext | null>(null);

export function useMenuPositionerContext(optional?: false): MenuPositionerContext;
export function useMenuPositionerContext(optional: true): MenuPositionerContext | undefined;
export function useMenuPositionerContext(optional?: boolean) {
  const context = useContext(MenuPositionerContext) ?? undefined;
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: MenuPositionerContext is missing. MenuPositioner parts must be placed within <Menu.Positioner>.',
    );
  }
  return context;
}
