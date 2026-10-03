import { onCleanup } from 'solid-js';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { mergeCleanups } from '@base-ui-solid/utils/mergeCleanups';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { isElement } from '@floating-ui/utils/dom';
import { createChangeEventDetails } from '../../src/internals/createBaseUIEventDetails';
import { REASONS } from '../../src/internals/reasons';
import type { FloatingUIOpenChangeDetails } from '../../src/internals/types';
import {
  useFloatingParentNodeId,
  useFloatingTree,
} from '../../src/floating-ui-react/components/FloatingTree';
import type {
  Delay,
  ElementProps,
  FloatingContext,
  FloatingRootContext,
} from '../../src/floating-ui-react/types';
import {
  contains,
  getTarget,
  isInteractiveElement,
} from '../../src/floating-ui-react/utils/element';
import type { HandleClose } from '../../src/floating-ui-react/hooks/useHoverShared';
import {
  getDelay,
  getRestMs,
  isClickLikeOpenEvent as isClickLikeOpenEventShared,
  isHoverOpenEvent,
} from '../../src/floating-ui-react/hooks/useHoverShared';

export type {
  HandleCloseContext,
  HandleClose,
} from '../../src/floating-ui-react/hooks/useHoverShared';

/**
 * Port note: read lazily like Solid props, so pass a props-like object with getters for reactive
 * options.
 */
export interface UseHoverProps {
  /**
   * Accepts an event handler that runs on `mousemove` to control when the
   * floating element closes once the cursor leaves the reference element.
   * @default null
   */
  handleClose?: HandleClose | null | undefined;
  /**
   * Waits until the user's cursor is at “rest” over the reference element
   * before changing the `open` state.
   * @default 0
   */
  restMs?: number | (() => number) | undefined;
  /**
   * Waits for the specified time when the event listener runs before changing
   * the `open` state.
   * @default 0
   */
  delay?: Delay | (() => Delay) | undefined;
  /**
   * Whether moving the cursor over the floating element will open it, without a
   * regular hover event required.
   * @default true
   */
  move?: boolean | undefined;
}

/**
 * Opens the floating element while hovering over the reference element, like
 * CSS `:hover`.
 * @see https://floating-ui.com/docs/useHover
 */
