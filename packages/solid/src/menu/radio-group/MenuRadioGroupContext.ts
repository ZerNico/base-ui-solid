import { createContext, useContext } from 'solid-js';
import type { MenuRoot } from '../root/MenuRoot';

/**
 * Port note: the context value is a stable object; `value` and `disabled` are getters.
 */
export interface MenuRadioGroupContext {
  value: any;
  setValue: (newValue: any, eventDetails: MenuRoot.ChangeEventDetails) => void;
  disabled: boolean;
}

export const MenuRadioGroupContext = createContext<MenuRadioGroupContext | null>(null);

export function useMenuRadioGroupContext() {
  const context = useContext(MenuRadioGroupContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: MenuRadioGroupContext is missing. MenuRadioGroup parts must be placed within <Menu.RadioGroup>.',
    );
  }

  return context;
}
