import { createMemo, omit } from 'solid-js';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useDialogRootContext } from '../root/DialogRootContext';
import { useDialogPortalContext } from '../portal/DialogPortalContext';
import { dialogStateAttributesMapping } from '../utils/stateAttributesMapping';

/**
 * A positioning container for the dialog popup that can be made scrollable.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui-solid.pages.dev/solid/components/dialog)
 */
export function DialogViewport(componentProps: DialogViewport.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const keepMounted = useDialogPortalContext();
  const store = useDialogRootContext();

  const open = store.useState('open');
  const nested = store.useState('nested');
  const transitionStatus = store.useState('transitionStatus');
  const nestedOpenDialogCount = store.useState('nestedOpenDialogCount');
  const mounted = store.useState('mounted');

  const setViewportElement = store.useStateSetter('viewportElement');

  const nestedDialogOpen = () => nestedOpenDialogCount() > 0;

  const state = createMemo<DialogViewportState>(
    () => ({
      open: open(),
      nested: nested(),
      transitionStatus: transitionStatus(),
      nestedDialogOpen: nestedDialogOpen(),
    }),
    { equals: fastObjectShallowCompare },
  );

  const shouldRender = () => keepMounted() || mounted();

  // Port note: `children` stay in `elementProps` (they're never merged reactively).
  return useRenderElement('div', componentProps, {
    enabled: shouldRender,
    state,
    ref: setViewportElement,
    stateAttributesMapping: dialogStateAttributesMapping,
    props: () => [
      {
        role: 'presentation',
        hidden: !mounted(),
        style: {
          'pointer-events': !open() ? 'none' : undefined,
        },
      },
      elementProps,
    ],
  });
}

export interface DialogViewportState {
  /**
   * Whether the dialog is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * Whether the dialog is nested within another dialog.
   */
  nested: boolean;
  /**
   * Whether the dialog has nested dialogs open.
   */
  nestedDialogOpen: boolean;
}

export interface DialogViewportProps extends BaseUIComponentProps<'div', DialogViewportState> {}

export namespace DialogViewport {
  export type State = DialogViewportState;
  export type Props = DialogViewportProps;
}
