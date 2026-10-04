import { createContext, useContext } from 'solid-js';
import type { useAnchorPositioning } from '../../internals/useAnchorPositioning';

export type NavigationMenuPositionerContext = ReturnType<typeof useAnchorPositioning>;

export const NavigationMenuPositionerContext =
  createContext<NavigationMenuPositionerContext | null>(null);

export function useNavigationMenuPositionerContext(
  optional: true,
): NavigationMenuPositionerContext | undefined;
export function useNavigationMenuPositionerContext(
  optional?: false,
): NavigationMenuPositionerContext;
export function useNavigationMenuPositionerContext(optional = false) {
  const context = useContext(NavigationMenuPositionerContext) ?? undefined;
  if (!context && !optional) {
    throw new Error(
      'Base UI: NavigationMenuPositionerContext is missing. NavigationMenuPositioner parts must be placed within <NavigationMenu.Positioner>.',
    );
  }
  return context;
}
