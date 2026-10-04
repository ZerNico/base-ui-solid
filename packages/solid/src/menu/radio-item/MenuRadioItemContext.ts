import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';

export interface MenuRadioItemContextValue {
  checked: boolean;
  highlighted: boolean;
  disabled: boolean;
}

/**
 * Port note: the context holds an accessor to the item state rather than a snapshot.
 */
export type MenuRadioItemContext = Accessor<MenuRadioItemContextValue>;

export const MenuRadioItemContext = createContext<MenuRadioItemContext | null>(null);

export function useMenuRadioItemContext() {
  const context = useContext(MenuRadioItemContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: MenuRadioItemContext is missing. MenuRadioItem parts must be placed within <Menu.RadioItem>.',
    );
  }

  return context;
}
