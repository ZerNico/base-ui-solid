import { createMemo, omit } from 'solid-js';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { usePopoverPositionerContext } from '../positioner/PopoverPositionerContext';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import type { Align, Side } from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '../../internals/types';
import { popupStateMapping } from '../../utils/popupStateMapping';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Displays an element positioned against the popover anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui-solid.pages.dev/solid/components/popover)
 */
export function PopoverArrow(componentProps: PopoverArrow.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = usePopoverRootContext();
  const open = store.useState('open');
  const positioner = usePopoverPositionerContext();

  const state = createMemo<PopoverArrowState>(
    () => ({
      open: open(),
      side: positioner.side,
      align: positioner.align,
      uncentered: positioner.arrowUncentered,
    }),
    { equals: fastObjectShallowCompare },
  );

  const element = useRenderElement('div', componentProps, {
    state,
    ref: (element: HTMLElement | null) => {
      positioner.arrowRef.current = element;
    },
    props: () => [{ style: positioner.arrowStyles, 'aria-hidden': true }, elementProps],
    stateAttributesMapping: popupStateMapping,
  });

  return element;
}

export interface PopoverArrowState {
  /**
   * Whether the popover is currently open.
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

export interface PopoverArrowProps extends BaseUIComponentProps<'div', PopoverArrowState> {}

export namespace PopoverArrow {
  export type State = PopoverArrowState;
  export type Props = PopoverArrowProps;
}
