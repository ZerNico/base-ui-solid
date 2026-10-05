import { createMemo, omit } from 'solid-js';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import { useNavigationMenuItemContext } from '../item/NavigationMenuItemContext';

/**
 * An icon that indicates that the trigger button opens a menu.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui-solid.pages.dev/solid/components/navigation-menu)
 */
export function NavigationMenuIcon(componentProps: NavigationMenuIcon.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { value: itemValue } = useNavigationMenuItemContext();
  const { open, value } = useNavigationMenuRootContext();

  const isActiveItem = () => open() && value() === itemValue();

  const state = createMemo<NavigationMenuIconState>(
    () => ({
      open: isActiveItem(),
    }),
    { equals: fastObjectShallowCompare },
  );

  return useRenderElement('span', componentProps, {
    state,
    props: [{ 'aria-hidden': true, children: '▼' }, elementProps],
    stateAttributesMapping: triggerOpenStateMapping,
  });
}

export interface NavigationMenuIconState {
  /**
   * Whether the navigation menu is open and the item is active.
   */
  open: boolean;
}

export interface NavigationMenuIconProps extends BaseUIComponentProps<
  'span',
  NavigationMenuIconState
> {}

export namespace NavigationMenuIcon {
  export type State = NavigationMenuIconState;
  export type Props = NavigationMenuIconProps;
}
