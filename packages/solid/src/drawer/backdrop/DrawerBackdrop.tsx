import type { JSX } from '@solidjs/web';
import { createMemo, omit } from 'solid-js';
import { useDialogRootContext } from '../../dialog/root/DialogRootContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { popupTransitionStateMapping } from '../../utils/popupStateMapping';
import * as DrawerPopupCssVars from '../popup/DrawerPopupCssVars';
import * as DrawerBackdropCssVars from './DrawerBackdropCssVars';
/**
 * An overlay displayed beneath the popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui-solid.pages.dev/solid/components/drawer)
 */
export const DrawerBackdrop = function DrawerBackdrop(componentProps: DrawerBackdrop.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'forceRender');
  const store = useDialogRootContext();
  const open = store.useState('open');
  const nested = store.useState('nested');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');
  const state = createMemo<DrawerBackdropState>(() => ({
    open: open(),
    transitionStatus: transitionStatus(),
  }));
  return useRenderElement('div', componentProps, {
    state,
    ref: (element) => {
      store.context.backdropRef.current = element;
    },
    stateAttributesMapping: popupTransitionStateMapping,
    props: () => [
      {
        role: 'presentation',
        hidden: !mounted(),
        style: {
          'pointer-events': !open() ? 'none' : undefined,
          'user-select': 'none',
          '-webkit-user-select': 'none',
          [DrawerBackdropCssVars.swipeProgress]: '0',
          [DrawerPopupCssVars.swipeStrength]: '1',
        } as JSX.CSSProperties,
      },
      elementProps,
    ],
    enabled: () => (componentProps.forceRender ?? false) || !nested(),
  });
};
export interface DrawerBackdropProps extends BaseUIComponentProps<'div', DrawerBackdropState> {
  /**
   * Whether the backdrop is forced to render even when nested.
   * @default false
   */
  forceRender?: boolean | undefined;
}
export interface DrawerBackdropState {
  /**
   * Whether the drawer is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}
export namespace DrawerBackdrop {
  export type Props = DrawerBackdropProps;
  export type State = DrawerBackdropState;
}
