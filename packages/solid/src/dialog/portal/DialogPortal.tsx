import { omit, onCleanup, Show } from 'solid-js';
import { inertValue } from '@base-ui-solid/utils/inertValue';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { FloatingPortal } from '../../floating-ui-solid';
import type { BaseUIComponentProps } from '../../internals/types';
import { useDialogRootContext } from '../root/DialogRootContext';
import { DialogPortalContext } from './DialogPortalContext';
import { InternalBackdrop } from '../../utils/InternalBackdrop';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Dialog](https://base-ui.com/react/components/dialog)
 */
export function DialogPortal(props: DialogPortal.Props) {
  const portalProps = omit(props, 'keepMounted', 'children');
  const keepMounted = () => props.keepMounted ?? false;

  const store = useDialogRootContext();
  const mounted = store.useState('mounted');
  const modal = store.useState('modal');
  const open = store.useState('open');

  const shouldRender = () => mounted() || keepMounted();

  return (
    <Show when={shouldRender()}>
      <DialogPortalContext value={keepMounted}>
        <FloatingPortal {...portalProps}>
          <Show when={mounted() && modal() === true}>
            <DialogInternalBackdrop
              backdropRef={store.context.internalBackdropRef}
              inert={inertValue(!open())}
            />
          </Show>
          {props.children}
        </FloatingPortal>
      </DialogPortalContext>
    </Show>
  );
}

/**
 * Port note: an `InternalBackdrop` whose ref object is reset to `null` when it unmounts, like React
 * does for ref objects.
 */
function DialogInternalBackdrop(props: {
  backdropRef: RefObject<HTMLDivElement | null>;
  inert: boolean | undefined;
}) {
  onCleanup(() => {
    props.backdropRef.current = null;
  });
  return (
    <InternalBackdrop
      ref={(element) => {
        props.backdropRef.current = element;
      }}
      inert={props.inert}
    />
  );
}

export interface DialogPortalState {}

export interface DialogPortalProps extends BaseUIComponentProps<'div', DialogPortalState> {
  /**
   * Whether to keep the portal mounted in the DOM while the popup is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * A parent element to render the portal element into.
   */
  container?: HTMLElement | ShadowRoot | null | undefined;
}

export namespace DialogPortal {
  export type State = DialogPortalState;
  export type Props = DialogPortalProps;
}
