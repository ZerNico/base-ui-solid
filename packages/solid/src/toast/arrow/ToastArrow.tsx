import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useToastPositionerContext } from '../positioner/ToastPositionerContext';
import type { BaseUIComponentProps } from '../../internals/types';
import type { Side, Align } from '../../internals/useAnchorPositioning';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Displays an element positioned against the toast anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui-solid.pages.dev/solid/components/toast)
 */
export function ToastArrow(componentProps: ToastArrow.Props): JSX.Element {
  const elementProps = omit(componentProps, 'class', 'render', 'style');

  const positioner = useToastPositionerContext();

  const state = createMemo<ToastArrowState>(
    () => ({
      side: positioner.side,
      align: positioner.align,
      uncentered: positioner.arrowUncentered,
    }),
    { equals: fastObjectShallowCompare },
  );

  return useRenderElement('div', componentProps, {
    state,
    ref: (element: HTMLDivElement | null) => {
      positioner.arrowRef.current = element;
    },
    props: () => [{ style: positioner.arrowStyles, 'aria-hidden': true }, elementProps],
  });
}

export interface ToastArrowState {
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

export interface ToastArrowProps extends BaseUIComponentProps<'div', ToastArrowState> {}

export namespace ToastArrow {
  export type State = ToastArrowState;
  export type Props = ToastArrowProps;
}
