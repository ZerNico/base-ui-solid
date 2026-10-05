import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { clamp } from '@base-ui-solid/utils/clamp';
import { ownerDocument, ownerWindow } from '@base-ui-solid/utils/owner';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useAnimationFrame } from '@base-ui-solid/utils/useAnimationFrame';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { isElement } from '@floating-ui/utils/dom';
import { createMemo, createSignal, flush, omit, untrack } from 'solid-js';
import { useDialogRootContext } from '../../dialog/root/DialogRootContext';
import { DialogViewport } from '../../dialog/viewport/DialogViewport';
import * as DialogViewportDataAttributes from '../../dialog/viewport/DialogViewportDataAttributes';
import { activeElement, closest, contains, getTarget } from '../../floating-ui-solid/utils';
import {
  BASE_UI_SWIPE_IGNORE_ATTRIBUTE,
  BASE_UI_SWIPE_IGNORE_SELECTOR,
} from '../../internals/constants';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { TransitionStatusDataAttributes } from '../../internals/stateAttributesMapping';
import type { BaseUIComponentProps } from '../../internals/types';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { mergePropsSnapshot } from '../../merge-props/mergeProps';
import { getElementAtPoint } from '../../utils/getElementAtPoint';
import type { ScrollAxis } from '../../utils/scrollable';
import { findScrollableTouchTarget } from '../../utils/scrollable';
import type { SwipeDirection, UseSwipeDismissProgressDetails } from '../../utils/useSwipeDismiss';
import { getDisplacement, useSwipeDismiss } from '../../utils/useSwipeDismiss';
import * as DrawerBackdropCssVars from '../backdrop/DrawerBackdropCssVars';
import { DRAWER_CONTENT_ATTRIBUTE } from '../content/drawerContentAttribute';
import * as DrawerPopupCssVars from '../popup/DrawerPopupCssVars';
import * as DrawerPopupDataAttributes from '../popup/DrawerPopupDataAttributes';
import { useDrawerProviderContext } from '../provider/DrawerProviderContext';
import { useDrawerRootContext } from '../root/DrawerRootContext';
import type { ResolvedDrawerSnapPoint } from '../root/useDrawerSnapPoints';
import {
  closestSnapPointIndex,
  getSnapPointSwipeMovement,
  useDrawerSnapPoints,
} from '../root/useDrawerSnapPoints';
import { useDrawerVirtualKeyboardContext } from '../virtual-keyboard-provider/DrawerVirtualKeyboardContext';
import { DrawerViewportContext } from './DrawerViewportContext';

const MIN_SWIPE_THRESHOLD = 10;
const FAST_SWIPE_VELOCITY = 0.5;
const SNAP_VELOCITY_THRESHOLD = 0.5;
const SNAP_VELOCITY_MULTIPLIER = 300;
const MAX_SNAP_VELOCITY = 4;
const MIN_SWIPE_RELEASE_VELOCITY = 0.2;
const MAX_SWIPE_RELEASE_VELOCITY = 4;
const MIN_SWIPE_RELEASE_DURATION_MS = 80;
const MAX_SWIPE_RELEASE_DURATION_MS = 360;
const MIN_SWIPE_RELEASE_SCALAR = 0.1;
const MAX_SWIPE_RELEASE_SCALAR = 1;
const AXIS_LOCK_SLOP = 6;
const AXIS_LOCK_BIAS = 2;
const DRAWER_CONTENT_SELECTOR = `[${DRAWER_CONTENT_ATTRIBUTE}]`;
const AXIS_SWIPE_IGNORE_SELECTORS: Record<ScrollAxis, string> = {
  horizontal: `[${BASE_UI_SWIPE_IGNORE_ATTRIBUTE}="x"]`,
  vertical: `[${BASE_UI_SWIPE_IGNORE_ATTRIBUTE}="y"]`,
};
interface TouchScrollState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  scrollTarget: HTMLElement | null;
  hasCrossAxisGestureTarget: boolean;
  allowSwipe: boolean | null;
  preserveNativeCrossAxisScroll: boolean;
  drawerAxisAttributed: boolean;
}
/**
 * A positioning container for the drawer popup that can be made scrollable.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui-solid.pages.dev/solid/components/drawer)
 */
