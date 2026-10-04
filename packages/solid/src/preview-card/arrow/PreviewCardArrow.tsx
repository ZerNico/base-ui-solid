import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { usePreviewCardPositionerContext } from '../positioner/PreviewCardPositionerContext';
import type { BaseUIComponentProps } from '../../internals/types';
import type { Align, Side } from '../../internals/useAnchorPositioning';
import { popupStateMapping } from '../../utils/popupStateMapping';
import { useRenderElement } from '../../internals/useRenderElement';
import { usePreviewCardRootContext } from '../root/PreviewCardContext';

/**
 * Displays an element positioned against the preview card anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardArrow(componentProps: PreviewCardArrow.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = usePreviewCardRootContext();
  const positioner = usePreviewCardPositionerContext();

  const open = store.useState('open');

  const state = createMemo<PreviewCardArrowState>(() => ({
    open: open(),
    side: positioner.side,
    align: positioner.align,
    uncentered: positioner.arrowUncentered,
  }));

  return useRenderElement('div', componentProps, {
    state,
    ref: (element: HTMLDivElement | null) => {
      positioner.arrowRef.current = element;
    },
    props: () => [{ style: positioner.arrowStyles, 'aria-hidden': true }, elementProps],
    stateAttributesMapping: popupStateMapping,
  });
}

export interface PreviewCardArrowState {
  /**
   * Whether the preview card is currently open.
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

export interface PreviewCardArrowProps extends BaseUIComponentProps<'div', PreviewCardArrowState> {}

export namespace PreviewCardArrow {
  export type State = PreviewCardArrowState;
  export type Props = PreviewCardArrowProps;
}
