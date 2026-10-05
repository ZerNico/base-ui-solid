import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { JSX } from '@solidjs/web';
import { createMemo, omit, untrack } from 'solid-js';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import * as DrawerBackdropCssVars from '../backdrop/DrawerBackdropCssVars';
import * as DrawerPopupCssVars from '../popup/DrawerPopupCssVars';
import { useDrawerProviderContext } from '../provider/DrawerProviderContext';

const stateAttributesMapping: StateAttributesMapping<DrawerIndentState> = {
  active(value): Record<string, string> | null {
    if (value) {
      return { 'data-active': '' };
    }
    return { 'data-inactive': '' };
  },
};
/**
 * A wrapper element intended to contain your app's main UI.
 * Applies `data-active` when any drawer within the nearest `<Drawer>` is open.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui-solid.pages.dev/solid/components/drawer)
 */
export const DrawerIndent = function DrawerIndent(componentProps: DrawerIndent.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');
  const providerContext = useDrawerProviderContext();
  const active = createMemo(() => providerContext?.active() ?? false);
  const visualStateStore = providerContext?.visualStateStore;
  const indentRef: RefObject<HTMLDivElement | null | null> = { current: null };
  useIsoLayoutEffect(
    () => {
      const element = indentRef.current;
      if (!element || !visualStateStore) {
        return undefined;
      }
      const syncVisualState = () => {
        const { swipeProgress, frontmostHeight } = visualStateStore.getSnapshot();
        if (swipeProgress <= 0) {
          element.style.setProperty(DrawerBackdropCssVars.swipeProgress, '0');
        } else {
          element.style.setProperty(DrawerBackdropCssVars.swipeProgress, `${swipeProgress}`);
        }
        if (frontmostHeight <= 0) {
          element.style.removeProperty(DrawerPopupCssVars.height);
        } else {
          element.style.setProperty(DrawerPopupCssVars.height, `${frontmostHeight}px`);
        }
      };
      syncVisualState();
      const unsubscribe = visualStateStore.subscribe(syncVisualState);
      return () =>
        untrack(() => {
          unsubscribe();
          element.style.setProperty(DrawerBackdropCssVars.swipeProgress, '0');
          element.style.removeProperty(DrawerPopupCssVars.height);
        });
    },
    () => [visualStateStore],
  );
  const state = createMemo<DrawerIndentState>(() => ({
    active: active(),
  }));
  return useRenderElement('div', componentProps, {
    ref: (element) => {
      indentRef.current = element;
    },
    state,
    props: () => [
      {
        style: {
          [DrawerBackdropCssVars.swipeProgress]: '0',
        } as JSX.CSSProperties,
      },
      elementProps,
    ],
    stateAttributesMapping,
  });
};
export interface DrawerIndentState {
  /**
   * Whether any drawer within the nearest <Drawer> is open.
   */
  active: boolean;
}
export interface DrawerIndentProps extends BaseUIComponentProps<'div', DrawerIndentState> {}
export namespace DrawerIndent {
  export type State = DrawerIndentState;
  export type Props = DrawerIndentProps;
}
