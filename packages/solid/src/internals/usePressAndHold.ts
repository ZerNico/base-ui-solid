import { untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { NOOP } from '@base-ui-solid/utils/empty';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { useInterval } from '@base-ui-solid/utils/useInterval';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { ownerWindow } from '@base-ui-solid/utils/owner';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { onCleanupWithWrites } from '@base-ui-solid/utils/cleanup';

const DEFAULT_TICK_DELAY = 60;
const DEFAULT_START_DELAY = 400;
const DEFAULT_SCROLL_DISTANCE = 8;
const TOUCH_TIMEOUT = 50;
const MAX_POINTER_MOVES_AFTER_TOUCH = 3;

// Treat pen as touch-like to avoid forcing the software keyboard on stylus taps.
// Linux Chrome may emit "pen" historically for mouse usage due to a bug, but the touch path
// still works with minor behavioral differences.
export function isTouchLikePointerType(pointerType: string) {
  return pointerType === 'touch' || pointerType === 'pen';
}

export interface UsePressAndHoldParameters {
  disabled: Accessor<boolean>;
  /**
   * Called on each tick during a hold. Return `false` to stop the auto-change sequence.
   */
  tick: (triggerEvent?: Event) => boolean;
  /**
   * Called when the hold ends via the global `pointerup` event.
   */
  onStop?: ((nativeEvent: PointerEvent) => void) | undefined;
  /**
   * Interval between ticks once the hold is active.
   * @default 60
   */
  tickDelay?: number | undefined;
  /**
   * Delay before the repeating ticks start after the initial hold.
   * @default 400
   */
  startDelay?: number | undefined;
  /**
   * Pointer movement distance (px) that cancels the hold and is treated as scrolling.
   * @default 8
   */
  scrollDistance?: number | undefined;
  /**
   * Ref to the anchor element used to resolve `ownerWindow`.
   */
  elementRef: RefObject<HTMLElement | null>;
}

export interface UsePressAndHoldReturnValue {
  pointerHandlers: {
    onTouchStart: (event: TouchEvent) => void;
    onTouchEnd: (event: TouchEvent) => void;
    onPointerDown: (event: PointerEvent) => void;
    onPointerUp: (event: PointerEvent) => void;
    onPointerMove: (event: PointerEvent) => void;
    onMouseEnter: (event: MouseEvent) => void;
    onMouseLeave: (event: MouseEvent) => void;
    onMouseUp: (event: MouseEvent) => void;
  };
  /**
   * Returns `true` if the `onClick` handler should be skipped.
   * Use this in the element's `onClick` to prevent double-firing on mouse clicks
   * (already handled by `onPointerDown`) and to suppress the synthesized click
   * that browsers fire after a touch hold.
   */
  shouldSkipClick: (event: MouseEvent) => boolean;
}

/**
 * Adds press-and-hold behavior to a button element.
 * On pointer down, performs one action immediately, then after a delay starts
 * continuous repeated actions at a fixed interval. Handles mouse, touch, and pen
 * inputs correctly, including Android-specific quirks.
 */
export function usePressAndHold(params: UsePressAndHoldParameters): UsePressAndHoldReturnValue {
  const {
    disabled,
    tick,
    onStop,
    tickDelay = DEFAULT_TICK_DELAY,
    startDelay = DEFAULT_START_DELAY,
    scrollDistance = DEFAULT_SCROLL_DISTANCE,
    elementRef,
  } = params;

  const startTickTimeout = useTimeout();
  const tickInterval = useInterval();
  const intentionalTouchCheckTimeout = useTimeout();

  let isPressed = false;
  let movesAfterTouch = 0;
  let downCoords = { x: 0, y: 0 };
  let isTouchingButton = false;
  let ignoreClick = false;
  let pointerType = '';
  let unsubscribeFromGlobalContextMenu: () => void = NOOP;
  let unsubscribeFromGlobalPointerUp: () => void = NOOP;

  function stopAutoChange() {
    intentionalTouchCheckTimeout.clear();
    startTickTimeout.clear();
    tickInterval.clear();
    unsubscribeFromGlobalContextMenu();
    movesAfterTouch = 0;
  }

  function startAutoChange(triggerNativeEvent?: Event) {
    stopAutoChange();

    const element = elementRef.current;
    if (!element) {
      return;
    }

    const win = ownerWindow(element);

    function handleContextMenu(event: Event) {
      event.preventDefault();
    }

    // A global context menu listener is necessary to prevent the context menu from
    // appearing when the touch is slightly outside of the element's hit area.
    unsubscribeFromGlobalContextMenu = addEventListener(win, 'contextmenu', handleContextMenu);

    // The release listener stays registered through `stopAutoChange` so a hold that auto-stops at
    // a boundary (a repeat tick returning `false`) still fires `onStop` on release. Replace any
    // existing one first so a mouseleave/mouseenter cycle during a hold doesn't stack listeners
    // (which would otherwise fire `onStop` more than once on release).
    unsubscribeFromGlobalPointerUp();
    unsubscribeFromGlobalPointerUp = addEventListener(
      win,
      'pointerup',
      (event) => {
        isPressed = false;
        stopAutoChange();
        onStop?.(event);
      },
      { once: true },
    );

    if (!tick(triggerNativeEvent)) {
      stopAutoChange();
      return;
    }

    startTickTimeout.start(startDelay, () => {
      tickInterval.start(tickDelay, () => {
        if (!tick(triggerNativeEvent)) {
          stopAutoChange();
        }
      });
    });
  }

  onCleanupWithWrites(() => {
    stopAutoChange();
    unsubscribeFromGlobalPointerUp();
  });

  useEffect(
    ([isDisabled]) => {
      if (isDisabled) {
        isPressed = false;
        isTouchingButton = false;
        pointerType = '';
        stopAutoChange();
      }
    },
    () => [disabled()],
  );

  const pointerHandlers: UsePressAndHoldReturnValue['pointerHandlers'] = {
    onTouchStart() {
      isTouchingButton = true;
    },
    onTouchEnd() {
      isTouchingButton = false;
    },
    onPointerDown(event) {
      if (event.defaultPrevented || event.button || untrack(disabled)) {
        return;
      }

      pointerType = event.pointerType;
      ignoreClick = false;
      isPressed = true;
      downCoords = { x: event.clientX, y: event.clientY };

      const isTouchPointer = isTouchLikePointerType(event.pointerType);

      if (!isTouchPointer) {
        event.preventDefault();
        startAutoChange(event);
      } else {
        // Check if the pointerdown was intentional and not the result of a scroll or
        // pinch-zoom. In that case, we don't want to start the auto-change sequence.
        intentionalTouchCheckTimeout.start(TOUCH_TIMEOUT, () => {
          const moves = movesAfterTouch;
          movesAfterTouch = 0;
          // Only start auto-change if the touch is still pressed (prevents races
          // with pointerup occurring before the timeout fires on quick taps).
          const stillPressed = isPressed;
          if (stillPressed && moves < MAX_POINTER_MOVES_AFTER_TOUCH) {
            startAutoChange(event);
            ignoreClick = true; // synthesized click after hold should be ignored
          } else {
            // No auto-change (simple tap or scroll gesture), allow the click handler
            // to perform a single action.
            ignoreClick = false;
            stopAutoChange();
          }
        });
      }
    },
    onPointerUp(event) {
      // Ensure we mark the press as released for touch flows even if auto-change never
      // started, so the delayed auto-change check won't start after a quick tap.
      if (isTouchLikePointerType(event.pointerType)) {
        isPressed = false;
      }
    },
    onPointerMove(event) {
      if (untrack(disabled) || !isTouchLikePointerType(event.pointerType) || !isPressed) {
        return;
      }

      movesAfterTouch += 1;

      const { x, y } = downCoords;
      const dx = x - event.clientX;
      const dy = y - event.clientY;

      if (dx ** 2 + dy ** 2 > scrollDistance ** 2) {
        stopAutoChange();
      }
    },
    onMouseEnter(event) {
      if (
        event.defaultPrevented ||
        untrack(disabled) ||
        !isPressed ||
        isTouchingButton ||
        isTouchLikePointerType(pointerType)
      ) {
        return;
      }

      startAutoChange(event);
    },
    onMouseLeave() {
      if (isTouchingButton) {
        return;
      }

      stopAutoChange();
    },
    // Local fallback for the window `pointerup` listener, which an ancestor can stop from
    // reaching the window by calling `stopPropagation`.
    onMouseUp() {
      if (isTouchingButton) {
        return;
      }

      stopAutoChange();
    },
  };

  function shouldSkipClick(event: MouseEvent): boolean {
    if (event.defaultPrevented) {
      return true;
    }
    if (isTouchLikePointerType(pointerType)) {
      return ignoreClick;
    }
    return event.detail !== 0;
  }

  return { pointerHandlers, shouldSkipClick };
}
