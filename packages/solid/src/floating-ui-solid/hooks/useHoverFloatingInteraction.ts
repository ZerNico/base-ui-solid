import { onCleanup } from 'solid-js';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { mergeCleanups } from '@base-ui-solid/utils/mergeCleanups';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { isElement } from '@floating-ui/utils/dom';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useFloatingParentNodeId, useFloatingTree } from '../components/FloatingTree';
import type { FloatingRootContext } from '../types';
import { closest, contains, getTarget } from '../utils/element';
import { getNodeChildren } from '../utils/nodes';
import {
  applySafePolygonPointerEventsMutation,
  clearSafePolygonPointerEventsMutation,
  isInteractiveElement,
  useHoverInteractionSharedState,
} from './useHoverInteractionSharedState';
import {
  getDelay,
  isClickLikeOpenEvent as isClickLikeOpenEventShared,
  isHoverOpenEvent,
  isInsideEnabledTrigger,
} from './useHoverShared';

/**
 * Port note: read lazily like Solid props (`parameters.x`), so pass a props-like object with
 * getters for reactive options.
 */
export type UseHoverFloatingInteractionProps = {
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
   * without a `FloatingContext`, such as inline nested navigation menus.
   */
  nodeId?: string | undefined;
};

/**
 * Provides hover interactions that should be attached to the floating element.
 */
export function useHoverFloatingInteraction(
  store: FloatingRootContext,
  parameters: UseHoverFloatingInteractionProps = {},
): void {
  const enabled = () => parameters.enabled ?? true;
  const closeDelayProp = () => parameters.closeDelay ?? 0;

  const open = store.useState('open');
  const floatingElement = store.useState('floatingElement');
  const domReferenceElement = store.useState('domReferenceElement');
  const { dataRef } = store.context;

  const tree = useFloatingTree();
  const parentId = useFloatingParentNodeId();
  const instance = useHoverInteractionSharedState(store);

  const childClosedTimeout = useTimeout();

  function isClickLikeOpenEvent() {
    return isClickLikeOpenEventShared(dataRef.current.openEvent?.type, instance.interactedInside);
  }

  function isHoverOpen() {
    return isHoverOpenEvent(dataRef.current.openEvent?.type);
  }

  function clearPointerEvents() {
    clearSafePolygonPointerEventsMutation(instance);
  }

  useIsoLayoutEffect(
    ([openValue]) => {
      if (!openValue) {
        instance.pointerType = undefined;
        instance.restTimeoutPending = false;
        instance.interactedInside = false;
        clearPointerEvents();
      }
    },
    () => [open()],
  );

  onCleanup(clearPointerEvents);

  useIsoLayoutEffect(
    ([enabledValue, openValue, domReferenceElementValue, floatingElementValue]) => {
      if (!enabledValue) {
        return undefined;
      }

      if (
        openValue &&
        instance.handleCloseOptions?.blockPointerEvents &&
        isHoverOpen() &&
        isElement(domReferenceElementValue) &&
        floatingElementValue
      ) {
        const ref = domReferenceElementValue as HTMLElement | SVGSVGElement;
        const floatingEl = floatingElementValue;
        const doc = ownerDocument(floatingElementValue);

        const parentFloating = tree?.nodesRef.current.find((node) => node.id === parentId)?.context
          ?.elements.floating as HTMLElement | null;

        if (parentFloating) {
          parentFloating.style.pointerEvents = '';
        }

        // A keep-mounted submenu can appear in the tree before it opens, so a
        // cached scope or parent lookup may resolve to the submenu itself. That
        // would not shield sibling items in the parent menu.
        const cachedScopeElement =
          instance.pointerEventsScopeElement !== floatingEl
            ? instance.pointerEventsScopeElement
            : null;
        const parentScopeElement = parentFloating !== floatingEl ? parentFloating : null;
        const scopeElement =
          instance.handleCloseOptions?.getScope?.() ??
          cachedScopeElement ??
          parentScopeElement ??
          (closest(ref, '[data-rootownerid]') as HTMLElement | SVGSVGElement | null) ??
          doc.body;

        applySafePolygonPointerEventsMutation(instance, {
          scopeElement,
          referenceElement: ref,
          floatingElement: floatingEl,
        });

        return () => {
          clearPointerEvents();
        };
      }

      return undefined;
    },
    () => [enabled(), open(), domReferenceElement(), floatingElement()] as const,
  );

  useEffect(
    ([enabledValue, floatingElementValue]) => {
      if (!enabledValue) {
        return undefined;
      }

      function hasParentChildren() {
        return !!(tree && parentId && getNodeChildren(tree.nodesRef.current, parentId).length > 0);
      }

      function closeWithDelay(event: MouseEvent) {
        const closeDelay = getDelay(closeDelayProp(), 'close', instance.pointerType);
        const close = () => {
          store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
          tree?.events.emit('floating.closed', event);
        };

        if (closeDelay) {
          instance.openChangeTimeout.start(closeDelay, close);
        } else {
          instance.openChangeTimeout.clear();
          close();
        }
      }

      function handleInteractInside(event: PointerEvent) {
        const target = getTarget(event) as Element | null;
        if (!isInteractiveElement(target)) {
          instance.interactedInside = false;
          return;
        }

        instance.interactedInside = closest(target, '[aria-haspopup]') != null;
      }

      function onFloatingMouseEnter() {
        instance.openChangeTimeout.clear();
        childClosedTimeout.clear();
        tree?.events.off('floating.closed', onNodeClosed);
        clearPointerEvents();
      }

      function onFloatingMouseLeave(event: MouseEvent) {
        if (hasParentChildren() && tree) {
          tree.events.on('floating.closed', onNodeClosed);
          return;
        }

        if (isInsideEnabledTrigger(event.relatedTarget, store.context.triggerElements)) {
          // If the mouse is leaving the reference element to another trigger, don't explicitly close the popup
          // as it will be moved.
          return;
        }

        const currentNodeId = dataRef.current.floatingContext?.nodeId ?? parameters.nodeId;
        const relatedTarget = event.relatedTarget;
        const isMovingIntoDescendantFloating =
          tree &&
          currentNodeId &&
          isElement(relatedTarget) &&
          getNodeChildren(tree.nodesRef.current, currentNodeId, false).some((node) =>
            contains(node.context?.elements.floating, relatedTarget),
          );

        if (isMovingIntoDescendantFloating) {
          return;
        }

        // If the safePolygon handler is active, let it handle the close logic.
        if (instance.handler) {
          instance.handler(event);
          return;
        }

        clearPointerEvents();
        if (isHoverOpen() && !isClickLikeOpenEvent()) {
          closeWithDelay(event);
        }
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

      const floating = floatingElementValue;
      return mergeCleanups(
        floating && addEventListener(floating, 'mouseenter', onFloatingMouseEnter),
        floating && addEventListener(floating, 'mouseleave', onFloatingMouseLeave),
        floating && addEventListener(floating, 'pointerdown', handleInteractInside, true),
        () => {
          tree?.events.off('floating.closed', onNodeClosed);
        },
      );
    },
    () => [enabled(), floatingElement()] as const,
  );
}
