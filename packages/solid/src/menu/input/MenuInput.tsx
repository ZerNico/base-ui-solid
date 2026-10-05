import { omit, merge } from 'solid-js';

import { FilterDropdownInput } from '../../filter-dropdown/input/FilterDropdownInput';
import type {
  FilterDropdownInputProps,
  FilterDropdownInputState,
} from '../../filter-dropdown/input/FilterDropdownInput';
import { useFilterDropdownValueContext } from '../../filter-dropdown/root/FilterDropdownRootContext';
import { mergePropsSnapshot } from '../../merge-props/mergeProps';
import { useMenuFilterKeyDown } from '../filter-root/useMenuFilterKeyDown';
import { useMenuFilterPart } from '../filter-root/MenuFilterContext';
import { useMenuRootContext } from '../root/MenuRootContext';

/**
 * A search field that filters the menu items.
 * Requires the menu to be wrapped in `Menu.FilterProvider`.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuInput(componentProps: MenuInput.Props) {
  useMenuFilterPart('Input');
  const { store } = useMenuRootContext();
  const value = useFilterDropdownValueContext();

  const navigation = store.useState('inputProps');
  const navigationProps = merge(() => omit(navigation(), 'onKeyDown'));
  const activeItemId = store.useState('highlightedItemId');

  const handleKeyDown = useMenuFilterKeyDown(() => value() !== '');

  const inputProps = merge(() =>
    mergePropsSnapshot<typeof FilterDropdownInput>({ onKeyDown: handleKeyDown }, componentProps),
  );

  return (
    <FilterDropdownInput
      {...inputProps}
      activeItemId={activeItemId()}
      navigationProps={navigationProps}
    />
  );
}

export interface MenuInputState extends FilterDropdownInputState {}
export interface MenuInputProps extends FilterDropdownInputProps {}

export namespace MenuInput {
  export type State = MenuInputState;
  export type Props = MenuInputProps;
}
