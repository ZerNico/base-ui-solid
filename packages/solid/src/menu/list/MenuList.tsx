import { omit, untrack } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useMenuFilterImpl } from '../filter-root/MenuFilterContext';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type { BaseUIComponentProps } from '../../internals/types';
import { resolvePopupLabel } from '../../internals/resolvePopupLabel';

type PopupLabelProps = Parameters<typeof resolvePopupLabel>[0];

function MenuListPlain(componentProps: MenuList.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'id');

  const rootContext = useMenuRootContext();
  const { store } = rootContext;

  const activeTriggerId = store.useState('activeTriggerId');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const setListElement = store.useStateSetter('listElement');

  const generatedId = useBaseUiId();
  const id = () => (componentProps.id as string | undefined) ?? generatedId;

  // The trigger reads `aria-controls` off the stored element, which an id change alone leaves in
  // place, so subscribers are told to read it again. Mounting publishes the element itself.
  let renderedId = untrack(id);
  useIsoLayoutEffect(
    ([idValue]) => {
      if (renderedId !== idValue) {
        renderedId = idValue;
        store.notifyAll();
      }
    },
    () => [id()] as const,
  );

  const ariaLabelledBy = () =>
    resolvePopupLabel(componentProps as PopupLabelProps, activeTriggerElement(), activeTriggerId());

  return useRenderElement('div', componentProps, {
    ref: setListElement,
    props: () => [
      {
        id: id(),
        role: 'menu',
        // The popup focuses the list on a pointer open in place of itself.
        tabindex: -1,
        // `menu` is implicitly vertical, so only the non-default value needs to be rendered.
        'aria-orientation': rootContext.orientation === 'horizontal' ? 'horizontal' : undefined,
        'aria-labelledby': ariaLabelledBy(),
      },
      elementProps,
    ],
  });
}

/**
 * Groups menu items so other content, such as a filter input, can share the popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuList(props: MenuList.Props) {
  const List = useMenuFilterImpl()?.List ?? MenuListPlain;
  return <List {...props} />;
}

export interface MenuListState {}

export interface MenuListProps extends BaseUIComponentProps<'div', MenuListState> {}

export namespace MenuList {
  export type Props = MenuListProps;
  export type State = MenuListState;
}
