import type { JSX } from '@solidjs/web';
import { createSignal, untrack } from 'solid-js';
import type { DrawerVisualState, DrawerVisualStateStore } from './DrawerProviderContext';
import { DrawerProviderContext } from './DrawerProviderContext';
/**
 * Provides a shared context for coordinating global Drawer UI, such as indent/background effects based on whether any Drawer is open.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Drawer](https://base-ui-solid.pages.dev/solid/components/drawer)
 */
export function DrawerProvider(props: DrawerProvider.Props) {
  const openDrawers = new Set<object>();
  const [active, setActive] = createSignal(false, { ownedWrite: true });
  const [visualStateStore] = createSignal(createVisualStateStore(), { ownedWrite: true });
  const setDrawerOpen = (drawer: object, open: boolean) => {
    if (openDrawers.has(drawer) === open) {
      return;
    }
    const wasActive = openDrawers.size > 0;
    if (open) {
      openDrawers.add(drawer);
    } else {
      openDrawers.delete(drawer);
    }
    const isActive = openDrawers.size > 0;
    if (isActive !== wasActive) {
      setActive(isActive);
    }
  };
  const removeDrawer = (drawer: object) => {
    setDrawerOpen(drawer, false);
  };
  const contextValue = {
    setDrawerOpen,
    removeDrawer,
    active,
    visualStateStore: untrack(visualStateStore),
  };
  return <DrawerProviderContext value={contextValue}>{props.children}</DrawerProviderContext>;
}
export interface DrawerProviderState {}
export interface DrawerProviderProps {
  children?: JSX.Element | undefined;
}
export namespace DrawerProvider {
  export type State = DrawerProviderState;
  export type Props = DrawerProviderProps;
}
type VisualStateListener = () => void;
function createVisualStateStore(): DrawerVisualStateStore {
  let state: DrawerVisualState = {
    swipeProgress: 0,
    frontmostHeight: 0,
  };
  const listeners = new Set<VisualStateListener>();
  return {
    getSnapshot: () => state,
    set(nextState) {
      let nextSwipeProgress = state.swipeProgress;
      if (nextState.swipeProgress !== undefined) {
        nextSwipeProgress = Number.isFinite(nextState.swipeProgress) ? nextState.swipeProgress : 0;
      }
      let nextFrontmostHeight = state.frontmostHeight;
      if (nextState.frontmostHeight !== undefined) {
        nextFrontmostHeight = Number.isFinite(nextState.frontmostHeight)
          ? nextState.frontmostHeight
          : 0;
      }
      if (
        nextSwipeProgress === state.swipeProgress &&
        nextFrontmostHeight === state.frontmostHeight
      ) {
        return;
      }
      state = {
        swipeProgress: nextSwipeProgress,
        frontmostHeight: nextFrontmostHeight,
      };
      listeners.forEach((listener) => {
        listener();
      });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () =>
        untrack(() => {
          listeners.delete(listener);
        });
    },
  };
}
