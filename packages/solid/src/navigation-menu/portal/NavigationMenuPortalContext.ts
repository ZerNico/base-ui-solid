import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';

// Port note: the value is a `keepMounted` accessor, and `null` stands in for upstream's
// `undefined` default (Solid treats an `undefined` default as "no default").
export const NavigationMenuPortalContext = createContext<Accessor<boolean> | null>(null);

export function useNavigationMenuPortalContext() {
  const value = useContext(NavigationMenuPortalContext) ?? undefined;
  if (value === undefined) {
    throw new Error('Base UI: <NavigationMenu.Portal> is missing.');
  }
  return value;
}
