import { createMemo, createSignal, flush, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { inertValue } from '@base-ui-solid/utils/inertValue';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useIsoLayoutEffect, useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { activeElement, closest, contains, getTarget } from '../../floating-ui-react/utils';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import type { ToastObject as ToastObjectType } from '../useToastManager';
import { ToastRootContext } from './ToastRootContext';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useToastProviderContext } from '../provider/ToastProviderContext';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { useRenderElement } from '../../internals/useRenderElement';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import {
  BASE_UI_SWIPE_IGNORE_SELECTOR,
  LEGACY_SWIPE_IGNORE_SELECTOR,
} from '../../internals/constants';
import { getDisplacement } from '../../utils/useSwipeDismiss';
import { getElementTransform } from '../../utils/getElementTransform';
import * as ToastRootCssVars from './ToastRootCssVars';
import * as ToastRootDataAttributes from './ToastRootDataAttributes';

export const toastRootStateAttributesMapping: StateAttributesMapping<ToastRootState> = {
  ...transitionStatusMapping,
  swipeDirection(value) {
    return value ? { [ToastRootDataAttributes.swipeDirection]: value } : null;
  },
};

const SWIPE_THRESHOLD = 40;
const REVERSE_CANCEL_THRESHOLD = 10;
const OPPOSITE_DIRECTION_DAMPING_FACTOR = 0.5;
const MIN_DRAG_THRESHOLD = 1;
const TOAST_SWIPE_IGNORE_SELECTOR = `${BASE_UI_SWIPE_IGNORE_SELECTOR},${LEGACY_SWIPE_IGNORE_SELECTOR}`;

type SwipeDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Groups all parts of an individual toast.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastRoot(componentProps: ToastRoot.Props) {
  const elementProps = omit(componentProps, 'toast', 'render', 'class', 'swipeDirection', 'style');

  const toast = () => componentProps.toast;

  const isAnchored = () => toast().positionerProps?.anchor !== undefined;

  const swipeDirections = createMemo((): SwipeDirection[] => {
    if (isAnchored()) {
      return [];
    }
    const swipeDirection = componentProps.swipeDirection ?? ['down', 'right'];
    return Array.isArray(swipeDirection) ? swipeDirection : [swipeDirection];
  });

  const swipeEnabled = () => swipeDirections().length > 0;

  const store = useToastProviderContext();

  const [currentSwipeDirection, setCurrentSwipeDirection] = createSignal<
    SwipeDirection | undefined
  >(undefined);
  const [isSwiping, setIsSwiping] = createSignal(false);
  const [dragOffset, setDragOffset] = createSignal({ x: 0, y: 0 });
  const [initialTransform, setInitialTransform] = createSignal({ x: 0, y: 0, scale: 1 });
  // Port note: `ownedWrite` because Title/Description reset these ids in their effect cleanup,
  // which also runs while the toast row is being disposed.
  const [titleId, setTitleId] = createSignal<string | undefined>(undefined, { ownedWrite: true });
  const [descriptionId, setDescriptionId] = createSignal<string | undefined>(undefined, {
    ownedWrite: true,
  });

  // Port note: upstream keeps `isRealSwipe` and `lockedDirection` in state, but only reads them in
  // the pointer handlers. Solid applies signal writes when it flushes, while consecutive pointer
  // events dispatched in the same task (e.g. `fireEvent` in tests) re-render in between with
  // React, so they're plain refs here.
  const isRealSwipeRef = { current: false };
  const lockedDirectionRef: { current: 'horizontal' | 'vertical' | null } = { current: null };

  function setIsRealSwipe(value: boolean) {
    isRealSwipeRef.current = value;
  }

  function setLockedDirection(value: 'horizontal' | 'vertical' | null) {
    lockedDirectionRef.current = value;
  }

  const rootRef: RefObject<HTMLDivElement | null> = { current: null };
  let lastToastId: string | undefined;
  let dragStartPos = { x: 0, y: 0 };
  let initialTransformRef = { x: 0, y: 0, scale: 1 };
  let intendedSwipeDirection: SwipeDirection | undefined;
  let maxSwipeDisplacement = 0;
  let cancelledSwipe = false;
  let swipeCancelBaseline = { x: 0, y: 0 };
  let isFirstPointerMove = false;
  let dragOffsetRef = { x: 0, y: 0 };
  let activePointerId: number | null = null;
  let dragAbortController: AbortController | null = null;

  const domIndex = store.useState('toastIndex', () => toast().id);
  const visibleIndex = store.useState('toastVisibleIndex', () => toast().id);
  const offsetY = store.useState('toastOffsetY', () => toast().id);
  const focused = store.useState('focused');
  const expanded = store.useState('expanded');

  useOpenChangeComplete({
    open: () => toast().transitionStatus !== 'ending',
    ref: () => rootRef.current,
    onComplete() {
      const currentToast = toast();
      if (currentToast.transitionStatus === 'ending') {
        store.removeToast(currentToast.id);
      }
    },
  });

  // Recalculates the natural height of the toast and updates it in the toast manager.
  // `flushSync` avoids visual flickers when called from observer callbacks.
  // The store ignores this write while the toast is transitioning out.
  const recalculateHeight = (flushSync: boolean = false) => {
    const element = rootRef.current;
    if (!element) {
      return;
    }

    const previousHeight = element.style.height;
    element.style.height = 'auto';

    const height = element.offsetHeight;

    element.style.height = previousHeight;

    store.updateToastInternal(toast().id, {
      ref: rootRef,
      height,
      transitionStatus: undefined,
    });

    // Port note: `ReactDOM.flushSync(update)` → `update(); flush();`.
    if (flushSync) {
      flush();
    }
  };

  // Initialize the toast on mount, and reinitialize when it begins a new lifecycle:
  // re-adding an ending toast retains the same root instance (`key={toast.id}`), and
  // index-keyed lists can hand an existing instance a different toast.
  useIsoLayoutEffect(
    ([toastId, transitionStatus]) => {
      const previousToastId = lastToastId;
      // `recalculateHeight` clears the `starting` status itself, so bail out on the
      // resulting re-run and on the later `ending` one, which the store discards anyway.
      if (transitionStatus !== 'starting' && previousToastId === toastId) {
        return;
      }

      if (previousToastId !== undefined) {
        // A retained root keeps component-local swipe state from its previous lifecycle;
        // clear it so the toast doesn't stay offset or exit in the swiped direction.
        setCurrentSwipeDirection(undefined);
        setInitialTransform({ x: 0, y: 0, scale: 1 });
        setResolvedDragOffset({ x: 0, y: 0 });
      }

      lastToastId = toastId;
      recalculateHeight();
    },
    () => [toast().id, toast().transitionStatus],
  );

  function setResolvedDragOffset(nextDragOffset: { x: number; y: number }) {
    dragOffsetRef = nextDragOffset;
    setDragOffset(nextDragOffset);
  }

  useIsoLayoutEffect(
    () => {
      return () => {
        dragAbortController?.abort();
      };
    },
    () => [],
  );

  function applyDirectionalDamping(deltaX: number, deltaY: number) {
    const directions = swipeDirections();
    const damp = (delta: number) =>
      delta > 0
        ? delta ** OPPOSITE_DIRECTION_DAMPING_FACTOR
        : -(Math.abs(delta) ** OPPOSITE_DIRECTION_DAMPING_FACTOR);

    const dampX =
      (deltaX > 0 && !directions.includes('right')) || (deltaX < 0 && !directions.includes('left'));
    const dampY =
      (deltaY > 0 && !directions.includes('down')) || (deltaY < 0 && !directions.includes('up'));

    return {
      x: dampX ? damp(deltaX) : deltaX,
      y: dampY ? damp(deltaY) : deltaY,
    };
  }

  const handleSwipeEnd = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId) {
      return;
    }

    activePointerId = null;
    dragAbortController?.abort();
    dragAbortController = null;
    setIsSwiping(false);
    setIsRealSwipe(false);
    setLockedDirection(null);

    const resolvedInitialTransform = initialTransformRef;

    if (event.type === 'pointercancel' || cancelledSwipe) {
      setResolvedDragOffset({ x: resolvedInitialTransform.x, y: resolvedInitialTransform.y });
      setCurrentSwipeDirection(undefined);
      return;
    }

    const resolvedDragOffset = dragOffsetRef;
    const deltaX = resolvedDragOffset.x - resolvedInitialTransform.x;
    const deltaY = resolvedDragOffset.y - resolvedInitialTransform.y;
    let dismissDirection: SwipeDirection | undefined;

    for (const direction of swipeDirections()) {
      if (getDisplacement(direction, deltaX, deltaY) > SWIPE_THRESHOLD) {
        dismissDirection = direction;
        break;
      }
    }

    if (dismissDirection) {
      setCurrentSwipeDirection(dismissDirection);
      store.closeToast(toast().id);
    } else {
      setResolvedDragOffset({ x: resolvedInitialTransform.x, y: resolvedInitialTransform.y });
      setCurrentSwipeDirection(undefined);
    }
  };

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) {
      return;
    }

    if (event.pointerType === 'touch') {
      store.pauseTimers();
    }

    const target = getTarget(event) as HTMLElement | null;

    const isInteractiveElement = closest(
      target,
      `button,a,input,textarea,[role="button"],${TOAST_SWIPE_IGNORE_SELECTOR}`,
    );

    if (isInteractiveElement) {
      return;
    }

    cancelledSwipe = false;
    intendedSwipeDirection = undefined;
    maxSwipeDisplacement = 0;
    activePointerId = event.pointerId;
    dragStartPos = { x: event.clientX, y: event.clientY };
    swipeCancelBaseline = dragStartPos;

    const element = event.currentTarget as HTMLElement;

    const transform = getElementTransform(element);
    initialTransformRef = transform;
    setInitialTransform(transform);
    setResolvedDragOffset({
      x: transform.x,
      y: transform.y,
    });

    store.set('hovering', true);
    setIsSwiping(true);
    setIsRealSwipe(false);
    setLockedDirection(null);
    isFirstPointerMove = true;

    dragAbortController?.abort();
    const controller = new AbortController();
    dragAbortController = controller;

    const doc = ownerDocument(element);
    doc.addEventListener('pointerup', handleSwipeEnd, { signal: controller.signal });
    doc.addEventListener('pointercancel', handleSwipeEnd, { signal: controller.signal });

    element.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.pointerId !== activePointerId) {
      return;
    }

    // Prevent text selection on Safari
    event.preventDefault();

    if (isFirstPointerMove) {
      // Adjust the starting position to the current position on the first move
      // to account for the delay between pointerdown and the first pointermove on iOS.
      dragStartPos = { x: event.clientX, y: event.clientY };
      isFirstPointerMove = false;
    }

    const { clientY, clientX, movementX, movementY } = event;
    const directions = swipeDirections();

    if (
      (movementY < 0 && clientY > swipeCancelBaseline.y) ||
      (movementY > 0 && clientY < swipeCancelBaseline.y)
    ) {
      swipeCancelBaseline = { x: swipeCancelBaseline.x, y: clientY };
    }

    if (
      (movementX < 0 && clientX > swipeCancelBaseline.x) ||
      (movementX > 0 && clientX < swipeCancelBaseline.x)
    ) {
      swipeCancelBaseline = { x: clientX, y: swipeCancelBaseline.y };
    }

    const deltaX = clientX - dragStartPos.x;
    const deltaY = clientY - dragStartPos.y;
    const cancelDeltaY = clientY - swipeCancelBaseline.y;
    const cancelDeltaX = clientX - swipeCancelBaseline.x;

    let resolvedLockedDirection = lockedDirectionRef.current;

    if (!isRealSwipeRef.current) {
      const movementDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (movementDistance >= MIN_DRAG_THRESHOLD) {
        setIsRealSwipe(true);
        // `lockedDirection` is always reset alongside `isRealSwipe`, so it is
        // still `null` here. Locking is only meaningful when both axes are
        // swipeable; otherwise the single axis already constrains the gesture.
        const hasHorizontal = directions.includes('left') || directions.includes('right');
        const hasVertical = directions.includes('up') || directions.includes('down');
        if (hasHorizontal && hasVertical) {
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);
          resolvedLockedDirection = absX > absY ? 'horizontal' : 'vertical';
          setLockedDirection(resolvedLockedDirection);
        }
      }
    }

    let candidate: SwipeDirection | undefined;
    if (!intendedSwipeDirection) {
      if (resolvedLockedDirection === 'vertical') {
        if (deltaY > 0) {
          candidate = 'down';
        } else if (deltaY < 0) {
          candidate = 'up';
        }
      } else if (resolvedLockedDirection === 'horizontal') {
        if (deltaX > 0) {
          candidate = 'right';
        } else if (deltaX < 0) {
          candidate = 'left';
        }
      } else if (Math.abs(deltaX) >= Math.abs(deltaY)) {
        candidate = deltaX > 0 ? 'right' : 'left';
      } else {
        candidate = deltaY > 0 ? 'down' : 'up';
      }

      if (candidate && directions.includes(candidate)) {
        intendedSwipeDirection = candidate;
        maxSwipeDisplacement = getDisplacement(candidate, deltaX, deltaY);
        setCurrentSwipeDirection(candidate);
      }
    } else {
      const direction = intendedSwipeDirection;
      const currentDisplacement = getDisplacement(direction, cancelDeltaX, cancelDeltaY);

      if (currentDisplacement > SWIPE_THRESHOLD) {
        cancelledSwipe = false;
        setCurrentSwipeDirection(direction);
      } else if (
        !(directions.includes('left') && directions.includes('right')) &&
        !(directions.includes('up') && directions.includes('down')) &&
        maxSwipeDisplacement - currentDisplacement >= REVERSE_CANCEL_THRESHOLD
      ) {
        // Mark that a change-of-mind has occurred
        cancelledSwipe = true;
      }
    }

    const dampedDelta = applyDirectionalDamping(deltaX, deltaY);
    let newOffsetX = initialTransformRef.x;
    let newOffsetY = initialTransformRef.y;

    const hasHorizontalDir = directions.includes('left') || directions.includes('right');
    const hasVerticalDir = directions.includes('up') || directions.includes('down');

    if (resolvedLockedDirection !== 'vertical' && hasHorizontalDir) {
      newOffsetX += dampedDelta.x;
    }

    if (resolvedLockedDirection !== 'horizontal' && hasVerticalDir) {
      newOffsetY += dampedDelta.y;
    }

    setResolvedDragOffset({ x: newOffsetX, y: newOffsetY });
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (
        !rootRef.current ||
        !contains(rootRef.current, activeElement(ownerDocument(rootRef.current)))
      ) {
        return;
      }

      store.closeToast(toast().id);
    }
  }

  useEffect(
    ([enabled]) => {
      const element = rootRef.current;
      if (!enabled || !element) {
        return undefined;
      }

      function preventDefaultTouchStart(event: TouchEvent) {
        if (
          activePointerId === null ||
          !contains(element, getTarget(event) as HTMLElement | null)
        ) {
          return;
        }

        // A pointermove preventDefault is not enough on iOS; this
        // non-passive touchmove listener blocks native scrolling while dragging.
        event.preventDefault();
      }

      return addEventListener(element, 'touchmove', preventDefaultTouchStart, { passive: false });
    },
    () => [swipeEnabled()],
  );

  function getDragStyles(): JSX.CSSProperties {
    const currentDragOffset = dragOffset();
    const currentInitialTransform = initialTransform();
    const deltaX = currentDragOffset.x - currentInitialTransform.x;
    const deltaY = currentDragOffset.y - currentInitialTransform.y;

    return {
      transition: isSwiping() ? 'none' : undefined,
      // While swiping, freeze the element at its current visual transform so it doesn't snap to the
      // end position.
      transform: isSwiping()
        ? `translateX(${currentDragOffset.x}px) translateY(${currentDragOffset.y}px) scale(${currentInitialTransform.scale})`
        : undefined,
      [ToastRootCssVars.swipeMovementX]: `${deltaX}px`,
      [ToastRootCssVars.swipeMovementY]: `${deltaY}px`,
    };
  }

  const isHighPriority = () => toast().priority === 'high';

  const defaultProps = (): HTMLProps => {
    const currentToast = toast();
    const enabled = swipeEnabled();
    return {
      role: isHighPriority() ? 'alertdialog' : 'dialog',
      tabindex: 0,
      'aria-modal': false,
      'aria-labelledby': titleId(),
      'aria-describedby': descriptionId(),
      'aria-hidden': isHighPriority() && !focused() ? 'true' : undefined,
      onPointerDown: enabled ? handlePointerDown : undefined,
      onPointerMove: enabled ? handlePointerMove : undefined,
      onPointerUp: enabled ? handleSwipeEnd : undefined,
      onPointerCancel: enabled ? handleSwipeEnd : undefined,
      onKeyDown: handleKeyDown,
      inert: inertValue(currentToast.limited),
      style: {
        ...getDragStyles(),
        [ToastRootCssVars.index as string]:
          currentToast.transitionStatus === 'ending' ? domIndex() : visibleIndex(),
        [ToastRootCssVars.offsetY as string]: `${offsetY()}px`,
        [ToastRootCssVars.height as string]: currentToast.height
          ? `${currentToast.height}px`
          : undefined,
      },
    };
  };

  const toastRoot: ToastRootContext = {
    toast,
    setTitleId,
    setDescriptionId,
    recalculateHeight,
    visibleIndex,
    expanded,
  };

  const state = createMemo<ToastRootState>(() => ({
    transitionStatus: toast().transitionStatus,
    expanded: expanded(),
    limited: toast().limited || false,
    type: toast().type,
    swiping: isSwiping(),
    swipeDirection: currentSwipeDirection(),
  }));

  return (
    <ToastRootContext value={toastRoot}>
      {useRenderElement('div', componentProps, {
        ref: (element: HTMLDivElement | null) => {
          rootRef.current = element;
        },
        state,
        stateAttributesMapping: toastRootStateAttributesMapping,
        props: () => [defaultProps(), elementProps],
      })}
    </ToastRootContext>
  );
}

export type ToastRootToastObject<Data extends object = any> = ToastObjectType<Data>;

export interface ToastRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * Whether the toasts in the viewport are expanded.
   */
  expanded: boolean;
  /**
   * Whether the toast was limited because the toast limit was exceeded.
   */
  limited: boolean;
  /**
   * The type of the toast.
   */
  type: string | undefined;
  /**
   * Whether the toast is being swiped.
   */
  swiping: boolean;
  /**
   * The direction the toast is being swiped.
   */
  swipeDirection: 'up' | 'down' | 'left' | 'right' | undefined;
}

export interface ToastRootProps extends BaseUIComponentProps<'div', ToastRootState> {
  /**
   * The toast to render.
   */
  toast: ToastRootToastObject<any>;
  /**
   * Direction(s) in which the toast can be swiped to dismiss.
   * @default ['down', 'right']
   */
  swipeDirection?:
    'up' | 'down' | 'left' | 'right' | ('up' | 'down' | 'left' | 'right')[] | undefined;
}

export namespace ToastRoot {
  export type ToastObject<Data extends object = any> = ToastRootToastObject<Data>;
  export type State = ToastRootState;
  export type Props = ToastRootProps;
}
