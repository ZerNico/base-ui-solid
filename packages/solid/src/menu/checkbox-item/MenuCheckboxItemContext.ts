import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';

export interface MenuCheckboxItemContextValue {
  checked: boolean;
  highlighted: boolean;
  disabled: boolean;
}

/**
 * Port note: the context holds an accessor to the item state rather than a snapshot.
 */
export type MenuCheckboxItemContext = Accessor<MenuCheckboxItemContextValue>;

export const MenuCheckboxItemContext = createContext<MenuCheckboxItemContext | null>(null);

export function useMenuCheckboxItemContext() {
  const context = useContext(MenuCheckboxItemContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: MenuCheckboxItemContext is missing. MenuCheckboxItem parts must be placed within <Menu.CheckboxItem>.',
    );
  }

  return context;
}
