import { useMergedRefs } from '@base-ui-solid/utils/useMergedRefs';
import { createMemo, omit, Show, untrack } from 'solid-js';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { NOOP } from '@base-ui-solid/utils/empty';
import { useMenuFilterItem, stabilizeFilterChildren } from '../filter-root/MenuFilterContext';
import { MenuCheckboxItemContext } from './MenuCheckboxItemContext';
import { REGULAR_ITEM, useMenuItem } from '../item/useMenuItem';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type { BaseUIComponentProps, NonNativeButtonProps } from '../../internals/types';
import { itemMapping } from '../utils/stateAttributesMapping';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { MenuRoot } from '../root/MenuRoot';

function MenuCheckboxItemPlain(componentProps: MenuCheckboxItem.Props) {
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
    'checked',
    'onCheckedChange',
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
  const checked = () => componentProps.checked ?? false;

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

  const state = createMemo<MenuCheckboxItemState>(() => ({
    disabled: disabled(),
    highlighted: highlighted(),
    checked: checked(),
  }));

  function handleClick(event: MouseEvent) {
    const details = createChangeEventDetails(REASONS.itemPress, event, undefined, {
      preventUnmountOnClose: NOOP,
    });

    componentProps.onCheckedChange?.(!untrack(checked), details);
  }

  return (
    <MenuCheckboxItemContext value={state}>
      {useRenderElement('div', componentProps, {
        state,
        stateAttributesMapping: itemMapping,
        props: () => [
          itemProps(),
          {
            role: 'menuitemcheckbox',
            'aria-checked': checked(),
            onClick: handleClick,
          },
          elementProps,
          getItemProps,
        ],
        ref: [itemRef, listItem.ref, forwardedRef],
      })}
    </MenuCheckboxItemContext>
  );
}

/**
 * A menu item that toggles a setting on or off.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuCheckboxItem(incomingProps: MenuCheckboxItem.Props) {
  const props = stabilizeFilterChildren(incomingProps);
  const plainProps = omit(props, 'checked', 'defaultChecked', 'onCheckedChange');

  // Owned above the element so an uncontrolled item keeps its state while a filter hides it.
  const [checked, setChecked] = useControlled({
    controlled: () => props.checked,
    default: untrack(() => props.defaultChecked) ?? false,
    name: 'MenuCheckboxItem',
    state: 'checked',
  });

  const filterItem = useMenuFilterItem(props, () => props.ref);

  function handleCheckedChange(
    nextChecked: boolean,
    eventDetails: MenuCheckboxItem.ChangeEventDetails,
  ) {
    props.onCheckedChange?.(nextChecked, eventDetails);
    if (!eventDetails.isCanceled) {
      setChecked(nextChecked);
    }
  }

  return (
    <Show when={filterItem.visible()}>
      <MenuCheckboxItemPlain
        {...plainProps}
        checked={checked()}
        onCheckedChange={handleCheckedChange}
        ref={(node) => filterItem.ref?.(node)}
      />
    </Show>
  );
}

export interface MenuCheckboxItemState {
  /**
   * Whether the checkbox item should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the checkbox item is currently highlighted.
   */
  highlighted: boolean;
  /**
   * Whether the checkbox item is currently ticked.
   */
  checked: boolean;
}

export interface MenuCheckboxItemProps
  extends NonNativeButtonProps, BaseUIComponentProps<'div', MenuCheckboxItemState> {
  /**
   * Whether the checkbox item is currently ticked.
   *
   * To render an uncontrolled checkbox item, use the `defaultChecked` prop instead.
   */
  checked?: boolean | undefined;
  /**
   * Whether the checkbox item is initially ticked.
   *
   * To render a controlled checkbox item, use the `checked` prop instead.
   * @default false
   */
  defaultChecked?: boolean | undefined;
  /**
   * Event handler called when the checkbox item is ticked or unticked.
   */
  onCheckedChange?:
    ((checked: boolean, eventDetails: MenuCheckboxItem.ChangeEventDetails) => void) | undefined;
  /**
   * The click handler for the menu item.
   */
  onClick?: BaseUIComponentProps<'div', MenuCheckboxItemState>['onClick'] | undefined;
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

export type MenuCheckboxItemChangeEventReason = MenuRoot.ChangeEventReason;
export type MenuCheckboxItemChangeEventDetails = MenuRoot.ChangeEventDetails;

export namespace MenuCheckboxItem {
  export type State = MenuCheckboxItemState;
  export type Props = MenuCheckboxItemProps;
  export type ChangeEventReason = MenuCheckboxItemChangeEventReason;
  export type ChangeEventDetails = MenuCheckboxItemChangeEventDetails;
}
