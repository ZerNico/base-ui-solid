import type { JSX } from '@solidjs/web';
import { createContext, useContext } from 'solid-js';

interface DrawerViewportContextValue {
  swiping: () => boolean;
  getDragStyles: () => JSX.CSSProperties;
  swipeStrength: () => number | null;
  setSwipeDismissed: (dismissed: boolean) => void;
}
export const DrawerViewportContext = createContext<DrawerViewportContextValue | null>(null);
export function useDrawerViewportContext() {
  return useContext(DrawerViewportContext) ?? undefined;
}