export const DrawerViewport = function DrawerViewport(props: DrawerViewport.Props) {
  const elementProps = omit(props, 'render', 'class', 'style', 'children');
  const store = useDialogRootContext();
  const popupRef = store.context.popupRef;
  const backdropRef = store.context.backdropRef;
  const drawerContext = useDrawerRootContext();
  const providerContext = useDrawerProviderContext();
  const snapPointData = useDrawerSnapPoints();
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const nested = store.useState('nested');
  const nestedOpenDrawerCount = store.useState('nestedOpenDrawerCount');
  const viewportElement = store.useState('viewportElement');
  const popupElementState = store.useState('popupElement');
  const visualStateStore = providerContext?.visualStateStore;
  const nestedDrawerOpen = createMemo(() => nestedOpenDrawerCount() > 0);
  const scrollAxis = createMemo(() =>
    drawerContext.swipeDirection() === 'left' || drawerContext.swipeDirection() === 'right'
      ? 'horizontal'
      : 'vertical',
  );
  const isVerticalScrollAxis = createMemo(() => scrollAxis() === 'vertical');
  const crossScrollAxis = createMemo<ScrollAxis>(() =>
    isVerticalScrollAxis() ? 'horizontal' : 'vertical',
  );
  const [swipeRelease, setSwipeRelease] = createSignal<number | null>(null, { ownedWrite: true });
  const pendingSwipeCloseSnapPointRef: RefObject<
    ReturnType<typeof snapPointData.activeSnapPoint> | undefined
  > = { current: undefined };
  const resetSwipeRef: RefObject<(() => void) | null | null> = { current: null };
  const controlledDismissFrame = useAnimationFrame();
  const swipingRef = { current: false };
  const nestedSwipeActiveRef = { current: false };
  const lastPointerTypeRef: RefObject<PointerEvent['pointerType'] | ''> = { current: '' };
  const ignoreNextTouchStartFromPenRef = { current: false };
  const ignoreTouchSwipeRef = { current: false };
  const touchScrollStateRef: RefObject<TouchScrollState | null | null> = { current: null };
  const virtualKeyboard = useDrawerVirtualKeyboardContext();
  const snapPointRange = createMemo(() => {
    if (
      !snapPointData.snapPoints() ||
      snapPointData.snapPoints()!.length < 2 ||
      snapPointData.resolvedSnapPoints().length < 2 ||
      (drawerContext.swipeDirection() !== 'down' && drawerContext.swipeDirection() !== 'up')
    ) {
      return null;
    }
    const offsets = snapPointData
      .resolvedSnapPoints()
      .map((point) => point.offset)
      .sort((a, b) => a - b);
    const minOffset = offsets[0];
    const nextOffset = offsets[1];
    const range = nextOffset - minOffset;
    return { minOffset, range };
  });
  const snapPointProgress = createMemo(() => {
    if (!snapPointRange() || snapPointData.activeSnapPointOffset() === null) {
      return null;
    }
    return clamp(
      (snapPointData.activeSnapPointOffset()! - snapPointRange()!.minOffset) /
        snapPointRange()!.range,
      0,
      1,
    );
  });
  const swipeDirections = createMemo<SwipeDirection[]>(() => {
    if (
      snapPointData.snapPoints() &&
      snapPointData.snapPoints()!.length > 0 &&
      (drawerContext.swipeDirection() === 'down' || drawerContext.swipeDirection() === 'up')
    ) {
      return drawerContext.swipeDirection() === 'down' ? ['down', 'up'] : ['up', 'down'];
    }
    return [drawerContext.swipeDirection()];
  });
  const setSwipeDismissed = (dismissed: boolean) => {
    popupRef.current?.toggleAttribute(DrawerPopupDataAttributes.swipeDismiss, dismissed);
    backdropRef.current?.toggleAttribute(DrawerPopupDataAttributes.swipeDismiss, dismissed);
  };
  const clearSwipeRelease = () => {
    setSwipeDismissed(false);
    popupRef.current?.removeAttribute(TransitionStatusDataAttributes.endingStyle);
    setSwipeRelease(null);
  };
  const finishNestedSwipe = () => {
    if (!nestedSwipeActiveRef.current) {
      return;
    }
    nestedSwipeActiveRef.current = false;
    drawerContext.notifyParentSwipingChange?.(false);
  };
  const applySwipeProgress = (
    resolvedProgress: number,
    shouldTrackProgress: boolean,
    notifyParent: boolean,
  ) => {
    const isActive = open() && !nested() && shouldTrackProgress;
    const swipeProgress = isActive ? resolvedProgress : 0;
    const nestedSwipeProgress = open() && shouldTrackProgress ? resolvedProgress : 0;
    if (notifyParent && drawerContext.notifyParentSwipeProgressChange) {
      drawerContext.notifyParentSwipeProgressChange(nestedSwipeProgress);
      if (nestedSwipeProgress <= 0) {
        finishNestedSwipe();
      }
    }
    visualStateStore?.set({
      swipeProgress,
      frontmostHeight: swipeProgress > 0 ? drawerContext.frontmostHeight() : 0,
    });
    const backdropElement = backdropRef.current;
    if (!backdropElement) {
      return;
    }
    const showProgress = isActive && swipeProgress > 0;
    backdropElement.style.setProperty(
      DrawerBackdropCssVars.swipeProgress,
      showProgress ? `${swipeProgress}` : '0',
    );
    if (showProgress && drawerContext.frontmostHeight() > 0) {
      backdropElement.style.setProperty(
        DrawerPopupCssVars.height,
        `${drawerContext.frontmostHeight()}px`,
      );
    } else {
      backdropElement.style.removeProperty(DrawerPopupCssVars.height);
    }
  };
  function resolveSwipeRelease(
    popupElement: HTMLElement,
    direction: SwipeDirection,
    deltaX: number,
    deltaY: number,
    velocityX: number,
    velocityY: number,
    releaseVelocityX: number,
    releaseVelocityY: number,
  ): number | null {
    const size = getBaseSwipeSize(popupElement, direction);
    if (size <= 0) {
      return null;
    }
    // The snap point base offset shifts the popup along the dismiss direction for both
    // `down` (+offset) and `up` (-offset), so it always adds to the directional translation.
    const snapPointBaseOffset =
      (direction === 'down' || direction === 'up') &&
      snapPointData.snapPoints() &&
      snapPointData.snapPoints()!.length > 0
        ? (snapPointData.activeSnapPointOffset() ?? 0)
        : 0;
    const translationAlongDirection =
      snapPointBaseOffset + getDisplacement(direction, deltaX, deltaY);
    const remainingDistance = Math.max(0, size - translationAlongDirection);
    if (remainingDistance <= 0) {
      return null;
    }
    const releaseVelocity = getDisplacement(direction, releaseVelocityX, releaseVelocityY);
    const directionalVelocity =
      Math.abs(releaseVelocity) > 0
        ? releaseVelocity
        : getDisplacement(direction, velocityX, velocityY);
    if (directionalVelocity <= MIN_SWIPE_RELEASE_VELOCITY) {
      return null;
    }
    const clampedVelocity = clamp(
      directionalVelocity,
      MIN_SWIPE_RELEASE_VELOCITY,
      MAX_SWIPE_RELEASE_VELOCITY,
    );
    // The gesture hook supplies finite deltas and velocities. The guards above keep the remaining
    // distance and divisor positive, so the duration stays within [MIN, MAX] and the resulting
    // scalar within (0, 1].
    const durationMs = clamp(
      remainingDistance / clampedVelocity,
      MIN_SWIPE_RELEASE_DURATION_MS,
      MAX_SWIPE_RELEASE_DURATION_MS,
    );
    const normalizedDuration =
      (durationMs - MIN_SWIPE_RELEASE_DURATION_MS) /
      (MAX_SWIPE_RELEASE_DURATION_MS - MIN_SWIPE_RELEASE_DURATION_MS);
    return (
      MIN_SWIPE_RELEASE_SCALAR +
      normalizedDuration * (MAX_SWIPE_RELEASE_SCALAR - MIN_SWIPE_RELEASE_SCALAR)
    );
  }
  function updateNestedSwipeActive(details?: UseSwipeDismissProgressDetails) {
    if (nestedSwipeActiveRef.current || !details) {
      return;
    }
    const direction = details.direction ?? drawerContext.swipeDirection();
    const delta = getDisplacement(direction, details.deltaX, details.deltaY);
    if (Math.abs(delta) < MIN_SWIPE_THRESHOLD) {
      return;
    }
    nestedSwipeActiveRef.current = true;
    drawerContext.notifyParentSwipingChange?.(true);
  }
  const swipe = useSwipeDismiss({
    get enabled() {
      return mounted() && !nestedDrawerOpen();
    },
    get directions() {
      return swipeDirections();
    },
    elementRef: store.context.popupRef,
    ignoreSelectorWhenTouch: false,
    ignoreScrollableAncestors: true,
    movementCssVars: {
      x: DrawerPopupCssVars.swipeMovementX,
      y: DrawerPopupCssVars.swipeMovementY,
    },
    onSwipeStart(event) {
      if ('touches' in event || event.pointerType === 'touch') {
        return;
      }
      const popupElement = popupRef.current;
      const doc = ownerDocument(popupElement);
      const selection = doc.getSelection?.();
      if (!selection || selection.isCollapsed) {
        return;
      }
      const anchorElement = isElement(selection.anchorNode)
        ? selection.anchorNode
        : selection.anchorNode?.parentElement;
      const focusElement = isElement(selection.focusNode)
        ? selection.focusNode
        : selection.focusNode?.parentElement;
      if (!contains(popupElement, anchorElement) && !contains(popupElement, focusElement)) {
        return;
      }
      selection.removeAllRanges();
    },
    onSwipingChange(swiping) {
      swipingRef.current = swiping;
      setBackdropSwipingAttribute(store.context.backdropRef.current, swiping);
      if (!swiping && !drawerContext.notifyParentSwipeProgressChange) {
        finishNestedSwipe();
      }
    },
    swipeThreshold({ element, direction }) {
      return getBaseSwipeThreshold(element, direction);
    },
    canStart(position, details) {
      const popupElement = store.context.popupRef.current;
      if (!popupElement) {
        return false;
      }
      const doc = popupElement.ownerDocument;
      const elementAtPoint = getElementAtPoint(popupElement.getRootNode(), position.x, position.y);
      if (!elementAtPoint || !contains(popupElement, elementAtPoint)) {
        return false;
      }
      const nativeEvent = details.nativeEvent;
      const touchLike = 'touches' in nativeEvent || nativeEvent.pointerType === 'touch';
      if (touchLike && shouldIgnoreSwipeForTextSelection(doc, popupElement)) {
        return false;
      }
      // Over a cross-axis gesture target, stay pending until the drawer axis wins the gesture.
      // Starting on touchstart would leave the drawer swiping (and settling on release) while the
      // cross-axis target handles the drag.
      const touchState = touchScrollStateRef.current;
      if (
        touchLike &&
        touchState?.hasCrossAxisGestureTarget &&
        !touchState.drawerAxisAttributed &&
        touchState.allowSwipe !== true
      ) {
        return false;
      }
      return true;
    },
    onProgress(progress, details) {
      const swiping = swipingRef.current;
      if (swiping) {
        updateNestedSwipeActive(details);
      }
      const hasSnapPoints = Boolean(
        snapPointData.snapPoints() && snapPointData.snapPoints()!.length > 0,
      );
      if (swiping && drawerContext.swipeDirection() === 'down' && hasSnapPoints && details) {
        const popupElement = store.context.popupRef.current;
        if (popupElement) {
          popupElement.style.removeProperty('transform');
          popupElement.style.setProperty(
            DrawerPopupCssVars.swipeMovementY,
            `${getSnapPointSwipeMovement(snapPointData.activeSnapPointOffset() ?? 0, details.deltaY)}px`,
          );
        }
      }
      let resolvedProgress = progress;
      if (snapPointRange() && snapPointData.popupHeight() > 0) {
        const baseOffset = snapPointData.activeSnapPointOffset() ?? snapPointRange()!.minOffset;
        const offsetToProgress = (nextOffset: number) =>
          clamp((nextOffset - snapPointRange()!.minOffset) / snapPointRange()!.range, 0, 1);
        // Outside a drag the hook still reports the last drag deltas, both after a release and
        // on a gesture that never started (e.g. a press inside `Drawer.Content`). Recomputing
        // from them would re-apply drag progress to a drawer that rests on its snap point.
        if (swiping && details && Number.isFinite(details.deltaY)) {
          resolvedProgress = offsetToProgress(
            clamp(baseOffset + details.deltaY, 0, snapPointData.popupHeight()),
          );
        } else if (snapPointProgress() !== null) {
          resolvedProgress = snapPointProgress()!;
        }
      }
      // A parent drawer follows an active drag only, so drop it back to zero once the drag ends.
      if (!swiping) {
        drawerContext.notifyParentSwipeProgressChange?.(0);
        finishNestedSwipe();
      }
      applySwipeProgress(resolvedProgress, true, swiping);
    },
    onRelease({
      event,
      deltaX,
      deltaY,
      direction,
      velocityX,
      velocityY,
      releaseVelocityX,
      releaseVelocityY,
    }) {
      const popupElement = store.context.popupRef.current;
      if (!popupElement) {
        clearSwipeRelease();
        return undefined;
      }
      const releasePopupElement = popupElement;
      function startSwipeRelease(resolvedDirection: SwipeDirection) {
        // Start ending transition styles earlier and synchronously to prevent a period where
        // the popup appears stuck on release before the actual closing animation starts.
        finishNestedSwipe();
        setSwipeDismissed(true);
        releasePopupElement.style.removeProperty('transition');
        releasePopupElement.setAttribute(TransitionStatusDataAttributes.endingStyle, '');
        flushSync(() => {
          setSwipeRelease(
            resolveSwipeRelease(
              releasePopupElement,
              resolvedDirection,
              deltaX,
              deltaY,
              velocityX,
              velocityY,
              releaseVelocityX,
              releaseVelocityY,
            ),
          );
        });
      }
      if (!snapPointData.snapPoints() || snapPointData.snapPoints()!.length === 0) {
        if (!direction) {
          clearSwipeRelease();
          return undefined;
        }
        const directionalDelta = getDisplacement(direction, deltaX, deltaY);
        if (directionalDelta <= 0) {
          clearSwipeRelease();
          return false;
        }
        if (getDisplacement(direction, velocityX, velocityY) >= FAST_SWIPE_VELOCITY) {
          startSwipeRelease(direction);
          return true;
        }
        const shouldClose =
          directionalDelta > getBaseSwipeThreshold(releasePopupElement, direction);
        if (shouldClose) {
          startSwipeRelease(direction);
        } else {
          clearSwipeRelease();
        }
        return shouldClose;
      }
      if (drawerContext.swipeDirection() !== 'down' && drawerContext.swipeDirection() !== 'up') {
        clearSwipeRelease();
        return undefined;
      }
      if (!snapPointData.popupHeight()) {
        clearSwipeRelease();
        return false;
      }
      if (snapPointData.resolvedSnapPoints().length === 0) {
        clearSwipeRelease();
        return undefined;
      }
      const dragDelta = drawerContext.swipeDirection() === 'down' ? deltaY : -deltaY;
      const dragDirection = Math.sign(dragDelta);
      const releaseDirectionalVelocity =
        drawerContext.swipeDirection() === 'down' ? releaseVelocityY : -releaseVelocityY;
      const fallbackDirectionalVelocity =
        drawerContext.swipeDirection() === 'down' ? velocityY : -velocityY;
      let resolvedDirectionalVelocity = releaseDirectionalVelocity;
      if (dragDirection !== 0 && Math.abs(dragDelta) >= MIN_SWIPE_THRESHOLD) {
        const velocityDirection = Math.sign(resolvedDirectionalVelocity);
        if (velocityDirection !== 0 && velocityDirection !== dragDirection) {
          // Ignore touch reversals that would otherwise flip the snap decision.
          resolvedDirectionalVelocity = fallbackDirectionalVelocity;
        }
      }
      const currentOffset = snapPointData.activeSnapPointOffset() ?? 0;
      const dragTargetOffset = clamp(currentOffset + dragDelta, 0, snapPointData.popupHeight());
      const velocityOffset =
        Math.abs(resolvedDirectionalVelocity) >= SNAP_VELOCITY_THRESHOLD
          ? clamp(resolvedDirectionalVelocity, -MAX_SNAP_VELOCITY, MAX_SNAP_VELOCITY) *
            SNAP_VELOCITY_MULTIPLIER
          : 0;
      const targetOffset = drawerContext.snapToSequentialPoints()
        ? dragTargetOffset
        : clamp(dragTargetOffset + velocityOffset, 0, snapPointData.popupHeight());
      const snapPointEventDetails = createChangeEventDetails(REASONS.swipe, event);
      const settleInPlace = () => {
        // Reset nested swipe state now: the hook's trailing progress update is deduped
        // when the drag never produced dismissal progress, so it may not fire.
        applySwipeProgress(0, true, true);
        clearSwipeRelease();
        return false;
      };
      const settleOnSnapPoint = (snapPoint: ResolvedDrawerSnapPoint) => {
        snapPointData.setActiveSnapPoint(snapPoint.value, snapPointEventDetails);
        return settleInPlace();
      };
      const closeFromSnapPoints = (fallbackSnapPoint: ResolvedDrawerSnapPoint) => {
        // An unattributed gesture (e.g. a mostly horizontal flick) may settle on a snap
        // point but must not dismiss: `useSwipeDismiss` drops a directionless dismissal,
        // stranding the popup visually closed while `open` stays `true`.
        if (!direction) {
          return settleOnSnapPoint(fallbackSnapPoint);
        }
        snapPointData.setActiveSnapPoint(null, snapPointEventDetails);
        if (snapPointEventDetails.isCanceled) {
          // A canceled null snap point rejects dismissal before exit styles start.
          return settleInPlace();
        }
        pendingSwipeCloseSnapPointRef.current = snapPointData.activeSnapPoint();
        startSwipeRelease(drawerContext.swipeDirection());
        return true;
      };
      if (drawerContext.snapToSequentialPoints()) {
        const orderedSnapPoints = [...snapPointData.resolvedSnapPoints()].sort(
          (first, second) => first.offset - second.offset,
        );
        const orderedOffsets = orderedSnapPoints.map((point) => point.offset);
        const currentIndex = closestSnapPointIndex(orderedOffsets, currentOffset);
        let targetSnapPoint =
          orderedSnapPoints[closestSnapPointIndex(orderedOffsets, targetOffset)];
        const velocityDirection = Math.sign(resolvedDirectionalVelocity);
        const shouldAdvance =
          dragDirection !== 0 &&
          velocityDirection !== 0 &&
          velocityDirection === dragDirection &&
          Math.abs(resolvedDirectionalVelocity) >= SNAP_VELOCITY_THRESHOLD;
        let effectiveTargetOffset = targetOffset;
        if (shouldAdvance) {
          const adjacentIndex = clamp(
            currentIndex + dragDirection,
            0,
            orderedSnapPoints.length - 1,
          );
          if (adjacentIndex !== currentIndex) {
            const adjacentPoint = orderedSnapPoints[adjacentIndex];
            const shouldForceAdjacent =
              dragDirection > 0
                ? targetOffset < adjacentPoint.offset
                : targetOffset > adjacentPoint.offset;
            if (shouldForceAdjacent) {
              targetSnapPoint = adjacentPoint;
              effectiveTargetOffset = adjacentPoint.offset;
            }
          } else if (dragDirection > 0) {
            return closeFromSnapPoints(targetSnapPoint);
          }
        }
        const closeDistance = Math.abs(effectiveTargetOffset - snapPointData.popupHeight());
        const snapDistance = Math.abs(effectiveTargetOffset - targetSnapPoint.offset);
        if (closeDistance < snapDistance) {
          return closeFromSnapPoints(targetSnapPoint);
        }
        return settleOnSnapPoint(targetSnapPoint);
      }
      const closestSnapPoint =
        snapPointData.resolvedSnapPoints()[
          closestSnapPointIndex(
            snapPointData.resolvedSnapPoints().map((point) => point.offset),
            targetOffset,
          )
        ];
      if (resolvedDirectionalVelocity >= FAST_SWIPE_VELOCITY && dragDelta > 0) {
        return closeFromSnapPoints(closestSnapPoint);
      }
      const closeDistance = Math.abs(targetOffset - snapPointData.popupHeight());
      if (closeDistance < Math.abs(targetOffset - closestSnapPoint.offset)) {
        return closeFromSnapPoints(closestSnapPoint);
      }
      return settleOnSnapPoint(closestSnapPoint);
    },
    onDismiss(event) {
      visualStateStore?.set({ swipeProgress: 0, frontmostHeight: 0 });
      const backdropElement = store.context.backdropRef.current;
      if (backdropElement) {
        backdropElement.style.setProperty(DrawerBackdropCssVars.swipeProgress, '0');
        backdropElement.style.removeProperty(DrawerPopupCssVars.height);
      }
      const dismissEventDetails: Parameters<typeof store.setOpen>[1] = createChangeEventDetails(
        REASONS.swipe,
        event,
      );
      store.setOpen(false, dismissEventDetails);
      if (dismissEventDetails.isCanceled) {
        const pendingSnapPoint = pendingSwipeCloseSnapPointRef.current;
        if (pendingSnapPoint !== undefined) {
          snapPointData.setActiveSnapPoint(
            pendingSnapPoint,
            createChangeEventDetails(REASONS.swipe, event),
          );
        }
        pendingSwipeCloseSnapPointRef.current = undefined;
        resetSwipeRef.current?.();
        clearSwipeRelease();
        return;
      }
      // In controlled mode, the effective open state may not have changed yet
      // (openProp takes precedence over state.open). Proceed optimistically with the
      // dismiss animation — React's Scheduler flushes before the next rAF, so we can
      // reliably check whether the parent accepted or rejected the close.
      // Note: if onOpenChange is asynchronous (e.g., closes the drawer after a network
      // call), the rAF check will see open === true, revert the animation, and the
      // drawer will close without animation when the parent eventually sets open={false}.
      if (store.select('open')) {
        const savedEvent = event;
        controlledDismissFrame.request(() => {
          if (store.select('open')) {
            // Parent rejected: revert animation and restore snap point.
            const pendingSnapPoint = pendingSwipeCloseSnapPointRef.current;
            if (pendingSnapPoint !== undefined) {
              snapPointData.setActiveSnapPoint(
                pendingSnapPoint,
                createChangeEventDetails(REASONS.swipe, savedEvent),
              );
            }
            pendingSwipeCloseSnapPointRef.current = undefined;
            clearSwipeRelease();
            resetSwipeRef.current?.();
          } else {
            // Parent accepted: clean up the ref.
            pendingSwipeCloseSnapPointRef.current = undefined;
          }
        });
        return;
      }
      pendingSwipeCloseSnapPointRef.current = undefined;
      setSwipeDismissed(true);
    },
  });
  const swipePointerProps = () => swipe.getPointerProps();
  const swipeTouchProps = () => swipe.getTouchProps();
  const { moveNative: moveSwipeNative, reset: resetSwipe } = swipe;
  resetSwipeRef.current = resetSwipe;
  useEffect(
    () => {
      const rootElement = viewportElement() ?? popupElementState();
      // A non-passive document listener makes all touch scrolling wait on the main thread.
      if (!rootElement || !open() || !mounted()) {
        return undefined;
      }
      const resolvedRootElement: HTMLElement = rootElement;
      const doc = ownerDocument(resolvedRootElement);
      function processTouchMove(event: TouchEvent, touchState: TouchScrollState, touch: Touch) {
        const drawerAxisDelta = isVerticalScrollAxis()
          ? touch.clientY - touchState.lastY
          : touch.clientX - touchState.lastX;
        // Avoid blocking pinch zoom or text selection adjustments on iOS Safari.
        if (event.touches.length === 2) {
          return;
        }
        const allowTouchMove = shouldIgnoreSwipeForTextSelection(doc, resolvedRootElement);
        if (allowTouchMove || nestedDrawerOpen()) {
          return;
        }
        if (shouldYieldTouchMove(touchState, event, touch, isVerticalScrollAxis())) {
          return;
        }
        const scrollTarget = touchState.scrollTarget;
        if (!scrollTarget || scrollTarget === doc.documentElement || scrollTarget === doc.body) {
          if (event.cancelable) {
            event.preventDefault();
          }
          // Claim the gesture before React's delegated touch handlers see it; dispatching the
          // move through React re-rasterizes the popup content on every frame.
          event.stopPropagation();
          moveSwipeNative(event, resolvedRootElement);
          return;
        }
        if (!hasScrollableContentOnAxis(scrollTarget, scrollAxis())) {
          // If the scroll container doesn't overflow on the drawer axis, prevent the window from
          // scrolling instead.
          if (event.cancelable) {
            event.preventDefault();
          }
          event.stopPropagation();
          return;
        }
        if (drawerAxisDelta !== 0) {
          const canSwipeFromScrollEdge = canSwipeFromScrollEdgeOnMove(
            scrollTarget,
            scrollAxis(),
            drawerContext.swipeDirection(),
            drawerAxisDelta,
          );
          if (!touchState.allowSwipe) {
            if (event.cancelable && canSwipeFromScrollEdge) {
              touchState.allowSwipe = true;
              event.preventDefault();
            } else {
              touchState.allowSwipe = false;
            }
          } else if (event.cancelable) {
            event.preventDefault();
          }
        }
        if (touchState.allowSwipe === true) {
          event.stopPropagation();
          moveSwipeNative(event, resolvedRootElement);
        }
      }
      function handleNativeTouchMove(event: TouchEvent) {
        // The virtual keyboard provider observes the move to tell a tap apart from a drag.
        // It must run even when the swipe gesture below claims the event with
        // `stopPropagation()`, which would otherwise prevent React's delegated handlers
        // (and the provider) from ever seeing the move.
        virtualKeyboard?.onTouchMove(event);
        if (ignoreTouchSwipeRef.current) {
          return;
        }
        const touchState = touchScrollStateRef.current;
        const touch = event.touches[0];
        if (!touch || !touchState) {
          return;
        }
        processTouchMove(event, touchState, touch);
        updateTouchScrollPosition(touchState, touch);
      }
      return addEventListener(doc, 'touchmove', handleNativeTouchMove, {
        passive: false,
        capture: true,
      });
    },
    () => [
      mounted(),
      nestedDrawerOpen(),
      open(),
      popupElementState(),
      isVerticalScrollAxis(),
      scrollAxis(),
      drawerContext.swipeDirection(),
      moveSwipeNative,
      viewportElement(),
      virtualKeyboard,
    ],
  );
  useIsoLayoutEffect(
    () => {
      if (!snapPointRange() || swipe.swiping) {
        return;
      }
      applySwipeProgress(!open() || nested() ? 0 : (snapPointProgress() ?? 0), true, false);
    },
    () => [
      applySwipeProgress,
      drawerContext.frontmostHeight(),
      nested(),
      drawerContext.notifyParentSwipeProgressChange,
      open(),
      snapPointProgress(),
      snapPointRange(),
      swipe.swiping,
      store,
      visualStateStore,
    ],
  );
  useIsoLayoutEffect(
    () => {
      if (!drawerContext.notifyParentSwipeProgressChange) {
        return undefined;
      }
      if (!open()) {
        drawerContext.notifyParentSwipeProgressChange?.(0);
      }
      return () =>
        untrack(() => {
          drawerContext.notifyParentSwipeProgressChange?.(0);
        });
    },
    () => [drawerContext.notifyParentSwipeProgressChange, open()],
  );
  useIsoLayoutEffect(
    () => {
      if (open()) {
        // Skip `resetSwipe` while `Drawer.SwipeArea` is driving the open: it zeroes the popup's
        // `--swipe-movement-*` (via `syncDragStyles(false)`), flashing it fully open for a frame.
        // `clearSwipeRelease` doesn't touch those vars, so always run it to clear any leftover
        // release state from a prior dismiss (e.g. when the popup is kept mounted).
        if (!drawerContext.swipeAreaActiveRef.current) {
          resetSwipe();
        }
        clearSwipeRelease();
      }
    },
    () => [clearSwipeRelease, open(), resetSwipe, drawerContext.swipeAreaActiveRef],
  );
  useIsoLayoutEffect(
    () => {
      const backdropElement = backdropRef.current;
      return () =>
        untrack(() => {
          visualStateStore?.set({ swipeProgress: 0, frontmostHeight: 0 });
          setBackdropSwipingAttribute(backdropElement, false);
          // `data-swiping` is set on whichever backdrop is current when a swipe starts, which can
          // differ from the captured element if the backdrop mounted late or changed identity.
          // Reading the live ref here is intentional so the current backdrop is cleared too.
          const currentBackdrop = backdropRef.current;
          if (currentBackdrop !== backdropElement) {
            setBackdropSwipingAttribute(currentBackdrop, false);
          }
          finishNestedSwipe();
        });
    },
    () => [backdropRef, finishNestedSwipe, visualStateStore],
  );
  const swipeProviderValue = {
    swiping: () => swipe.swiping,
    getDragStyles: swipe.getDragStyles,
    swipeStrength: () => swipeRelease() ?? null,
    setSwipeDismissed,
  };
  function resetTouchSwipeState(ignoreSwipe: boolean) {
    ignoreTouchSwipeRef.current = ignoreSwipe;
    touchScrollStateRef.current = null;
  }
  function resetTouchTrackingState() {
    resetTouchSwipeState(false);
    lastPointerTypeRef.current = '';
    ignoreNextTouchStartFromPenRef.current = false;
  }
  function handlePointerEnd(event: PointerEvent): boolean {
    lastPointerTypeRef.current = '';
    return event.pointerType !== 'touch';
  }
  return (
    <DialogViewport
      ref={props.ref}
      class={props.class}
      style={props.style}
      render={props.render}
      {...mergePropsSnapshot(elementProps, {
        onPointerDown(event) {
          lastPointerTypeRef.current = event.pointerType;
          ignoreNextTouchStartFromPenRef.current = event.pointerType === 'pen';
          if (!open() || !mounted() || nestedDrawerOpen()) {
            return;
          }
          const elementAtPoint = getElementAtPoint(
            event.currentTarget.getRootNode(),
            event.clientX,
            event.clientY,
          );
          // Pointer drags capture the pointer on press, so they can't wait to see which axis the
          // gesture takes; any `data-base-ui-swipe-ignore` value ignores them.
          if (isSwipeIgnoredTarget(elementAtPoint) || isDrawerContentTarget(elementAtPoint)) {
            return;
          }
          if (event.pointerType === 'touch') {
            return;
          }
          swipePointerProps().onPointerDown?.(event);
        },
        onPointerMove(event) {
          if (event.pointerType === 'touch') {
            return;
          }
          swipePointerProps().onPointerMove?.(event);
        },
        onPointerUp(event) {
          if (handlePointerEnd(event)) {
            swipePointerProps().onPointerUp?.(event);
          }
        },
        onPointerCancel(event) {
          if (handlePointerEnd(event)) {
            swipePointerProps().onPointerCancel?.(event);
          }
        },
        onTouchStart(event) {
          const startedFromPenPointerDown =
            lastPointerTypeRef.current === 'pen' && ignoreNextTouchStartFromPenRef.current;
          if (startedFromPenPointerDown) {
            ignoreNextTouchStartFromPenRef.current = false;
            resetTouchSwipeState(false);
            return;
          }
          if (!open() || !mounted() || nestedDrawerOpen()) {
            resetTouchSwipeState(false);
            return;
          }
          const touch = event.touches[0];
          if (!touch) {
            return;
          }
          if (isReactTouchEventOnRangeInput(event)) {
            resetTouchSwipeState(false);
            return;
          }
          const rootElement = event.currentTarget;
          const elementAtPoint = getElementAtPoint(
            rootElement.getRootNode(),
            touch.clientX,
            touch.clientY,
          );
          const eventTarget = getTarget(event);
          const target = isElement(eventTarget) ? eventTarget : rootElement;
          if (!contains(rootElement, target)) {
            resetTouchSwipeState(true);
            return;
          }
          virtualKeyboard?.onTouchStart(event);
          // `x`/`y` hand touch drags along that axis to the element. Any value other than the
          // cross-axis one ignores the swipe outright; a cross-axis element is arbitrated like a
          // native cross-axis scroller below.
          if (
            closest(
              elementAtPoint,
              `${BASE_UI_SWIPE_IGNORE_SELECTOR}:not(${AXIS_SWIPE_IGNORE_SELECTORS[crossScrollAxis()]})`,
            )
          ) {
            resetTouchSwipeState(true);
            return;
          }
          ignoreTouchSwipeRef.current = false;
          const scrollTarget = findScrollableTouchTarget(target, rootElement, scrollAxis());
          const hasCrossAxisGestureTarget =
            findScrollableTouchTarget(target, rootElement, crossScrollAxis()) != null ||
            closest(elementAtPoint, AXIS_SWIPE_IGNORE_SELECTORS[crossScrollAxis()]) != null;
          let allowSwipe: boolean | null = null;
          if (scrollTarget) {
            const canSwipeFromEdge = isAtSwipeStartEdge(
              scrollTarget,
              scrollAxis(),
              drawerContext.swipeDirection(),
            );
            allowSwipe = canSwipeFromEdge ? null : false;
          }
          touchScrollStateRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            lastX: touch.clientX,
            lastY: touch.clientY,
            scrollTarget,
            hasCrossAxisGestureTarget,
            allowSwipe,
            preserveNativeCrossAxisScroll: false,
            drawerAxisAttributed: false,
          };
          swipeTouchProps().onTouchStart?.(event);
        },
        onTouchEnd(event) {
          virtualKeyboard?.onTouchEnd(event);
          resetTouchTrackingState();
          swipeTouchProps().onTouchEnd?.(event);
        },
        onTouchCancel(event) {
          virtualKeyboard?.onTouchCancel();
          resetTouchTrackingState();
          swipeTouchProps().onTouchCancel?.(event);
        },
        // Drawer popups use drawer-specific nested state attributes.
        // Suppress DialogViewport's generic nested dialog attribute.
        [DialogViewportDataAttributes.nestedDialogOpen as string]: undefined,
      })}
    >
      <DrawerViewportContext value={swipeProviderValue}>{props.children}</DrawerViewportContext>
    </DialogViewport>
  );
};
export interface DrawerViewportState {
  /**
   * Whether the drawer is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * Whether the drawer is nested within another drawer.
   */
  nested: boolean;
  /**
   * Whether the drawer has nested drawers open.
   */
  nestedDialogOpen: boolean;
}
export interface DrawerViewportProps extends BaseUIComponentProps<'div', DrawerViewportState> {}
export namespace DrawerViewport {
  export type Props = DrawerViewportProps;
  export type State = DrawerViewportState;
}
function setBackdropSwipingAttribute(backdropElement: HTMLElement | null, swiping: boolean) {
  backdropElement?.toggleAttribute(DrawerPopupDataAttributes.swiping, swiping);
}
function isSwipeIgnoredTarget(target: Element | null): boolean {
  return Boolean(closest(target, BASE_UI_SWIPE_IGNORE_SELECTOR));
}
function isDrawerContentTarget(target: Element | null): boolean {
  return Boolean(closest(target, DRAWER_CONTENT_SELECTOR));
}
function getBaseSwipeSize(element: HTMLElement, direction: SwipeDirection): number {
  return direction === 'left' || direction === 'right' ? element.offsetWidth : element.offsetHeight;
}
function getBaseSwipeThreshold(element: HTMLElement, direction: SwipeDirection): number {
  return Math.max(getBaseSwipeSize(element, direction) * 0.5, MIN_SWIPE_THRESHOLD);
}
function isRangeInput(
  target: EventTarget | null,
  win: ReturnType<typeof ownerWindow>,
): target is HTMLInputElement {
  return target instanceof win.HTMLInputElement && target.type === 'range';
}
function isTextSelectionControl(target: Element): target is HTMLInputElement | HTMLTextAreaElement {
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
}
function hasExpandedSelectionWithinTarget(selection: Selection, target: Element): boolean {
  const anchorElement = isElement(selection.anchorNode)
    ? selection.anchorNode
    : selection.anchorNode?.parentElement;
  const focusElement = isElement(selection.focusNode)
    ? selection.focusNode
    : selection.focusNode?.parentElement;
  return (
    selection.containsNode(target, true) ||
    contains(target, anchorElement) ||
    contains(target, focusElement)
  );
}
function shouldIgnoreSwipeForTextSelection(doc: Document, rootElement: HTMLElement): boolean {
  const activeEl = activeElement(doc);
  if (activeEl && contains(rootElement, activeEl) && isTextSelectionControl(activeEl)) {
    const { selectionStart, selectionEnd } = activeEl;
    if (selectionStart != null && selectionEnd != null && selectionStart < selectionEnd) {
      return true;
    }
  }
  const selection = doc.getSelection?.();
  if (!selection || selection.isCollapsed) {
    return false;
  }
  return hasExpandedSelectionWithinTarget(selection, rootElement);
}
function isEventOnRangeInput(event: TouchEvent, win: ReturnType<typeof ownerWindow>): boolean {
  return event.composedPath().some((pathTarget) => isRangeInput(pathTarget, win));
}
function isReactTouchEventOnRangeInput(event: TouchEvent): boolean {
  return isEventOnRangeInput(event, ownerWindow(event.currentTarget));
}
function updateTouchScrollPosition(touchState: TouchScrollState, touch: Touch): void {
  touchState.lastX = touch.clientX;
  touchState.lastY = touch.clientY;
}
/**
 * Arbitrates a touchmove between the drawer swipe and a cross-axis gesture: a native scroll, or an
 * element marked with the cross-axis `data-base-ui-swipe-ignore` value.
 * Returns `true` when the move must be left alone — either because the cross axis already won the
 * gesture, or because neither axis has passed the slop yet and the gesture cannot be attributed.
 */
