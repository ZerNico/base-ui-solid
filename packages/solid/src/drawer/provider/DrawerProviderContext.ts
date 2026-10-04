import { createContext, useContext } from 'solid-js';

export interface DrawerProviderContext {
  setDrawerOpen: (drawer: object, open: boolean) => void;
  removeDrawer: (drawer: object) => void;
  active: () => boolean;
  visualStateStore: DrawerVisualStateStore;
}
export const DrawerProviderContext = createContext<DrawerProviderContext | null>(null);
export interface DrawerVisualState {
  swipeProgress: number;
  frontmostHeight: number;
}
export interface DrawerVisualStateStore {
  getSnapshot: () => DrawerVisualState;
  subscribe: (listener: () => void) => () => void;
  set: (state: Partial<DrawerVisualState>) => void;
}
export function useDrawerProviderContext() {
  return useContext(DrawerProviderContext) ?? undefined;
}
