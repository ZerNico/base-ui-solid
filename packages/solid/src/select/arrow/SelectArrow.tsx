import { createMemo, omit } from 'solid-js';
import { useSelectPositionerContext } from '../positioner/SelectPositionerContext';
import { useSelectRootContext } from '../root/SelectRootContext';
import type { BaseUIComponentProps } from '../../internals/types';
import type { Align, Side } from '../../internals/useAnchorPositioning';
import { popupTransitionStateMapping } from '../../utils/popupStateMapping';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Displays an element positioned against the select popup anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectArrow(componentProps: SelectArrow.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = useSelectRootContext();
  // Port note: the positioner context fields are getters, read reactively below.
  const positioner = useSelectPositionerContext();

  const open = store.useState('open');

  const state = createMemo<SelectArrowState>(() => ({
    open: open(),
    side: positioner.side,
    align: positioner.align,
    uncentered: positioner.arrowUncentered,
  }));

  const element = useRenderElement('div', componentProps, {
    enabled: () => !positioner.alignItemWithTriggerActive,
    state,
    ref: [
      (element: HTMLDivElement | null) => {
        positioner.arrowRef.current = element;
      },
    ],
    props: () => [{ style: positioner.arrowStyles, 'aria-hidden': true }, elementProps],
    stateAttributesMapping: popupTransitionStateMapping,
  });

  return element;
}

export interface SelectArrowState {
  /**
   * Whether the select popup is currently open.
   */
  open: boolean;
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side | 'none';
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the arrow cannot be centered on the anchor.
   */
  uncentered: boolean;
}

export interface SelectArrowProps extends BaseUIComponentProps<'div', SelectArrowState> {}

export namespace SelectArrow {
  export type State = SelectArrowState;
  export type Props = SelectArrowProps;
}
