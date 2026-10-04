import { createContext, useContext } from 'solid-js';
import type { Setter } from 'solid-js';

export type MenuGroupContext = Setter<string | undefined>;

export const MenuGroupContext = createContext<MenuGroupContext | null>(null);

export function useMenuGroupRootContext() {
  const context = useContext(MenuGroupContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: MenuGroupContext is missing. Menu group parts must be used within <Menu.Group> or <Menu.RadioGroup>.',
    );
  }

  return context;
}
