import { createMemo, omit } from 'solid-js';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { popupTransitionStateMapping } from '../../utils/popupStateMapping';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useRenderElement } from '../../internals/useRenderElement';
import { REASONS } from '../../internals/reasons';

/**
 * An overlay displayed beneath the popover.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverBackdrop(props: PopoverBackdrop.Props) {
  const elementProps = omit(props, 'render', 'class', 'style');

  const store = usePopoverRootContext();

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');
  const openReason = store.useState('openChangeReason');

  const state = createMemo<PopoverBackdropState>(() => ({
    open: open(),
    transitionStatus: transitionStatus(),
  }));

  const element = useRenderElement('div', props, {
    state,
    props: () => [
      {
        role: 'presentation',
        hidden: !mounted(),
        style: {
          'pointer-events': openReason() === REASONS.triggerHover ? 'none' : undefined,
          'user-select': 'none',
          '-webkit-user-select': 'none',
        },
      },
      elementProps,
    ],
    stateAttributesMapping: popupTransitionStateMapping,
  });

  return element;
}

export interface PopoverBackdropState {
  /**
   * Whether the popover is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface PopoverBackdropProps extends BaseUIComponentProps<'div', PopoverBackdropState> {}

export namespace PopoverBackdrop {
  export type State = PopoverBackdropState;
  export type Props = PopoverBackdropProps;
}
