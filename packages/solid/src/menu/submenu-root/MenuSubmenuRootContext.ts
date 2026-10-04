import { createContext, useContext } from 'solid-js';
import type { BaseUIEvent } from '../../internals/types';

export const MenuSubmenuRootContext = createContext<MenuSubmenuRootContext | null>(null);

export interface MenuSubmenuRootContext {
  /** The element that receives focus when the submenu closes; `false` leaves focus where it is. */
  getReturnElement?: (() => HTMLElement | null | false) | undefined;
  onTriggerKeyDown?: ((event: BaseUIEvent<KeyboardEvent>) => void) | undefined;
  onPopupKeyDown?: ((event: KeyboardEvent) => void) | undefined;
}

export function useMenuSubmenuRootContext(): MenuSubmenuRootContext | undefined {
  return useContext(MenuSubmenuRootContext) ?? undefined;
}
