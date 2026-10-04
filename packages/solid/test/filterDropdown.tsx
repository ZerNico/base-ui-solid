import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useRenderElement } from '../src/internals/useRenderElement';
import { useBaseUiId } from '../src/internals/useBaseUiId';
import { resolvePopupLabel } from '../src/internals/resolvePopupLabel';

import { useMenuFilterPopup } from '../src/menu/filter-root/useMenuFilterPopup';
import { useFilterDropdownRootContext } from '../src/filter-dropdown/root/FilterDropdownRootContext';
import { FilterDropdownList } from '../src/filter-dropdown/list/FilterDropdownList';

export { FilterDropdownRoot as Root } from '../src/filter-dropdown/root/FilterDropdownRoot';
export { FilterDropdownInput as Input } from '../src/filter-dropdown/input/FilterDropdownInput';
export { FilterDropdownClear as Clear } from '../src/filter-dropdown/clear/FilterDropdownClear';
export { FilterDropdownEmpty as Empty } from '../src/filter-dropdown/empty/FilterDropdownEmpty';
export function Popup(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const id = useBaseUiId();
  const context = useFilterDropdownRootContext();
  const interactionProps = useMenuFilterPopup(() => 'vertical');
  const otherProps = omit(props, 'id');
  return useRenderElement(
    'div',
    {},
    {
      props: () => [
        {
          id: (props.id ?? id) as string,
          role: 'dialog' as const,
          'aria-labelledby': context.triggerId,
        },
        interactionProps,
        otherProps,
      ],
    },
  );
}
export function List(props: FilterDropdownList.Props) {
  const context = useFilterDropdownRootContext();
  return (
    <FilterDropdownList
      {...props}
      role="menu"
      aria-labelledby={resolvePopupLabel(
        props as Parameters<typeof resolvePopupLabel>[0],
        null,
        context.triggerId ?? null,
      )}
    />
  );
}
