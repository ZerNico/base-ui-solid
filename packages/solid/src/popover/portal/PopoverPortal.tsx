import { omit, Show } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { FloatingPortal } from '../../floating-ui-react';
import type { BaseUIComponentProps } from '../../internals/types';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { PopoverPortalContext } from './PopoverPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui.com/react/components/popover)
 */
export function PopoverPortal(props: PopoverPortal.Props) {
  const portalProps = omit(props, 'keepMounted');
  const keepMounted = () => props.keepMounted ?? false;

  const store = usePopoverRootContext();
  const mounted = store.useState('mounted');

  const shouldRender = () => mounted() || keepMounted();

  return (
    <Show when={shouldRender()}>
      <PopoverPortalContext value={keepMounted}>
        <FloatingPortal {...portalProps} />
      </PopoverPortalContext>
    </Show>
  );
}

export interface PopoverPortalState {}

export interface PopoverPortalProps extends BaseUIComponentProps<'div', PopoverPortalState> {
  /**
   * Whether to keep the portal mounted in the DOM while the popup is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * A parent element to render the portal element into.
   */
  container?:
    HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null | undefined;
}

export namespace PopoverPortal {
  export type State = PopoverPortalState;
  export type Props = PopoverPortalProps;
}
