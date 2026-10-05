import { createMemo, omit } from 'solid-js';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { popupTransitionStateMapping } from '../../utils/popupStateMapping';

/**
 * A backdrop for the navigation menu popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui-solid.pages.dev/solid/components/navigation-menu)
 */
export function NavigationMenuBackdrop(componentProps: NavigationMenuBackdrop.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { open, mounted, transitionStatus } = useNavigationMenuRootContext();

  const state = createMemo<NavigationMenuBackdropState>(() => ({
    open: open(),
    transitionStatus: transitionStatus(),
  }));

  return useRenderElement('div', componentProps, {
    state,
    props: () => [
      {
        role: 'presentation',
        hidden: !mounted(),
        style: {
          'user-select': 'none',
          '-webkit-user-select': 'none',
        },
      },
      elementProps,
    ],
    stateAttributesMapping: popupTransitionStateMapping,
  });
}

export interface NavigationMenuBackdropState {
  /**
   * If `true`, the popup is open.
   */
  open: boolean;
  /**
   * The transition status of the popup.
   */
  transitionStatus: TransitionStatus;
}

export interface NavigationMenuBackdropProps extends BaseUIComponentProps<
  'div',
  NavigationMenuBackdropState
> {}

export namespace NavigationMenuBackdrop {
  export type State = NavigationMenuBackdropState;
  export type Props = NavigationMenuBackdropProps;
}
