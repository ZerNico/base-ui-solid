import { createMemo, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useFloatingTree } from '../../floating-ui-react';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import {
  useNavigationMenuRootContext,
  useNavigationMenuTreeContext,
} from '../root/NavigationMenuRootContext';
import { isOutsideMenuEvent } from '../utils/isOutsideMenuEvent';
import { CompositeItem } from '../../internals/composite/item/CompositeItem';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';

/**
 * A link in the navigation menu that can be used to navigate to a different page or section.
 * Renders an `<a>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuLink(componentProps: NavigationMenuLink.Props) {
  const elementProps = omit(componentProps, 'class', 'render', 'active', 'closeOnClick', 'style');
  const active = () => componentProps.active ?? false;
  const closeOnClick = () => componentProps.closeOnClick ?? false;

  const { setValue, popupElement, positionerElement, rootRef } = useNavigationMenuRootContext();
  const nodeId = useNavigationMenuTreeContext();
  const tree = useFloatingTree();

  const state = createMemo<NavigationMenuLinkState>(() => ({
    active: active(),
  }));

  // Port note: React's `onBlur` bubbles, so it's `onFocusOut`.
  const defaultProps = (): HTMLProps => ({
    'aria-current': active() ? 'page' : undefined,
    tabindex: undefined,
    onClick(event: MouseEvent) {
      if (untrack(closeOnClick)) {
        setValue(null, createChangeEventDetails(REASONS.linkPress, event));
      }
    },
    onFocusOut(event: FocusEvent) {
      const positioner = untrack(positionerElement);
      const popup = untrack(popupElement);
      if (
        positioner &&
        popup &&
        isOutsideMenuEvent(
          {
            currentTarget: event.currentTarget as HTMLElement | null,
            relatedTarget: event.relatedTarget as HTMLElement | null,
          },
          { popupElement: popup, rootRef, tree, nodeId },
        )
      ) {
        setValue(null, createChangeEventDetails(REASONS.focusOut, event));
      }
    },
  });

  return (
    <CompositeItem
      tag="a"
      render={componentProps.render}
      class={componentProps.class}
      style={componentProps.style}
      state={state()}
      props={[defaultProps(), elementProps]}
    />
  );
}

export interface NavigationMenuLinkState {
  /**
   * Whether the link is the currently active page.
   */
  active: boolean;
}

export interface NavigationMenuLinkProps extends BaseUIComponentProps<
  'a',
  NavigationMenuLinkState,
  JSX.IntrinsicElements['a']
> {
  /**
   * Whether the link is the currently active page.
   * @default false
   */
  active?: boolean | undefined;
  /**
   * Whether to close the navigation menu when the link is clicked.
   * @default false
   */
  closeOnClick?: boolean | undefined;
}

export namespace NavigationMenuLink {
  export type State = NavigationMenuLinkState;
  export type Props = NavigationMenuLinkProps;
}
