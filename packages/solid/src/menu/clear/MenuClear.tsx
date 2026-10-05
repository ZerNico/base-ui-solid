import { FilterDropdownClear } from '../../filter-dropdown/clear/FilterDropdownClear';
import type {
  FilterDropdownClearProps,
  FilterDropdownClearState,
} from '../../filter-dropdown/clear/FilterDropdownClear';
import { useMenuFilterPart } from '../filter-root/MenuFilterContext';

/**
 * A button that clears the input text.
 * Requires the menu to be wrapped in `Menu.FilterProvider`.
 * Renders a `<button>` element when the input has text.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuClear(props: MenuClear.Props) {
  useMenuFilterPart('Clear');
  return <FilterDropdownClear {...props} />;
}

export interface MenuClearState extends FilterDropdownClearState {}
export interface MenuClearProps extends FilterDropdownClearProps {}

export namespace MenuClear {
  export type State = MenuClearState;
  export type Props = MenuClearProps;
}
