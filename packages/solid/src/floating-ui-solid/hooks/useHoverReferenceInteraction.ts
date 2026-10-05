import { createMemo, flush, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { mergeCleanups } from '@base-ui-solid/utils/mergeCleanups';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { isElement } from '@floating-ui/utils/dom';
import { onCleanupWithWrites } from '@base-ui-solid/utils/cleanup';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { FloatingUIOpenChangeDetails, HTMLProps } from '../../internals/types';
import { useFloatingTree } from '../components/FloatingTree';
import type { FloatingTreeStore } from '../components/FloatingTreeStore';
import type { Delay, FloatingRootContext } from '../types';
import { contains, getTarget } from '../utils/element';
import { isMouseLikePointerType } from '../utils/event';
import {
  applySafePolygonPointerEventsMutation,
  clearSafePolygonPointerEventsMutation,
  useHoverInteractionSharedState,
} from './useHoverInteractionSharedState';
import type { HandleClose, HandleCloseContextBase } from './useHoverShared';
import {
  getDelay,
  getRestMs,
  isClickLikeOpenEvent as isClickLikeOpenEventShared,
  isInsideEnabledTrigger,
} from './useHoverShared';

/**
 * Port note: read lazily like Solid props (`props.x`), so pass a props-like object with getters
 * for reactive options. `externalTree` and `triggerElementRef` are read once.
 */
export interface UseHoverReferenceInteractionProps {
  enabled?: boolean | undefined;
  handleClose?: HandleClose | null | undefined;
  restMs?: number | (() => number) | undefined;
  delay?: Delay | (() => Delay) | undefined;
  move?: boolean | undefined;
  mouseOnly?: boolean | undefined;
  externalTree?: FloatingTreeStore | undefined;
  /**
   * Whether the hook controls the active trigger. When false, the props are
   * returned under the `trigger` key so they can be applied to inactive
   * triggers via `getTriggerProps`.
   * @default true
   */
  isActiveTrigger?: boolean | undefined;
  triggerElementRef?: Readonly<RefObject<Element | null>> | undefined;
  getHandleCloseContext?: (() => HandleCloseContextBase | null) | undefined;
  isClosing?: (() => boolean) | undefined;
  /**
   * Called before each hover-driven open attempt (immediate, delayed, and rest-ms
   * paths). Return `false` to veto; any other return value permits the open.
   */
  shouldOpen?: (() => boolean) | undefined;
  /**
   * Regression workaround (#5152): also cancels a pending hover-open from the
   * trigger's `mouseout`, backing up a `mouseleave` that Chrome can drop during
   * a fast pointer sweep and leave a submenu stuck open.
   *
   * WARNING: only enable on single-trigger, hover-driven roots (e.g.
   * `Menu.SubmenuTrigger`). It skips the `isClickLikeOpenEvent()` and
   * `isInsideEnabledTrigger()` checks `mouseleave` applies, so on a
   * multi-trigger or click-driven root it cancels legitimate opens/closes.
   * @default false
   */
  guardStaleOpen?: boolean | undefined;
}

const EMPTY_REF: Readonly<RefObject<Element | null>> = { current: null };

/**
 * Provides hover interactions that should be attached to reference or trigger
 * elements.
 *
 * Port note: returns an accessor of the props (`undefined` while disabled). Its event handlers
 * are created once.
 */
export function useHoverReferenceInteraction(
  store: FloatingRootContext,
  props: UseHoverReferenceInteractionProps = {},
): Accessor<HTMLProps | undefined> {
  const enabled = () => props.enabled ?? true;
  const delay = () => props.delay ?? 0;
  const handleClose = () => props.handleClose ?? null;
  const mouseOnly = () => props.mouseOnly ?? false;
  const restMs = () => props.restMs ?? 0;
  const move = () => props.move ?? true;
  const isActiveTrigger = () => props.isActiveTrigger ?? true;
  const guardStaleOpen = () => props.guardStaleOpen ?? false;
  const triggerElementRef = props.triggerElementRef ?? EMPTY_REF;

  const { dataRef, events } = store.context;

  const tree = useFloatingTree(props.externalTree);

  const instance = useHoverInteractionSharedState(store);
  let isHoverCloseActive = false;

  function isClickLikeOpenEvent() {
    return isClickLikeOpenEventShared(dataRef.current.openEvent?.type, instance.interactedInside);
  }

  function checkShouldOpen() {
    return props.shouldOpen?.() !== false;
  }

  function isOverInactiveTrigger(
    currentDomReference: Element | null,
    currentTarget: Element,
    target: EventTarget | null,
  ): boolean {
    const allTriggers = store.context.triggerElements;

    // Fast path for normal usage where handlers are attached directly to triggers.
    if (allTriggers.hasElement(currentTarget)) {
      return !currentDomReference || !contains(currentDomReference, currentTarget);
    }

    // Fallback for delegated/wrapper usage where currentTarget may be outside the trigger map.
    if (!isElement(target)) {
      return false;
    }

    const targetElement = target as Element;
    return (
      allTriggers.hasMatchingElement((trigger) => contains(trigger, targetElement)) &&
      (!currentDomReference || !contains(currentDomReference, targetElement))
    );
  }

  function cleanupMouseMoveHandler() {
    if (!instance.handler) {
      return;
    }

    const doc = ownerDocument(store.select('domReferenceElement'));
    doc.removeEventListener('mousemove', instance.handler);
    instance.handler = undefined;
  }

  function clearPointerEvents() {
    clearSafePolygonPointerEventsMutation(instance);
  }

  // Port note: upstream assigns this during render: assign it now and whenever it changes.
  useEffect(
    ([isActive, handleCloseValue]) => {
      if (isActive) {
        // eslint-disable-next-line no-underscore-dangle
        instance.handleCloseOptions = handleCloseValue?.__options;
      }
    },
    () => [isActiveTrigger(), handleClose()],
  );
  untrack(() => {
    if (isActiveTrigger()) {
      // eslint-disable-next-line no-underscore-dangle
      instance.handleCloseOptions = handleClose()?.__options;
    }
  });

  onCleanupWithWrites(cleanupMouseMoveHandler);

  // When closing before opening, clear the delay timeouts to cancel it
  // from showing.
  useEffect(
    ([enabledValue]) => {
      if (!enabledValue) {
        return undefined;
      }

      function onOpenChangeLocal(details: FloatingUIOpenChangeDetails) {
        if (!details.open) {
          isHoverCloseActive = details.reason === REASONS.triggerHover;
          cleanupMouseMoveHandler();
          instance.openChangeTimeout.clear();
          instance.restTimeout.clear();
          instance.blockMouseMove = true;
          instance.restTimeoutPending = false;
        } else {
          isHoverCloseActive = false;
        }
      }

      events.on('openchange', onOpenChangeLocal);
      return () => {
        events.off('openchange', onOpenChangeLocal);
      };
    },
    () => [enabled()],
  );

  useEffect(
    ([enabledValue, isActive, mouseOnlyValue, moveValue, guardStaleOpenValue]) => {
      if (!enabledValue) {
        return undefined;
      }

      function closeWithDelay(event: MouseEvent, runElseBranch = true) {
        const closeDelay = getDelay(delay(), 'close', instance.pointerType);
        if (closeDelay) {
          instance.openChangeTimeout.start(closeDelay, () => {
            store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
            tree?.events.emit('floating.closed', event);
          });
        } else if (runElseBranch) {
          instance.openChangeTimeout.clear();
          store.setOpen(false, createChangeEventDetails(REASONS.triggerHover, event));
          tree?.events.emit('floating.closed', event);
        }
      }

      const trigger =
        (triggerElementRef.current as HTMLElement | null) ??
        (isActive ? (store.select('domReferenceElement') as HTMLElement | null) : null);

      if (!isElement(trigger)) {
        return undefined;
      }

      function onMouseEnter(event: MouseEvent) {
        instance.openChangeTimeout.clear();
        instance.blockMouseMove = false;

        if (mouseOnlyValue && !isMouseLikePointerType(instance.pointerType)) {
          return;
        }

        // Only rest delay is set; there's no fallback delay.
        // This will be handled by `onMouseMove`.
        const restMsValue = getRestMs(restMs());
        const openDelay = getDelay(delay(), 'open', instance.pointerType);
        const eventTarget = getTarget(event);
        const currentTarget = (event.currentTarget as HTMLElement) ?? null;
        const currentDomReference = store.select('domReferenceElement');
        let triggerNode = currentTarget;

        // Wrapper/delegated mode: resolve the actual trigger from the event target.
        if (isElement(eventTarget) && !store.context.triggerElements.hasElement(eventTarget)) {
          for (const triggerElement of store.context.triggerElements.elements()) {
            if (contains(triggerElement, eventTarget)) {
              triggerNode = triggerElement as HTMLElement;
              break;
            }
          }
        }

        // Wrapper/delegated mode fallback: if the wrapper contains the active trigger,
        // treat this as re-entering that active trigger.
        if (
          isElement(currentTarget) &&
          isElement(currentDomReference) &&
          !store.context.triggerElements.hasElement(currentTarget) &&
          contains(currentTarget, currentDomReference)
        ) {
          triggerNode = currentDomReference as HTMLElement;
        }

        const isOverInactive =
          triggerNode == null
            ? false
            : isOverInactiveTrigger(currentDomReference, triggerNode, eventTarget);
        const isOpen = store.select('open');
        const isInClosingTransition =
          props.isClosing?.() ?? store.select('transitionStatus') === 'ending';
        const isHoverCloseTransition = !isOpen && isInClosingTransition && isHoverCloseActive;
        const isReenteringSameTriggerDuringCloseTransition =
          !isOverInactive &&
          isElement(triggerNode) &&
          isElement(currentDomReference) &&
          contains(currentDomReference, triggerNode) &&
          isHoverCloseTransition;
        const isRestOnlyDelay = restMsValue > 0 && !openDelay;
        const shouldOpenImmediately =
          (isOverInactive && (isOpen || isHoverCloseTransition)) ||
          isReenteringSameTriggerDuringCloseTransition;

        const shouldOpen = !isOpen || isOverInactive;

        // Open immediately when moving between triggers while open, or during
        // a hover-driven close transition (including same-trigger re-entry).
        if (shouldOpenImmediately) {
          if (checkShouldOpen()) {
            store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, triggerNode));
          }
          return;
        }

        if (isRestOnlyDelay) {
          return;
        }

        if (openDelay) {
          instance.openChangeTimeout.start(openDelay, () => {
            if (shouldOpen && checkShouldOpen()) {
              store.setOpen(
                true,
                createChangeEventDetails(REASONS.triggerHover, event, triggerNode),
              );
            }
          });
        } else if (shouldOpen) {
          if (checkShouldOpen()) {
            store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, event, triggerNode));
          }
        }
      }

      function onMouseLeave(event: MouseEvent) {
        if (isClickLikeOpenEvent()) {
          clearPointerEvents();
          return;
        }

        cleanupMouseMoveHandler();

        const domReferenceElement = store.select('domReferenceElement');
        const doc = ownerDocument(domReferenceElement);
        instance.restTimeout.clear();
        instance.restTimeoutPending = false;

        const handleCloseContextBase =
          dataRef.current.floatingContext ?? props.getHandleCloseContext?.();

        if (isInsideEnabledTrigger(event.relatedTarget, store.context.triggerElements)) {
          return;
        }

        const handleCloseValue = handleClose();
        if (handleCloseValue && handleCloseContextBase) {
          if (!store.select('open')) {
            instance.openChangeTimeout.clear();
          }

          const currentTrigger = triggerElementRef.current;

          instance.handler = handleCloseValue({
            ...handleCloseContextBase,
            tree,
            x: event.clientX,
            y: event.clientY,
            onClose() {
              clearPointerEvents();
              cleanupMouseMoveHandler();
              if (
                enabled() &&
                !isClickLikeOpenEvent() &&
                currentTrigger === store.select('domReferenceElement')
              ) {
                closeWithDelay(event, true);
              }
            },
          });

          doc.addEventListener('mousemove', instance.handler);
          instance.handler(event);

          return;
        }

        const shouldClose =
          instance.pointerType === 'touch'
            ? !contains(store.select('floatingElement'), event.relatedTarget as Element | null)
            : true;

        if (shouldClose) {
          closeWithDelay(event);
        }
      }

      // Backup cancellation for Chrome's dropped `mouseleave` — see `guardStaleOpen`.
      function onMouseOut(event: MouseEvent) {
        if (contains(trigger, event.relatedTarget as Element | null)) {
          return; // moved within the trigger's own subtree
        }
        instance.openChangeTimeout.clear();
        instance.restTimeout.clear();
        instance.restTimeoutPending = false;
      }

      const staleOpenGuard = guardStaleOpenValue
        ? addEventListener(trigger, 'mouseout', onMouseOut)
        : undefined;

      if (moveValue) {
        return mergeCleanups(
          addEventListener(trigger, 'mousemove', onMouseEnter, { once: true }),
          addEventListener(trigger, 'mouseenter', onMouseEnter),
          addEventListener(trigger, 'mouseleave', onMouseLeave),
          staleOpenGuard,
        );
      }

      return mergeCleanups(
        addEventListener(trigger, 'mouseenter', onMouseEnter),
        addEventListener(trigger, 'mouseleave', onMouseLeave),
        staleOpenGuard,
      );
    },
    () =>
      [
        enabled(),
        isActiveTrigger(),
        mouseOnly(),
        move(),
        guardStaleOpen(),
        store,
        tree,
        triggerElementRef,
      ] as const,
  );

  function setPointerRef(event: PointerEvent) {
    instance.pointerType = event.pointerType;
  }

  const referenceProps: HTMLProps = {
    onPointerDown: setPointerRef,
    onPointerEnter: setPointerRef,
    onMouseMove(event: MouseEvent) {
      const nativeEvent = event;
      const trigger = event.currentTarget as HTMLElement;

      const currentDomReference = store.select('domReferenceElement');
      const currentOpen = store.select('open');
      const isOverInactive = isOverInactiveTrigger(currentDomReference, trigger, event.target);

      if (mouseOnly() && !isMouseLikePointerType(instance.pointerType)) {
        return;
      }

      if (currentOpen && isOverInactive && instance.handleCloseOptions?.blockPointerEvents) {
        const floatingElement = store.select('floatingElement');

        if (floatingElement) {
          const scopeElement =
            instance.handleCloseOptions?.getScope?.() ?? trigger.ownerDocument.body;

          applySafePolygonPointerEventsMutation(instance, {
            scopeElement,
            referenceElement: trigger,
            floatingElement,
          });
        }
      }

      const restMsValue = getRestMs(restMs());
      if ((currentOpen && !isOverInactive) || restMsValue === 0) {
        return;
      }

      if (
        !isOverInactive &&
        instance.restTimeoutPending &&
        event.movementX ** 2 + event.movementY ** 2 < 2
      ) {
        return;
      }

      instance.restTimeout.clear();

      function handleMouseMove() {
        instance.restTimeoutPending = false;

        // A delayed hover open should not override a click-like open that happened
        // while the hover delay was pending.
        if (isClickLikeOpenEvent()) {
          return;
        }

        const latestOpen = store.select('open');

        if (!instance.blockMouseMove && (!latestOpen || isOverInactive) && checkShouldOpen()) {
          store.setOpen(true, createChangeEventDetails(REASONS.triggerHover, nativeEvent, trigger));
        }
      }

      if (instance.pointerType === 'touch') {
        // Port note: `ReactDOM.flushSync(handleMouseMove)`.
        handleMouseMove();
        flush();
      } else if (isOverInactive && currentOpen) {
        handleMouseMove();
      } else {
        instance.restTimeoutPending = true;
        instance.restTimeout.start(restMsValue, handleMouseMove);
      }
    },
  };

  return createMemo(() => (enabled() ? referenceProps : undefined));
}
