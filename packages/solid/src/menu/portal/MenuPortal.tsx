import { omit, Show } from 'solid-js';
import { FloatingPortal } from '../../floating-ui-solid';
import type { BaseUIComponentProps } from '../../internals/types';
import { useMenuRootContext } from '../root/MenuRootContext';
import { MenuPortalContext } from './MenuPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuPortal(props: MenuPortal.Props) {
  const portalProps = omit(props, 'keepMounted');
  const keepMounted = () => props.keepMounted ?? false;

  const { store, parent } = useMenuRootContext();
  const mounted = store.useState('mounted');

  const shouldRender = () => mounted() || keepMounted();

  // The hidden `aria-owns` owner renders here, in the component tree, so the role must be decided
  // by where this portal sits, not by the active trigger. `parent` comes from context (the
  // `Menu.Root` position), unlike the store's `parent`, which a detached trigger overwrites with
  // its own.
  const portalOwnerRole = parent.type === 'menu' || parent.type === 'menubar' ? 'group' : undefined;

  return (
    <Show when={shouldRender()}>
      <MenuPortalContext value={keepMounted}>
        {/* The hidden `aria-owns` owner needs `group` only under role-constrained parents. */}
        <FloatingPortal {...portalProps} portalOwnerRole={portalOwnerRole} />
      </MenuPortalContext>
    </Show>
  );
}

export interface MenuPortalState {}

export interface MenuPortalProps extends BaseUIComponentProps<'div', MenuPortalState> {
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

export namespace MenuPortal {
  export type State = MenuPortalState;
  export type Props = MenuPortalProps;
}
