import { createMemo } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { platform } from '@base-ui-solid/utils/platform';
import type { HTMLProps } from '../../internals/types';
import type { MenuStore } from '../store/MenuStore';
import { REASONS } from '../../internals/reasons';
import { useContextMenuRootContext } from '../../context-menu/root/ContextMenuRootContext';
import { useMenuRootContext } from '../root/MenuRootContext';
import { dispatchClickWithModifiers } from '../../utils/dispatchClickWithModifiers';
import type { UseMenuItemMetadata } from './useMenuItem';

function preventMouseDownDefault(event: MouseEvent) {
  event.preventDefault();
}

/**
 * Port note: reactive parameters (`closeOnClick`, `highlighted`, `id`, `nodeId`) are accessors.
 */
export interface UseMenuItemCommonPropsParameters {
  /**
   * Whether to close the menu when the item is clicked.
   */
  closeOnClick: Accessor<boolean>;
  /**
   * Determines if the menu item is highlighted.
   */
  highlighted: Accessor<boolean>;
  /**
   * The id of the menu item.
   */
  id: Accessor<string | undefined>;
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
   */
  typingRef?: RefObject<boolean> | undefined;
  /**
   * Ref to the item element.
   */
  itemRef: RefObject<HTMLElement | null>;
  /**
   * Metadata for checking item type before triggering click.
   */
  itemMetadata: UseMenuItemMetadata;
}

/**
 * Returns common props shared by all menu item types.
 * This hook extracts the shared logic for id, role, tabIndex, and interaction handlers.
 *
 * Port note: returns an accessor of the props.
 */
export function useMenuItemCommonProps(
  params: UseMenuItemCommonPropsParameters,
): Accessor<HTMLProps> {
  const { closeOnClick, highlighted, id, nodeId, store, typingRef, itemRef, itemMetadata } = params;

  const rootContext = useMenuRootContext();
  const contextMenuContext = useContextMenuRootContext(true);

  // A submenu trigger is an item of the parent menu's list, so it follows that list's focus model.
  const isSubmenuTrigger = itemMetadata.type === 'submenu-trigger';
  const virtualFocus = () =>
    isSubmenuTrigger ? rootContext.parentVirtualFocus : rootContext.virtualFocus;
  const webkitItemSelected = () =>
    isSubmenuTrigger ? rootContext.parentWebkitItemSelected : rootContext.webkitItemSelected;

  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const open = store.useState('open');

  const isContextMenu = contextMenuContext !== undefined;
  // `-1` rather than omitting it, which leaves links and buttons in the tab order.
  const tabIndex = () => (!virtualFocus() && open() && highlighted() ? 0 : -1);

  // `aria-selected` is not valid on `menuitem`, so it is scoped to the engine whose VoiceOver
  // support needs it. See `webkitItemSelected` on `MenuRootContext`.
  const ariaSelected = () => (virtualFocus() && webkitItemSelected() ? highlighted() : undefined);

  return createMemo((): HTMLProps => ({
    id: id(),
    role: 'menuitem' as const,
    tabindex: tabIndex(),
    // Boolean `aria-*` values are rendered as `"true"`/`"false"` (see `useRenderElement`).
    'aria-selected': ariaSelected() as HTMLProps['aria-selected'],
    // Real focus stays on the input or list that owns virtual navigation.
    onMouseDown: virtualFocus() ? preventMouseDownDefault : undefined,
    onKeyDown(event: KeyboardEvent) {
      if (event.key === ' ' && typingRef?.current) {
        event.preventDefault();
      }
    },
    onMouseMove(event: MouseEvent) {
      const nodeIdValue = nodeId();
      if (!nodeIdValue) {
        return;
      }

      // Inform the floating tree that a menu item within this menu was hovered/moved over
      // so unrelated descendant submenus can be closed.
      floatingTreeRoot().events.emit('itemhover', {
        nodeId: nodeIdValue,
        target: event.currentTarget,
      });
    },
    onClick(event: MouseEvent) {
      if (closeOnClick()) {
        floatingTreeRoot().events.emit('close', { domEvent: event, reason: REASONS.itemPress });
      }
    },
    onMouseUp(event: MouseEvent) {
      if (contextMenuContext) {
        const initialCursorPoint = contextMenuContext.initialCursorPointRef.current;
        contextMenuContext.initialCursorPointRef.current = null;
        if (
          isContextMenu &&
          initialCursorPoint &&
          Math.abs(event.clientX - initialCursorPoint.x) <= 1 &&
          Math.abs(event.clientY - initialCursorPoint.y) <= 1
        ) {
          return;
        }

        // On non-macOS platforms, this mouseup belongs to the right-click gesture
        // that opened the context menu, so it must not activate an item.
        if (isContextMenu && !platform.os.mac && event.button === 2) {
          return;
        }
      }

      if (
        itemRef.current &&
        store.context.allowMouseUpTriggerRef.current &&
        (!isContextMenu || event.button === 2)
      ) {
        // This fires whenever the user clicks on the trigger, moves the cursor, and releases it over the item.
        // We trigger the click and override the `closeOnClick` preference to always close the menu.
        if (itemMetadata.type === 'regular-item') {
          // `detail: 1` and `pointerType: 'mouse'` mark this as a mouse-gesture click so
          // MenuRoot and FloatingFocusManager don't treat it as a keyboard activation.
          dispatchClickWithModifiers(itemRef.current, event, {
            detail: 1,
            pointerType: 'mouse',
          });
        }
      }
    },
  }));
}

export interface UseMenuItemCommonPropsState {}
