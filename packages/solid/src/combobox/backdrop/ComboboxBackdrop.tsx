import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { BaseUIComponentProps } from '../../internals/types';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { popupStateMapping } from '../../utils/popupStateMapping';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { useRenderElement } from '../../internals/useRenderElement';

const stateAttributesMapping: StateAttributesMapping<ComboboxBackdropState> = {
  ...popupStateMapping,
  ...transitionStatusMapping,
};

/**
 * An overlay displayed beneath the popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui-solid.pages.dev/solid/components/combobox)
 */
export function ComboboxBackdrop(componentProps: ComboboxBackdrop.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = useComboboxRootContext();

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');

  const state = createMemo<ComboboxBackdropState>(
    () => ({
      open: open(),
      transitionStatus: transitionStatus(),
    }),
    { equals: fastObjectShallowCompare },
  );

  return useRenderElement('div', componentProps, {
    state,
    stateAttributesMapping,
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
  });
}

export interface ComboboxBackdropProps extends BaseUIComponentProps<'div', ComboboxBackdropState> {}

export interface ComboboxBackdropState {
  /**
   * Whether the popup is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export namespace ComboboxBackdrop {
  export type Props = ComboboxBackdropProps;
  export type State = ComboboxBackdropState;
}