function shouldYieldTouchMove(
  touchState: TouchScrollState,
  event: TouchEvent,
  touch: Touch,
  isVerticalScrollAxis: boolean,
): boolean {
  if (touchState.preserveNativeCrossAxisScroll) {
    return true;
  }
  // Attribution happens once per gesture. Re-arbitrating after the drawer axis has won would let
  // the pre-attribution branches below fire mid-drag (the slop is measured from the touch origin,
  // which is never re-baselined), freezing the popup and dropping `preventDefault()`.
  if (
    touchState.drawerAxisAttributed ||
    touchState.allowSwipe === true ||
    !touchState.hasCrossAxisGestureTarget
  ) {
    return false;
  }
  // A non-cancelable touchmove means the browser has already committed the gesture to a native
  // scroll; claiming it for the swipe would drag the popup alongside the scrolling content.
  if (!event.cancelable) {
    touchState.preserveNativeCrossAxisScroll = true;
    return true;
  }
  const drawerAxisGestureDelta = isVerticalScrollAxis
    ? touch.clientY - touchState.startY
    : touch.clientX - touchState.startX;
  const crossAxisGestureDelta = isVerticalScrollAxis
    ? touch.clientX - touchState.startX
    : touch.clientY - touchState.startY;
  const absDrawerAxisGestureDelta = Math.abs(drawerAxisGestureDelta);
  const absCrossAxisGestureDelta = Math.abs(crossAxisGestureDelta);
  if (
    absCrossAxisGestureDelta >= AXIS_LOCK_SLOP &&
    absCrossAxisGestureDelta > absDrawerAxisGestureDelta + AXIS_LOCK_BIAS
  ) {
    touchState.preserveNativeCrossAxisScroll = true;
    return true;
  }
  if (absDrawerAxisGestureDelta >= AXIS_LOCK_SLOP) {
    touchState.drawerAxisAttributed = true;
    return false;
  }
  // Neither axis has traveled past the slop yet, so the gesture cannot be attributed. Leave the
  // event alone: on iOS, `preventDefault()` on the first cancelable touchmove cancels native
  // scrolling for the entire gesture, which would lock a cross-axis scroll that only passes the
  // slop on a later move.
  return true;
}
function hasScrollableContentOnAxis(scrollTarget: HTMLElement, axis: ScrollAxis): boolean {
  return getScrollMetrics(scrollTarget, axis).max > 0;
}
function getScrollMetrics(scrollTarget: HTMLElement, axis: ScrollAxis) {
  if (axis === 'vertical') {
    const max = Math.max(0, scrollTarget.scrollHeight - scrollTarget.clientHeight);
    return { offset: scrollTarget.scrollTop, max };
  }
  const max = Math.max(0, scrollTarget.scrollWidth - scrollTarget.clientWidth);
  return { offset: scrollTarget.scrollLeft, max };
}
function isAtSwipeStartEdge(
  scrollTarget: HTMLElement,
  axis: ScrollAxis,
  direction: SwipeDirection,
): boolean {
  const dismissFromStartEdge = shouldDismissFromStartEdge(direction, axis);
  const { offset, max } = getScrollMetrics(scrollTarget, axis);
  return dismissFromStartEdge ? offset <= 0 : offset >= max;
}
function canSwipeFromScrollEdgeOnMove(
  scrollTarget: HTMLElement,
  axis: ScrollAxis,
  direction: SwipeDirection,
  delta: number,
): boolean {
  const dismissFromStartEdge = shouldDismissFromStartEdge(direction, axis);
  const movingTowardDismiss = dismissFromStartEdge ? delta > 0 : delta < 0;
  if (!movingTowardDismiss) {
    return false;
  }
  return isAtSwipeStartEdge(scrollTarget, axis, direction);
}
function shouldDismissFromStartEdge(direction: SwipeDirection, axis: ScrollAxis): boolean {
  return axis === 'vertical' ? direction === 'down' : direction === 'right';
}
// Port note: apply Solid updates synchronously where upstream flushes React.
function flushSync(callback: () => void) {
  callback();
  flush();
}
