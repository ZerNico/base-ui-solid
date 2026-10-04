import { omit, Show } from 'solid-js';
import { Portal } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { BaseUIComponentProps } from '../internals/types';
import { useFloatingPortalNode } from '../floating-ui-react/components/FloatingPortal';

type PortalContainer = HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;

/**
 * `FloatingPortal` includes tabbable logic handling for focus management.
 * For components that don't need tabbable logic, use `FloatingPortalLite`.
 * @internal
 */
export function FloatingPortalLite(componentProps: FloatingPortalLite.Props<any>) {
  const elementProps = omit(componentProps, 'children', 'container', 'class', 'render', 'style');

  // Port note: the forwarded `ref` is part of `elementProps` (see `useRenderElement`).
  const portal = useFloatingPortalNode({
    get container() {
      return componentProps.container;
    },
    componentProps,
    elementProps,
  });

  // Port note: the portal subtree renders nothing until its container is resolved, so it's always
  // rendered (upstream returns `null` when neither the subtree nor the portal node exist).
  return (
    <>
      {portal.subtree}
      <Show when={portal.node}>
        {(portalNode) => <Portal mount={portalNode()}>{componentProps.children}</Portal>}
      </Show>
    </>
  );
}

export interface FloatingPortalLiteState {}

export interface FloatingPortalLiteProps<TState> extends BaseUIComponentProps<'div', TState> {
  container?: PortalContainer | undefined;
}

export namespace FloatingPortalLite {
  export type State = FloatingPortalLiteState;
  export type Props<TState> = FloatingPortalLiteProps<TState>;
}
