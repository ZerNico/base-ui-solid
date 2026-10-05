import { FilterDropdownEmpty } from '../../filter-dropdown/empty/FilterDropdownEmpty';
import type {
  FilterDropdownEmptyProps,
  FilterDropdownEmptyState,
} from '../../filter-dropdown/empty/FilterDropdownEmpty';
import { useMenuFilterPart } from '../filter-root/MenuFilterContext';

/**
 * A message shown when the menu has no matching items.
 * Requires the menu to be wrapped in `Menu.FilterProvider`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuEmpty(props: MenuEmpty.Props) {
  useMenuFilterPart('Empty');
  return <FilterDropdownEmpty {...props} />;
}

export interface MenuEmptyState extends FilterDropdownEmptyState {}
export interface MenuEmptyProps extends FilterDropdownEmptyProps {}

export namespace MenuEmpty {
  export type State = MenuEmptyState;
  export type Props = MenuEmptyProps;
}
