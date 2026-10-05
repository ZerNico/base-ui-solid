import { createMemo, omit } from 'solid-js';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import { popupTransitionStateMapping } from '../../utils/popupStateMapping';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useContextMenuRootContext } from '../../context-menu/root/ContextMenuRootContext';
import { REASONS } from '../../internals/reasons';

/**
 * An overlay displayed beneath the menu popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuBackdrop(componentProps: MenuBackdrop.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { store } = useMenuRootContext();
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');

  const contextMenuContext = useContextMenuRootContext();

  const state = createMemo<MenuBackdropState>(
    () => ({
      open: open(),
      transitionStatus: transitionStatus(),
    }),
    { equals: fastObjectShallowCompare },
  );

  return useRenderElement('div', componentProps, {
    // Port note: the forwarded ref is part of `elementProps`; the context menu's ref object is
    // set through a callback.
    ref: contextMenuContext?.backdropRef
      ? (element: HTMLDivElement | null) => {
          contextMenuContext.backdropRef.current = element;
        }
      : undefined,
    state,
    stateAttributesMapping: popupTransitionStateMapping,
    props: () => [
      {
        role: 'presentation',
        hidden: !mounted(),
        style: {
          'pointer-events': lastOpenChangeReason() === REASONS.triggerHover ? 'none' : undefined,
          'user-select': 'none',
          '-webkit-user-select': 'none',
        },
      },
      elementProps,
    ],
  });
}

export interface MenuBackdropState {
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface MenuBackdropProps extends BaseUIComponentProps<'div', MenuBackdropState> {}

export namespace MenuBackdrop {
  export type State = MenuBackdropState;
  export type Props = MenuBackdropProps;
}
