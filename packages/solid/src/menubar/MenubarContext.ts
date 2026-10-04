import { createContext, useContext } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { MenuRoot } from '../menu/root/MenuRoot';

/**
 * Port note: the context value is a stable object whose reactive values (`modal`, `disabled`,
 * `contentElement`, `hasSubmenuOpen`, `orientation`, `rootId`) are getters.
 */
export interface MenubarContext {
  modal: boolean;
  disabled: boolean;
  contentElement: HTMLElement | null;
  setContentElement: (element: HTMLElement | null) => void;
  hasSubmenuOpen: boolean;
  setHasSubmenuOpen: (open: boolean) => void;
  orientation: MenuRoot.Orientation;
  allowMouseUpTriggerRef: RefObject<boolean>;
  rootId: string | undefined;
}

export const MenubarContext = createContext<MenubarContext | null>(null);

export function useMenubarContext(optional?: false): MenubarContext;
export function useMenubarContext(optional: true): MenubarContext | null;
export function useMenubarContext(optional?: boolean) {
  const context = useContext(MenubarContext);
  if (context === null && !optional) {
    throw new Error(
      'Base UI: MenubarContext is missing. Menubar parts must be placed within <Menubar>.',
    );
  }

  return context;
}