export function useHover(
  context: FloatingRootContext | FloatingContext,
  props: UseHoverProps = {},
): ElementProps {
  const delay = () => props.delay ?? 0;
  const handleClose = () => props.handleClose ?? null;
  const restMs = () => props.restMs ?? 0;
  const move = () => props.move ?? true;

  const store = 'rootStore' in context ? context.rootStore : context;

  const open = store.useState('open');
  const floatingElement = store.useState('floatingElement');
  const domReferenceElement = store.useState('domReferenceElement');
  const { dataRef, events } = store.context;

  const tree = useFloatingTree();
  const parentId = useFloatingParentNodeId();

  let pointerType: string | undefined;
  let interactedInside = false;
  let handlerRef: ((event: MouseEvent) => void) | undefined;
  let blockMouseMove = true;
  let performedPointerEventsMutation = false;
  let unbindMouseMove = () => {};
  let restTimeoutPending = false;

  const timeout = useTimeout();
  const restTimeout = useTimeout();

  function isHoverOpen() {
    return isHoverOpenEvent(dataRef.current.openEvent?.type);
  }

  function isClickLikeOpenEvent() {
    return isClickLikeOpenEventShared(dataRef.current.openEvent?.type, interactedInside);
  }

  function cleanupMouseMoveHandler() {
    unbindMouseMove();
    handlerRef = undefined;
  }

  function clearPointerEvents() {
    if (performedPointerEventsMutation) {
      const body = ownerDocument(store.state.floatingElement).body;
      body.style.pointerEvents = '';
      performedPointerEventsMutation = false;
    }
  }

  // When closing before opening, clear the delay timeouts to cancel it
  // from showing.
  useEffect(
    () => {
      function onOpenChangeLocal(details: FloatingUIOpenChangeDetails) {
        if (!details.open) {
          timeout.clear();
          restTimeout.clear();
          blockMouseMove = true;
          restTimeoutPending = false;
        }
      }

      events.on('openchange', onOpenChangeLocal);
      return () => {
        events.off('openchange', onOpenChangeLocal);
      };
    },
    () => [events],
  );

  useEffect(
    ([floatingElementValue, openValue]) => {
      if (!handleClose()) {
        return undefined;
      }

      if (!openValue) {
        return undefined;
      }

      function onLeave(event: MouseEvent) {
        if (isClickLikeOpenEvent()) {
          return;
        }

        if (isHoverOpen()) {
          store.setOpen(
            false,
            createChangeEventDetails(
              REASONS.triggerHover,
              event,
              (event.currentTarget as HTMLElement) ?? undefined,
            ),
          );
        }
      }

      const html = ownerDocument(floatingElementValue).documentElement;
      return addEventListener(html, 'mouseleave', onLeave);
    },
    () => [floatingElement(), open()] as const,
  );

  // Registering the mouse events on the reference directly to bypass the
  // delegation system. If the cursor was on a disabled element and then entered
  // the reference (no gap), `mouseenter` doesn't fire in the delegation system.
  useEffect(
    ([moveValue, domReferenceElementValue, floatingElementValue, openValue]) => {
      function closeWithDelay(event: MouseEvent, runElseBranch = true) {
        const closeDelay = getDelay(delay(), 'close', pointerType);
        if (closeDelay && !handlerRef) {
          timeout.start(closeDelay, () =>
            store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event)),
          );
        } else if (runElseBranch) {
          timeout.clear();
          store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
        }
      }

      function handleInteractInside(event: PointerEvent) {
        const target = getTarget(event) as Element | null;
        if (!isInteractiveElement(target)) {
          interactedInside = false;
          return;
        }

        interactedInside = true;
      }

      function getHandleCloseHandler(event: MouseEvent, onClose: () => void) {
        const handleCloseValue = handleClose();
        if (!handleCloseValue || !dataRef.current.floatingContext) {
          return null;
        }

        return handleCloseValue({
          ...dataRef.current.floatingContext,
          tree,
          x: event.clientX,
          y: event.clientY,
          onClose,
        });
      }

      function onReferenceMouseEnter(event: MouseEvent) {
        timeout.clear();
        blockMouseMove = false;

        if (getRestMs(restMs()) > 0 && !getDelay(delay(), 'open')) {
          return;
        }

        const openDelay = getDelay(delay(), 'open', pointerType);
        const trigger = (event.currentTarget as HTMLElement) ?? undefined;

        const domReference = store.select('domReferenceElement');

        const isOverInactiveTrigger = domReference && trigger && !contains(domReference, trigger);

        if (openDelay) {
          timeout.start(openDelay, () => {
            if (!store.select('open')) {
              store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, trigger));
            }
          });
        } else if (!openValue || isOverInactiveTrigger) {
          store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, trigger));
        }
      }

      function onReferenceMouseLeave(event: MouseEvent) {
        if (isClickLikeOpenEvent()) {
          clearPointerEvents();
          return;
        }

        unbindMouseMove();

        const doc = ownerDocument(floatingElementValue);
        restTimeout.clear();
        restTimeoutPending = false;

        const triggers = store.context.triggerElements;

        if (event.relatedTarget && triggers.hasElement(event.relatedTarget as Element)) {
          // If the mouse is leaving the reference element to another trigger, don't explicitly close the popup
          // as it will be moved.
          return;
        }

        const handler = getHandleCloseHandler(event, () => {
          clearPointerEvents();
          cleanupMouseMoveHandler();
          if (!isClickLikeOpenEvent()) {
            closeWithDelay(event, true);
          }
        });

        if (handler) {
          // Prevent clearing `onScrollMouseLeave` timeout.
          if (!openValue) {
            timeout.clear();
          }

          handlerRef = handler;
          unbindMouseMove = addEventListener(doc, 'mousemove', handler);

          return;
        }

        // Allow interactivity without `safePolygon` on touch devices. With a
        // pointer, a short close delay is an alternative, so it should work
        // consistently.
        const shouldClose =
          pointerType === 'touch'
            ? !contains(floatingElementValue, event.relatedTarget as Element | null)
            : true;
        if (shouldClose) {
          closeWithDelay(event);
        }
      }

      // Ensure the floating element closes after scrolling even if the pointer
      // did not move.
      // https://github.com/floating-ui/floating-ui/discussions/1692
      function onScrollMouseLeave(event: MouseEvent) {
        if (isClickLikeOpenEvent() || !dataRef.current.floatingContext || !store.select('open')) {
          return;
        }

        const triggers = store.context.triggerElements;

        if (event.relatedTarget && triggers.hasElement(event.relatedTarget as Element)) {
          // If the mouse is leaving the reference element to another trigger, don't explicitly close the popup
          // as it will be moved.
          return;
        }

        getHandleCloseHandler(event, () => {
          clearPointerEvents();
          cleanupMouseMoveHandler();
          if (!isClickLikeOpenEvent()) {
            closeWithDelay(event);
          }
        })?.(event);
      }

      function onFloatingMouseEnter() {
        timeout.clear();
        clearPointerEvents();
      }

      function onFloatingMouseLeave(event: MouseEvent) {
        if (!isClickLikeOpenEvent()) {
          closeWithDelay(event, false);
        }
      }

      const trigger = domReferenceElementValue as HTMLElement | null;

      if (isElement(trigger)) {
        const floating = floatingElementValue;

        return mergeCleanups(
          openValue && addEventListener(trigger, 'mouseleave', onScrollMouseLeave),
          moveValue &&
            addEventListener(trigger, 'mousemove', onReferenceMouseEnter, { once: true }),
          addEventListener(trigger, 'mouseenter', onReferenceMouseEnter),
          addEventListener(trigger, 'mouseleave', onReferenceMouseLeave),
          floating && addEventListener(floating, 'mouseleave', onScrollMouseLeave),
          floating && addEventListener(floating, 'mouseenter', onFloatingMouseEnter),
          floating && addEventListener(floating, 'mouseleave', onFloatingMouseLeave),
          floating && addEventListener(floating, 'pointerdown', handleInteractInside, true),
        );
      }

      return undefined;
    },
    () => [move(), domReferenceElement(), floatingElement(), open()] as const,
  );

  // Block pointer-events of every element other than the reference and floating
  // while the floating element is open and has a `handleClose` handler. Also
  // handles nested floating elements.
  // https://github.com/floating-ui/floating-ui/issues/1722
  useIsoLayoutEffect(
    ([openValue, handleCloseValue, domReferenceElementValue, floatingElementValue]) => {
      // eslint-disable-next-line no-underscore-dangle
      if (openValue && handleCloseValue?.__options?.blockPointerEvents && isHoverOpen()) {
        performedPointerEventsMutation = true;
        const floatingEl = floatingElementValue;

        if (isElement(domReferenceElementValue) && floatingEl) {
          const body = ownerDocument(floatingElementValue).body;

          const ref = domReferenceElementValue as HTMLElement | SVGSVGElement;

          const parentFloating = tree?.nodesRef.current.find((node) => node.id === parentId)
            ?.context?.elements.floating;

          if (parentFloating) {
            parentFloating.style.pointerEvents = '';
          }

          body.style.pointerEvents = 'none';
          ref.style.pointerEvents = 'auto';
          floatingEl.style.pointerEvents = 'auto';

          return () => {
            body.style.pointerEvents = '';
            ref.style.pointerEvents = '';
            floatingEl.style.pointerEvents = '';
          };
        }
      }

      return undefined;
    },
    () => [open(), handleClose(), domReferenceElement(), floatingElement()] as const,
  );

  useIsoLayoutEffect(
    ([openValue]) => {
      if (!openValue) {
        pointerType = undefined;
        restTimeoutPending = false;
        interactedInside = false;
        cleanupMouseMoveHandler();
        clearPointerEvents();
      }
    },
    () => [open()],
  );

  useEffect(
    () => {
      return () => {
        cleanupMouseMoveHandler();
        timeout.clear();
        restTimeout.clear();
        interactedInside = false;
      };
    },
    () => [domReferenceElement()],
  );

  onCleanup(clearPointerEvents);

  function setPointerRef(event: PointerEvent) {
    pointerType = event.pointerType;
  }

  const reference: NonNullable<ElementProps['reference']> = {
    onPointerDown: setPointerRef,
    onPointerEnter: setPointerRef,
    onMouseMove(event: MouseEvent) {
      const nativeEvent = event;
      const trigger = event.currentTarget as HTMLElement;

      // `true` when there are multiple triggers per floating element and user hovers over the one that
      // wasn't used to open the floating element.
      const isOverInactiveTrigger =
        store.select('domReferenceElement') &&
        !contains(store.select('domReferenceElement'), event.target as Element);

      function handleMouseMove() {
        if (!blockMouseMove && (!store.select('open') || isOverInactiveTrigger)) {
          store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, nativeEvent, trigger));
        }
      }

      if ((store.select('open') && !isOverInactiveTrigger) || getRestMs(restMs()) === 0) {
        return;
      }

      // Ignore insignificant movements to account for tremors.
      if (
        !isOverInactiveTrigger &&
        restTimeoutPending &&
        event.movementX ** 2 + event.movementY ** 2 < 2
      ) {
        return;
      }

      restTimeout.clear();

      if (pointerType === 'touch') {
        handleMouseMove();
      } else if (isOverInactiveTrigger) {
        handleMouseMove();
      } else {
        restTimeoutPending = true;
        restTimeout.start(getRestMs(restMs()), handleMouseMove);
      }
    },
  };

  return { reference };
}
