import type { JSX } from '@solidjs/web';
import { MenuRootInternal } from '../root/MenuRoot';
import type { MenuRoot } from '../root/MenuRoot';
import type { MenuFilterProviderOptions } from '../filter-provider/MenuFilterProviderOptions';
import { MenuFilterDropdown } from './MenuFilterDropdown';
import { useMenuFilterRoot } from './useMenuFilterRoot';
/**
 * The filterable implementation of `Menu.Root`, rendered in its place when the root sits inside
 * `Menu.FilterProvider`. Reached through the provider only, so a plain menu never bundles it.
 *
 * @internal
 */
export function MenuFilterRoot<Payload>(props: MenuFilterRootProps<Payload>): JSX.Element {
  const { rootProps, dropdownProps } = useMenuFilterRoot(props);
  return (
    <MenuRootInternal {...rootProps}>
      {(payload) => (
        <MenuFilterDropdown {...dropdownProps}>
          {(() => {
            // Port note: read JSX children once so checking for a render function does not instantiate a second subtree.
            const children = props.children;
            return typeof children === 'function' ? children(payload) : (children as JSX.Element);
          })()}
        </MenuFilterDropdown>
      )}
    </MenuRootInternal>
  );
}
export type MenuFilterRootProps<Payload = unknown> = MenuRoot.Props<Payload> &
  MenuFilterProviderOptions;
