import { omit, Show } from 'solid-js';
import { FloatingPortal } from '../../floating-ui-solid';
import type { BaseUIComponentProps } from '../../internals/types';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { NavigationMenuPortalContext } from './NavigationMenuPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui-solid.pages.dev/solid/components/navigation-menu)
 */
export function NavigationMenuPortal(props: NavigationMenuPortal.Props) {
  const portalProps = omit(props, 'keepMounted');
  const keepMounted = () => props.keepMounted ?? false;

  const { mounted } = useNavigationMenuRootContext();

  const shouldRender = () => mounted() || keepMounted();

  return (
    <Show when={shouldRender()}>
      <NavigationMenuPortalContext value={keepMounted}>
        <FloatingPortal {...portalProps} />
      </NavigationMenuPortalContext>
    </Show>
  );
}

export interface NavigationMenuPortalState {}

export interface NavigationMenuPortalProps extends BaseUIComponentProps<
  'div',
  NavigationMenuPortalState
> {
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

export namespace NavigationMenuPortal {
  export type State = NavigationMenuPortalState;
  export type Props = NavigationMenuPortalProps;
}
