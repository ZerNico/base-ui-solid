import { createMemo, omit } from 'solid-js';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import type { Side, Align } from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '../../internals/types';
import { popupStateMapping } from '../../utils/popupStateMapping';

/**
 * Displays an element positioned against the menu anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuArrow(componentProps: MenuArrow.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { store } = useMenuRootContext();
  const positioner = useMenuPositionerContext();
  const open = store.useState('open');

  const state = createMemo<MenuArrowState>(() => ({
    open: open(),
    side: positioner.side,
    align: positioner.align,
    uncentered: positioner.arrowUncentered,
  }));

  return useRenderElement('div', componentProps, {
    ref: (element: HTMLDivElement | null) => {
      positioner.arrowRef.current = element;
    },
    stateAttributesMapping: popupStateMapping,
    state,
    props: () => [
      {
        style: positioner.arrowStyles,
        'aria-hidden': true,
      },
      elementProps,
    ],
  });
}

export interface MenuArrowState {
  /**
   * Whether the menu is currently open.
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

export interface MenuArrowProps extends BaseUIComponentProps<'div', MenuArrowState> {}

export namespace MenuArrow {
  export type State = MenuArrowState;
  export type Props = MenuArrowProps;
}
