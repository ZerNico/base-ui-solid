import { Show } from 'solid-js';
import { FloatingPortal } from '../../floating-ui-solid';
import type { BaseUIComponentProps } from '../../internals/types';
import { useSelectRootContext } from '../root/SelectRootContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectPortal(portalProps: SelectPortal.Props) {
  const store = useSelectRootContext();
  const mounted = store.useState('mounted');
  const forceMount = store.useState('forceMount');

  const shouldRender = () => mounted() || forceMount();

  return (
    <Show when={shouldRender()}>
      <FloatingPortal {...portalProps} />
    </Show>
  );
}

export interface SelectPortalState {}

export interface SelectPortalProps extends BaseUIComponentProps<'div', SelectPortalState> {
  /**
   * A parent element to render the portal element into.
   */
  container?: HTMLElement | ShadowRoot | null | undefined;
}

export namespace SelectPortal {
  export type State = SelectPortalState;
  export type Props = SelectPortalProps;
}
