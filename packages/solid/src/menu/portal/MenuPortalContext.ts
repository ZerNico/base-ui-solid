import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';

/**
 * Port note: the context holds an accessor to `keepMounted`.
 */
export const MenuPortalContext = createContext<Accessor<boolean> | null>(null);

export function useMenuPortalContext() {
  const value = useContext(MenuPortalContext) ?? undefined;
  if (value === undefined) {
    throw new Error('Base UI: <Menu.Portal> is missing.');
  }
  return value;
}
