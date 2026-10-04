import { createMemo, omit } from 'solid-js';
import type { BaseUIComponentProps } from '../../internals/types';
import { useSelectRootContext } from '../root/SelectRootContext';
import { popupStateMapping } from '../../utils/popupStateMapping';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { useRenderElement } from '../../internals/useRenderElement';

const stateAttributesMapping: StateAttributesMapping<SelectBackdropState> = {
  ...popupStateMapping,
  ...transitionStatusMapping,
};

/**
 * An overlay displayed beneath the select popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectBackdrop(componentProps: SelectBackdrop.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = useSelectRootContext();

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');

  const state = createMemo<SelectBackdropState>(() => ({
    open: open(),
    transitionStatus: transitionStatus(),
  }));

  const element = useRenderElement('div', componentProps, {
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
    stateAttributesMapping,
  });

  return element;
}

export interface SelectBackdropState {
  /**
   * Whether the component is open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface SelectBackdropProps extends BaseUIComponentProps<'div', SelectBackdropState> {}

export namespace SelectBackdrop {
  export type State = SelectBackdropState;
  export type Props = SelectBackdropProps;
}
