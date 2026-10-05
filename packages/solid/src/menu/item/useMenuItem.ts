import type { Accessor } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useButton } from '../../internals/use-button';
import { mergePropsSnapshot } from '../../merge-props/mergeProps';
import type { HTMLProps } from '../../internals/types';
import type { MenuStore } from '../store/MenuStore';
import { useMenuItemCommonProps } from './useMenuItemCommonProps';

export const REGULAR_ITEM = {
  type: 'regular-item' as const,
};

export function useMenuItem(params: UseMenuItemParameters): UseMenuItemReturnValue {
  const {
    closeOnClick,
    disabled,
    highlighted,
    id,
    store,
    typingRef = store.context.typingRef,
    nativeButton,
    itemMetadata,
    nodeId,
  } = params;

  const itemRef: RefObject<HTMLElement | null> = { current: null };

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled: () => true,
    native: nativeButton,
    composite: () => true,
  });

  const commonProps = useMenuItemCommonProps({
    closeOnClick,
    highlighted,
    id,
    nodeId,
    store,
    typingRef,
    itemRef,
    itemMetadata,
  });

  const getItemProps = (externalProps?: HTMLProps): HTMLProps => {
    return mergePropsSnapshot<any>(
      commonProps(),
      {
        onMouseEnter(event: MouseEvent) {
          if (itemMetadata.type !== 'submenu-trigger') {
            return;
          }

          itemMetadata.setActive(event);
        },
      },
      externalProps,
      getButtonProps,
    );
  };

  const mergedRef = (element: HTMLElement | null) => {
    itemRef.current = element;
    buttonRef(element);
  };

  return {
    getItemProps,
    itemRef: mergedRef,
  };
}

/**
 * Port note: reactive parameters are accessors.
 */
export interface UseMenuItemParameters {
  /**
   * Whether to close the menu when the item is clicked.
   */
  closeOnClick: Accessor<boolean>;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: Accessor<boolean>;
  /**
   * Determines if the menu item is highlighted.
   */
  highlighted: Accessor<boolean>;
  /**
   * The id of the menu item.
   */
  id: Accessor<string | undefined>;
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `false` if the rendered element is not a button (for example, `<div>`).
   * @default false
   */
  nativeButton: Accessor<boolean>;
  /**
   * Additional data specific to the item type.
   */
  itemMetadata: UseMenuItemMetadata;
  /**
   * The node id of the menu positioner.
   */
  nodeId: Accessor<string | undefined>;
  /**
   * The menu store.
   */
  store: MenuStore<any>;
  /**
   * Whether a typeahead session is in progress.
   * @default store.context.typingRef
   */
  typingRef?: RefObject<boolean> | undefined;
}

export type UseMenuItemMetadata =
  | typeof REGULAR_ITEM
  | {
      type: 'submenu-trigger';
      setActive: (event: MouseEvent) => void;
    };

export interface UseMenuItemReturnValue {
  /**
   * Resolver for the root slot's props.
   * @param externalProps event handlers for the root slot
   * @returns props that should be spread on the root slot
   */
  getItemProps: (externalProps?: HTMLProps) => HTMLProps;
  /**
   * The ref to the component's root DOM element.
   */
  itemRef: (element: HTMLElement | null) => void;
}

export interface UseMenuItemState {}
