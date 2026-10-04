import { createContext } from 'solid-js';
import type { MenuFilterRoot } from '../filter-root/MenuFilterRoot';
import type { MenuFilterSubmenuRoot } from '../filter-submenu-root/MenuFilterSubmenuRoot';
import type { MenuFilterProviderOptions } from './MenuFilterProviderOptions';

/**
 * What `Menu.FilterProvider` hands to the root directly inside it: the filterable root
 * implementations (the provider is their only importer) and the filter props.
 *
 * Port note: `options` is read lazily (its values are getters over the provider's props).
 */
export interface MenuFilterProviderContext {
  Root: typeof MenuFilterRoot;
  SubmenuRoot: typeof MenuFilterSubmenuRoot;
  options: MenuFilterProviderOptions;
}

/**
 * Non-null only directly below a provider. The root that consumes it resets it, so a plain
 * `Menu.SubmenuRoot` inside a filterable menu stays plain.
 */
export const MenuFilterProviderContext = createContext<MenuFilterProviderContext | null>(null);
