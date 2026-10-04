import { createMemo, omit } from 'solid-js';
import { useNavigationMenuPositionerContext } from '../positioner/NavigationMenuPositionerContext';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import type { Align, Side } from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '../../internals/types';
import { popupStateMapping } from '../../utils/popupStateMapping';
import { useRenderElement } from '../../internals/useRenderElement';
import { getDisabledMountTransitionStyles } from '../../internals/getDisabledMountTransitionStyles';

/**
 * Displays an element pointing toward the navigation menu's current anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuArrow(componentProps: NavigationMenuArrow.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { open, transitionStatus } = useNavigationMenuRootContext();
  // Port note: the positioning values are getters, so they aren't destructured.
  const positioning = useNavigationMenuPositionerContext();
  const { arrowRef } = positioning;

  const state = createMemo<NavigationMenuArrowState>(() => ({
    open: open(),
    side: positioning.side,
    align: positioning.align,
    uncentered: positioning.arrowUncentered,
  }));

  return useRenderElement('div', componentProps, {
    state,
    ref: (element: HTMLDivElement | null) => {
      arrowRef.current = element;
    },
    props: () => [
      { style: positioning.arrowStyles, 'aria-hidden': true },
      getDisabledMountTransitionStyles(transitionStatus()),
      elementProps,
    ],
    stateAttributesMapping: popupStateMapping,
  });
}

export interface NavigationMenuArrowState {
  /**
   * Whether the popup is currently open.
   */
  open: boolean;
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side;
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the arrow cannot be centered on the anchor.
   */
  uncentered: boolean;
}

export interface NavigationMenuArrowProps extends BaseUIComponentProps<
  'div',
  NavigationMenuArrowState
> {}

export namespace NavigationMenuArrow {
  export type State = NavigationMenuArrowState;
  export type Props = NavigationMenuArrowProps;
}
