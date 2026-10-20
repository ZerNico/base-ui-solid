import { createContext, useContext } from 'solid-js';
import type { MenuStore } from '../store/MenuStore';
import type { MenuParent, MenuRoot } from './MenuRoot';

/**
 * Port note: the context value is a stable object. Values that come from props (`orientation`,
 * `loopFocus`, `allowEscape`, `virtualFocus`, …) are getters: read them in a
 * reactive scope.
 */
export interface MenuRootContext<Payload = unknown> {
  store: MenuStore<Payload>;
  parent: MenuParent;
  orientation: MenuRoot.Orientation;
  loopFocus: boolean;
  /** Whether arrow keys can step from either end of the list back to a virtual focus owner. */
  allowEscape: boolean;
  defaultFloatingId: string | undefined;
  /** Records the id the popup rendered with, when it differs from `defaultFloatingId`. */
  setRenderedFloatingId: (id: string | undefined) => void;
  virtualFocus: boolean;
  parentVirtualFocus: boolean;
  /**
   * Called when the item registry settles: publishes the items for the derived highlight and
   * re-emits `onItemHighlighted`.
   */
  onItemsChange: () => void;
}

export const MenuRootContext = createContext<MenuRootContext | null>(null);

export function useMenuRootContext(optional?: false): MenuRootContext;
export function useMenuRootContext(optional: true): MenuRootContext | undefined;
export function useMenuRootContext(optional?: boolean) {
  const context = useContext(MenuRootContext) ?? undefined;
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: MenuRootContext is missing. Menu parts must be placed within <Menu.Root>.',
    );
  }
  return context;
}
