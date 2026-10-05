import { useMergedRefs } from '@base-ui-solid/utils/useMergedRefs';
import { createMemo, omit, Show } from 'solid-js';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useMenuFilterItem, stabilizeFilterChildren } from '../filter-root/MenuFilterContext';
import { REGULAR_ITEM, useMenuItem } from './useMenuItem';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type { BaseUIComponentProps, NonNativeButtonProps } from '../../internals/types';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';

function MenuItemPlain(componentProps: MenuItem.Props) {
  const forwardedRef = useMergedRefs<HTMLElement>(
    () => componentProps.ref as any,
    () => null,
  );
  const elementProps = omit(
    componentProps,
    'ref',
    'render',
    'class',
    'id',
    'label',
    'nativeButton',
    'disabled',
    'closeOnClick',
    'style',
  );

  const { store } = useMenuRootContext();

  const listItem = useCompositeListItem({ guess: true, label: () => componentProps.label });
  const generatedId = useBaseUiId();
  const id = () => componentProps.id ?? generatedId;

  const rootDisabled = store.useState('disabled');
  const highlighted = store.useState('isActive', listItem.index);
  const nodeId = store.useState('floatingNodeId');
  const itemProps = store.useState('itemProps');

  const disabled = () => (componentProps.disabled ?? false) || rootDisabled();

  const { getItemProps, itemRef } = useMenuItem({
    closeOnClick: () => componentProps.closeOnClick ?? true,
    disabled,
    highlighted,
    id,
    store,
    nativeButton: () => componentProps.nativeButton ?? false,
    nodeId,
    itemMetadata: REGULAR_ITEM,
  });

  const state = createMemo<MenuItemState>(
    () => ({
      disabled: disabled(),
      highlighted: highlighted(),
    }),
    { equals: fastObjectShallowCompare },
  );

  return useRenderElement('div', componentProps, {
    state,
    props: () => [itemProps(), elementProps, getItemProps],
    ref: [itemRef, listItem.ref, forwardedRef],
  });
}

/**
 * An individual interactive item in the menu.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuItem(incomingProps: MenuItem.Props) {
  const props = stabilizeFilterChildren(incomingProps);
  const filterItem = useMenuFilterItem(props, () => props.ref);

  return (
    <Show when={filterItem.visible()}>
      <MenuItemPlain {...props} ref={(node) => filterItem.ref?.(node)} />
    </Show>
  );
}

export interface MenuItemState {
  /**
   * Whether the item should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
}

export interface MenuItemProps
  extends NonNativeButtonProps, BaseUIComponentProps<'div', MenuItemState> {
  /**
   * The click handler for the menu item.
   */
  onClick?: BaseUIComponentProps<'div', MenuItemState>['onClick'] | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Overrides the text used for keyboard text navigation and filtering.
   * Falls back to the rendered text when not provided.
   */
  label?: string | undefined;
  /**
   * @ignore
   */
  id?: string | undefined;
  /**
   * Whether to close the menu when the item is clicked.
   *
   * @default true
   */
  closeOnClick?: boolean | undefined;
}

export namespace MenuItem {
  export type State = MenuItemState;
  export type Props = MenuItemProps;
}
