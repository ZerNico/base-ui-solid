import { useMergedRefs } from '@base-ui-solid/utils/useMergedRefs';
import { createMemo, omit, Show, untrack } from 'solid-js';
import { NOOP } from '@base-ui-solid/utils/empty';
import { useMenuFilterItem, stabilizeFilterChildren } from '../filter-root/MenuFilterContext';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type { BaseUIComponentProps, NonNativeButtonProps } from '../../internals/types';
import { useMenuRadioGroupContext } from '../radio-group/MenuRadioGroupContext';
import { MenuRadioItemContext } from './MenuRadioItemContext';
import { itemMapping } from '../utils/stateAttributesMapping';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import { REGULAR_ITEM, useMenuItem } from '../item/useMenuItem';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';

function MenuRadioItemPlain(componentProps: MenuRadioItem.Props) {
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
    'value',
    'style',
  );

  const { store } = useMenuRootContext();
  const radioGroupContext = useMenuRadioGroupContext();

  const listItem = useCompositeListItem({ guess: true, label: () => componentProps.label });
  const generatedId = useBaseUiId();
  const id = () => componentProps.id ?? generatedId;

  const highlighted = store.useState('isActive', listItem.index);
  const nodeId = store.useState('floatingNodeId');
  const itemProps = store.useState('itemProps');
  const rootDisabled = store.useState('disabled');

  const disabled = () =>
    (componentProps.disabled ?? false) || radioGroupContext.disabled || rootDisabled();
  const checked = () => radioGroupContext.value === componentProps.value;

  const { getItemProps, itemRef } = useMenuItem({
    closeOnClick: () => componentProps.closeOnClick ?? false,
    disabled,
    highlighted,
    id,
    store,
    nativeButton: () => componentProps.nativeButton ?? false,
    nodeId,
    itemMetadata: REGULAR_ITEM,
  });

  const state = createMemo<MenuRadioItemState>(() => ({
    disabled: disabled(),
    highlighted: highlighted(),
    checked: checked(),
  }));

  function handleClick(event: MouseEvent) {
    const details = createChangeEventDetails(REASONS.itemPress, event, undefined, {
      preventUnmountOnClose: NOOP,
    });

    radioGroupContext.setValue(
      untrack(() => componentProps.value),
      details,
    );
  }

  return (
    <MenuRadioItemContext value={state}>
      {useRenderElement('div', componentProps, {
        state,
        stateAttributesMapping: itemMapping,
        props: () => [
          itemProps(),
          {
            role: 'menuitemradio',
            'aria-checked': checked(),
            onClick: handleClick,
          },
          elementProps,
          getItemProps,
        ],
        ref: [itemRef, listItem.ref, forwardedRef],
      })}
    </MenuRadioItemContext>
  );
}

/**
 * A menu item that works like a radio button in a given group.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuRadioItem(incomingProps: MenuRadioItem.Props) {
  const props = stabilizeFilterChildren(incomingProps);
  const filterItem = useMenuFilterItem(props, () => props.ref);

  return (
    <Show when={filterItem.visible()}>
      <MenuRadioItemPlain {...props} ref={(node) => filterItem.ref?.(node)} />
    </Show>
  );
}

export interface MenuRadioItemState {
  /**
   * Whether the radio item should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the radio item is currently highlighted.
   */
  highlighted: boolean;
  /**
   * Whether the radio item is currently selected.
   */
  checked: boolean;
}

export interface MenuRadioItemProps
  extends NonNativeButtonProps, BaseUIComponentProps<'div', MenuRadioItemState> {
  /**
   * Value of the radio item.
   * This is the value that will be set in the MenuRadioGroup when the item is selected.
   */
  value: any;
  /**
   * The click handler for the menu item.
   */
  onClick?: BaseUIComponentProps<'div', MenuRadioItemState>['onClick'] | undefined;
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
   * @default false
   */
  closeOnClick?: boolean | undefined;
}

export namespace MenuRadioItem {
  export type State = MenuRadioItemState;
  export type Props = MenuRadioItemProps;
}
