import { useFilterDropdownGroup } from '../../filter-dropdown/group/useFilterDropdownGroup';
import { FilterDropdownGroupContext } from '../../filter-dropdown/group/FilterDropdownGroupContext';
import { MenuGroupPlain } from '../group/MenuGroup';
import type { MenuGroupProps } from '../group/MenuGroup';
import { MenuRadioGroupPlain } from '../radio-group/MenuRadioGroup';
import type { MenuRadioGroupProps } from '../radio-group/MenuRadioGroup';
/**
 * `Menu.Group` in a filterable menu: hidden, label included, once the query filters out all of
 * its items.
 *
 * @internal
 */
export function MenuFilterGroup(props: MenuGroupProps) {
  const { hidden, context } = useFilterDropdownGroup();
  return (
    <FilterDropdownGroupContext value={context}>
      <MenuGroupPlain {...props} hidden={hidden() || props.hidden || undefined} />
    </FilterDropdownGroupContext>
  );
}
/**
 * `Menu.RadioGroup` in a filterable menu, hidden like `MenuFilterGroup`.
 *
 * @internal
 */
export function MenuFilterRadioGroup(props: MenuRadioGroupProps) {
  const { hidden, context } = useFilterDropdownGroup();
  return (
    <FilterDropdownGroupContext value={context}>
      <MenuRadioGroupPlain {...props} hidden={hidden() || props.hidden || undefined} />
    </FilterDropdownGroupContext>
  );
}
