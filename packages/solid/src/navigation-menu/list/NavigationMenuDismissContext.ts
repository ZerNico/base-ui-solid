import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { ElementProps } from '../../floating-ui-react';

/**
 * Port note: the value is an accessor of the dismiss props (`undefined` while there's no active
 * trigger), and `null` stands in for upstream's `undefined` default.
 */
export const NavigationMenuDismissContext = createContext<Accessor<
  ElementProps | undefined
> | null>(null);

export function useNavigationMenuDismissContext() {
  return useContext(NavigationMenuDismissContext) ?? undefined;
}
