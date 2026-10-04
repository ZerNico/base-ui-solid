import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useNavigationMenuPositionerContext } from '../positioner/NavigationMenuPositionerContext';
import { useDirection } from '../../internals/direction-context/DirectionContext';
import { popupTransitionStateMapping } from '../../utils/popupStateMapping';
import type { Align, Side } from '../../internals/useAnchorPositioning';
import { getDisabledMountTransitionStyles } from '../../internals/getDisabledMountTransitionStyles';

/**
 * A container for the navigation menu contents.
 * Renders a `<nav>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuPopup(componentProps: NavigationMenuPopup.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'id');

  const { open, transitionStatus, setPopupElement } = useNavigationMenuRootContext();
  const positioning = useNavigationMenuPositionerContext();
  const direction = useDirection();

  const generatedId = useBaseUiId();
  const id = () => componentProps.id ?? generatedId;

  const state = createMemo<NavigationMenuPopupState>(() => ({
    open: open(),
    transitionStatus: transitionStatus(),
    side: positioning.side,
    align: positioning.align,
    anchorHidden: positioning.anchorHidden,
  }));

  const style = (): JSX.CSSProperties => {
    // Ensure popup size transitions correctly when anchored to `bottom` (side=top) or `right` (side=left).
    let isPhysicalLeft = positioning.side === 'left';
    if (direction() === 'rtl') {
      isPhysicalLeft = isPhysicalLeft || positioning.side === 'inline-end';
    } else {
      isPhysicalLeft = isPhysicalLeft || positioning.side === 'inline-start';
    }
    const isOriginSide = positioning.side === 'top' || isPhysicalLeft;

    return isOriginSide
      ? {
          position: 'absolute',
          [positioning.side === 'top' ? 'bottom' : 'top']: '0',
          [isPhysicalLeft ? 'right' : 'left']: '0',
        }
      : {};
  };

  return useRenderElement('nav', componentProps, {
    state,
    ref: setPopupElement,
    props: () => [
      {
        id: id(),
        tabindex: -1,
        style: style(),
      },
      getDisabledMountTransitionStyles(transitionStatus()),
      elementProps,
    ],
    stateAttributesMapping: popupTransitionStateMapping,
  });
}

export interface NavigationMenuPopupState {
  /**
   * If `true`, the popup is open.
   */
  open: boolean;
  /**
   * The transition status of the popup.
   */
  transitionStatus: TransitionStatus;
  /**
   * The side of the anchor the popup is positioned on.
   */
  side: Side;
  /**
   * The alignment of the popup relative to the anchor.
   */
  align: Align;
  /**
   * Whether the anchor element is hidden.
   */
  anchorHidden: boolean;
}

export interface NavigationMenuPopupProps extends BaseUIComponentProps<
  'nav',
  NavigationMenuPopupState
> {}

export namespace NavigationMenuPopup {
  export type State = NavigationMenuPopupState;
  export type Props = NavigationMenuPopupProps;
}
