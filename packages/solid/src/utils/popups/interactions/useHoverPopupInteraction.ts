import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { mergeCleanups } from '@base-ui-solid/utils/mergeCleanups';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { isElement } from '@floating-ui/utils/dom';
import { onCleanupWithWrites } from '@base-ui-solid/utils/cleanup';
import { createChangeEventDetails } from '../../../internals/createBaseUIEventDetails';
import { REASONS } from '../../../internals/reasons';
import { useFloatingParentNodeId, useFloatingTree } from '../tree/FloatingTree';
import type { PopupInteractionStore } from '../types';
import { getNodeChildren } from '../tree/nodes';
import { getHoverIntent } from './hoverIntent';

/**
 * Port note: read lazily like Solid props (`parameters.x`), so pass a props-like object with
 * getters for reactive options.
 */
export type UseHoverPopupInteractionProps = {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * Waits for the specified time when the event listener runs before changing
   * the `open` state.
   * @default 0
   */
  closeDelay?: number | (() => number) | undefined;
  /**
   * Tree node id override for floating elements that participate in the tree
   * without a `PopupPositioningContext`, such as inline nested navigation menus.
   */
  nodeId?: string | undefined;
};

/**
 * Provides hover interactions that should be attached to the popup's positioner element.
 */
export function useHoverPopupInteraction(
  store: PopupInteractionStore,
  parameters: UseHoverPopupInteractionProps = {},
): void {
  const enabled = () => parameters.enabled ?? true;
  const closeDelayProp = () => parameters.closeDelay ?? 0;

  const open = store.useState('open');
  const positionerElement = store.useState('positionerElement');
  const anchorElement = store.useState('anchorElement');

  const tree = useFloatingTree();
  const parentId = useFloatingParentNodeId();
  const intent = getHoverIntent(store);

  const childClosedTimeout = useTimeout();

  useIsoLayoutEffect(
    ([openValue]) => {
      if (!openValue) {
        intent.reset();
      }
    },
    () => [open()],
  );

  onCleanupWithWrites(() => {
    intent.cancelPendingOpen();
    intent.restoreOutsidePointerEvents();
  });

  useIsoLayoutEffect(
    ([enabledValue, openValue, anchorElementValue, positionerElementValue]) => {
      if (!enabledValue) {
        return undefined;
      }

      if (
        openValue &&
        isElement(anchorElementValue) &&
        positionerElementValue &&
        intent.blockOutsidePointerEventsForPopup(
          anchorElementValue as HTMLElement | SVGSVGElement,
          positionerElementValue,
          tree,
          parentId,
        )
      ) {
        return intent.restoreOutsidePointerEvents;
      }

      return undefined;
    },
    () => [enabled(), open(), anchorElement(), positionerElement()] as const,
  );

  useEffect(
    ([enabledValue, positionerElementValue]) => {
      if (!enabledValue) {
        return undefined;
      }

      function hasParentChildren() {
        return !!(tree && parentId && getNodeChildren(tree.nodesRef.current, parentId).length > 0);
      }

      function onFloatingMouseEnter() {
        intent.onPopupMouseEnter();
        childClosedTimeout.clear();
        tree?.events.off('floating.closed', onNodeClosed);
      }

      function onFloatingMouseLeave(event: MouseEvent) {
        if (hasParentChildren() && tree) {
          tree.events.on('floating.closed', onNodeClosed);
          return;
        }

        intent.onPopupMouseLeave(event, {
          closeDelay: closeDelayProp(),
          tree,
          nodeId: parameters.nodeId,
        });
      }

      function onPopupPointerDown(event: PointerEvent) {
        intent.onPopupPointerDown(event);
      }

      function onNodeClosed(event: MouseEvent) {
        if (!tree || !parentId || hasParentChildren()) {
          return;
        }
        // Allow the mouseenter event to fire in case child was closed because mouse moved into parent.
        childClosedTimeout.start(0, () => {
          tree.events.off('floating.closed', onNodeClosed);
          store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
          tree.events.emit('floating.closed', event);
        });
      }

      const floating = positionerElementValue;
      return mergeCleanups(
        floating && addEventListener(floating, 'mouseenter', onFloatingMouseEnter),
        floating && addEventListener(floating, 'mouseleave', onFloatingMouseLeave),
        floating && addEventListener(floating, 'pointerdown', onPopupPointerDown, true),
        () => {
          tree?.events.off('floating.closed', onNodeClosed);
        },
      );
    },
    () => [enabled(), positionerElement()] as const,
  );
}
