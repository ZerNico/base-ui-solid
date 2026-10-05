import { FloatingPortalLite } from '../../utils/FloatingPortalLite';
import type { BaseUIComponentProps } from '../../internals/types';

/**
 * A portal element that moves the viewport to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastPortal(props: ToastPortal.Props) {
  return <FloatingPortalLite {...props} />;
}

export interface ToastPortalState {}

export interface ToastPortalProps extends BaseUIComponentProps<'div', ToastPortalState> {
  /**
   * A parent element to render the portal element into.
   */
  container?: HTMLElement | ShadowRoot | null | undefined;
}

export namespace ToastPortal {
  export type State = ToastPortalState;
  export type Props = ToastPortalProps;
}
