import { omit } from 'solid-js';
import type { BaseUIComponentProps } from '../../internals/types';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useSelectPositionerContext } from '../positioner/SelectPositionerContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { styleDisableScrollbar } from '../../utils/styles';
import { LIST_FUNCTIONAL_STYLES } from '../popup/utils';

/**
 * A container for the select items.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui-solid.pages.dev/solid/components/select)
 */
export function SelectList(componentProps: SelectList.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = useSelectRootContext();
  const multiple = store.useState('multiple');
  const readOnly = store.useState('readOnly');
  const positioner = useSelectPositionerContext();

  const hasScrollArrows = store.useState('hasScrollArrows');
  const openMethod = store.useState('openMethod');
  const id = store.useState('id');

  const defaultProps = (): Record<string, any> => ({
    id: `${id()}-list`,
    role: 'listbox',
    'aria-multiselectable': multiple() || undefined,
    'aria-readonly': readOnly() || undefined,
    onScroll(event: Event) {
      store.context.scrollHandlerRef.current?.(event.currentTarget as HTMLDivElement);
    },
    ...(positioner.alignItemWithTriggerActive && {
      style: LIST_FUNCTIONAL_STYLES,
    }),
    class:
      hasScrollArrows() && openMethod() !== 'touch' ? styleDisableScrollbar.className : undefined,
  });

  const setListElement = store.useStateSetter('listElement');

  return useRenderElement('div', componentProps, {
    ref: [setListElement],
    props: () => [defaultProps(), elementProps],
  });
}

export interface SelectListProps extends BaseUIComponentProps<'div', SelectListState> {}

export interface SelectListState {}

export namespace SelectList {
  export type Props = SelectListProps;
  export type State = SelectListState;
}
