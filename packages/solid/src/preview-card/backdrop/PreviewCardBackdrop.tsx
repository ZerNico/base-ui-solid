import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { usePreviewCardRootContext } from '../root/PreviewCardContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { popupTransitionStateMapping } from '../../utils/popupStateMapping';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A presentational overlay displayed beneath the popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui-solid.pages.dev/solid/components/preview-card)
 */
export function PreviewCardBackdrop(componentProps: PreviewCardBackdrop.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = usePreviewCardRootContext();
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');

  const state = createMemo<PreviewCardBackdropState>(() => ({
    open: open(),
    transitionStatus: transitionStatus(),
  }));

  return useRenderElement('div', componentProps, {
    state,
    props: () => [
      {
        role: 'presentation',
        hidden: !mounted(),
        style: {
          'pointer-events': 'none',
          'user-select': 'none',
          '-webkit-user-select': 'none',
        },
      },
      elementProps,
    ],
    stateAttributesMapping: popupTransitionStateMapping,
  });
}

export interface PreviewCardBackdropState {
  /**
   * Whether the preview card is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface PreviewCardBackdropProps extends BaseUIComponentProps<
  'div',
  PreviewCardBackdropState
> {}

export namespace PreviewCardBackdrop {
  export type State = PreviewCardBackdropState;
  export type Props = PreviewCardBackdropProps;
}
