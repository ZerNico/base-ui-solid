import { useMergedRefs } from '@base-ui-solid/utils/useMergedRefs';
import { createMemo, omit, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useMenuFilterItem, stabilizeFilterChildren } from '../filter-root/MenuFilterContext';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import { useMenuItemCommonProps } from '../item/useMenuItemCommonProps';
import { REGULAR_ITEM } from '../item/useMenuItem';
import { useButton } from '../../internals/use-button';
import { mergePropsSnapshot } from '../../merge-props/mergeProps';

function MenuLinkItemPlain(componentProps: MenuLinkItem.Props) {
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
    'closeOnClick',
    'style',
  );

  const { store } = useMenuRootContext();

  const linkRef: RefObject<HTMLElement | null> = { current: null };

  const listItem = useCompositeListItem({ guess: true, label: () => componentProps.label });
  const generatedId = useBaseUiId();
  const id = () => componentProps.id ?? generatedId;

  const highlighted = store.useState('isActive', listItem.index);
  const nodeId = store.useState('floatingNodeId');
  const itemProps = store.useState('itemProps');

  const typingRef = store.context.typingRef;

  const { getButtonProps, buttonRef } = useButton({
    native: () => false,
    composite: () => true,
  });

  const commonProps = useMenuItemCommonProps({
    closeOnClick: () => componentProps.closeOnClick ?? false,
    highlighted,
    id,
    nodeId,
    store,
    typingRef,
    itemRef: linkRef,
    itemMetadata: REGULAR_ITEM,
  });

  function getItemProps(externalProps?: HTMLProps): HTMLProps {
    return mergePropsSnapshot<any>(commonProps(), externalProps, getButtonProps);
  }

  const state = createMemo<MenuLinkItemState>(() => ({ highlighted: highlighted() }));

  return useRenderElement('a', componentProps, {
    state,
    props: () => [itemProps(), elementProps, getItemProps],
    ref: [
      (element: HTMLElement | null) => {
        linkRef.current = element;
      },
      buttonRef,
      listItem.ref,
      forwardedRef,
    ],
  });
}

/**
 * A link in the menu that can be used to navigate to a different page or section.
 * Renders an `<a>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuLinkItem(incomingProps: MenuLinkItem.Props) {
  const props = stabilizeFilterChildren(incomingProps);
  const filterItem = useMenuFilterItem(props, () => props.ref);

  return (
    <Show when={filterItem.visible()}>
      <MenuLinkItemPlain {...props} ref={(node) => filterItem.ref?.(node)} />
    </Show>
  );
}

export interface MenuLinkItemState {
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
}

export interface MenuLinkItemProps extends BaseUIComponentProps<
  'a',
  MenuLinkItemState,
  JSX.IntrinsicElements['a']
> {
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

export namespace MenuLinkItem {
  export type State = MenuLinkItemState;
  export type Props = MenuLinkItemProps;
}
