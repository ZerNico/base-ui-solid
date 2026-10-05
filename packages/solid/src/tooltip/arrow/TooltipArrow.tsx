import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useTooltipPositionerContext } from '../positioner/TooltipPositionerContext';
import type { BaseUIComponentProps } from '../../internals/types';
import type { Side, Align } from '../../internals/useAnchorPositioning';
import { popupStateMapping } from '../../utils/popupStateMapping';
import { useRenderElement } from '../../internals/useRenderElement';
import { useTooltipRootContext } from '../root/TooltipRootContext';

/**
 * Displays an element positioned against the tooltip anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tooltip](https://base-ui-solid.pages.dev/solid/components/tooltip)
 */
export function TooltipArrow(componentProps: TooltipArrow.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = useTooltipRootContext();
  const positioner = useTooltipPositionerContext();

  const open = store.useState('open');
  const instantType = store.useState('instantType');

  const state = createMemo<TooltipArrowState>(
    () => ({
      open: open(),
      side: positioner.side,
      align: positioner.align,
      uncentered: positioner.arrowUncentered,
      instant: instantType(),
    }),
    { equals: fastObjectShallowCompare },
  );

  return useRenderElement('div', componentProps, {
    state,
    ref: (element: HTMLDivElement | null) => {
      positioner.arrowRef.current = element;
    },
    props: () => [{ style: positioner.arrowStyles, 'aria-hidden': true }, elementProps],
    stateAttributesMapping: popupStateMapping,
  });
}

export interface TooltipArrowState {
  /**
   * Whether the tooltip is currently open.
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
  /**
   * Whether transitions should be skipped.
   */
  instant: 'delay' | 'dismiss' | 'focus' | undefined;
}

export interface TooltipArrowProps extends BaseUIComponentProps<'div', TooltipArrowState> {}

export namespace TooltipArrow {
  export type State = TooltipArrowState;
  export type Props = TooltipArrowProps;
}
