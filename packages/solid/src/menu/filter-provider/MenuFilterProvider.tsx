import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';

import { MenuFilterRoot } from '../filter-root/MenuFilterRoot';
import { MenuFilterSubmenuRoot } from '../filter-submenu-root/MenuFilterSubmenuRoot';
import type { MenuFilterProviderOptions } from './MenuFilterProviderOptions';
import { MenuFilterProviderContext } from './MenuFilterProviderContext';
import type { FilterDropdownRoot } from '../../filter-dropdown/root/FilterDropdownRootContext';

/**
 * Enables filtering for the menu or submenu it wraps. Add `Menu.Input` to the popup and place
 * its items in `Menu.List`.
 * Wrap each searchable submenu in its own provider.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuFilterProvider(props: MenuFilterProvider.Props): JSX.Element {
  const contextValue = {
    Root: MenuFilterRoot,
    SubmenuRoot: MenuFilterSubmenuRoot,
    options: omit(props, 'children'),
  };

  return (
    <MenuFilterProviderContext value={contextValue}>{props.children}</MenuFilterProviderContext>
  );
}

export interface MenuFilterProviderState {}

export interface MenuFilterProviderProps extends MenuFilterProviderOptions {
  /**
   * The `<Menu.Root>` or `<Menu.SubmenuRoot>` to make filterable.
   */
  children?: JSX.Element | undefined;
}

export type MenuFilterProviderChangeEventReason = FilterDropdownRoot.ChangeEventReason;
export type MenuFilterProviderChangeEventDetails = FilterDropdownRoot.ChangeEventDetails;

export namespace MenuFilterProvider {
  export type State = MenuFilterProviderState;
  export type Props = MenuFilterProviderProps;
  export type ChangeEventReason = MenuFilterProviderChangeEventReason;
  export type ChangeEventDetails = MenuFilterProviderChangeEventDetails;
}
