import { createSignal, flush, omit, onCleanup, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { mergeCleanups } from '@base-ui-solid/utils/mergeCleanups';
import { ownerWindow, ownerDocument } from '@base-ui-solid/utils/owner';
import { platform } from '@base-ui-solid/utils/platform';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { BaseUIComponentProps } from '../../internals/types';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { NumberFieldScrubAreaContext } from './NumberFieldScrubAreaContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { getViewportRect } from '../utils/getViewportRect';
import { createGenericEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { getTarget } from '../../floating-ui-react/utils';

const SCRUB_AREA_STYLE = {
  'touch-action': 'none',
  '-webkit-user-select': 'none',
  'user-select': 'none',
};

/**
 * An interactive area where the user can click and drag to change the field value.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Number Field](https://base-ui.com/react/components/number-field)
 */
export function NumberFieldScrubArea(componentProps: NumberFieldScrubArea.Props): JSX.Element {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'direction',
    'pixelSensitivity',
    'teleportDistance',
    'style',
  );

  const direction = () => componentProps.direction ?? 'horizontal';
  const pixelSensitivity = () => componentProps.pixelSensitivity ?? 2;

  const {
    state,
    setIsScrubbing: setRootScrubbing,
    inputRef,
    focusInput,
    incrementValue,
    allowInputSyncRef,
    getStepAmount,
    onValueCommitted,
    lastChangedValueRef,
    valueRef,
  } = useNumberFieldRootContext();
  const disabled = () => state().disabled;
  const readOnly = () => state().readOnly;

  let scrubAreaElement: HTMLSpanElement | null = null;

  let isScrubbingRef = false;
  let didMove = false;
  let pointerDownTarget: EventTarget | null = null;
  const scrubAreaCursorRef: { current: HTMLSpanElement | null } = { current: null };
  let virtualCursorCoords = { x: 0, y: 0 };

  const exitPointerLockTimeout = useTimeout();

  const [isTouchInput, setIsTouchInput] = createSignal(false);
  const [isPointerLockDenied, setIsPointerLockDenied] = createSignal(false);
  const [isScrubbing, setIsScrubbing] = createSignal(false);

  function updateCursorTransform(virtualCursor: HTMLSpanElement, x: number, y: number) {
    // Invert the visual viewport scale so the cursor matches the OS cursor, which doesn't
    // scale with the content on pinch-zoom.
    const scale = ownerWindow(virtualCursor).visualViewport?.scale ?? 1;
    virtualCursor.style.transform = `translate3d(${x}px,${y}px,0) scale(${1 / scale})`;
  }

  function onScrub({ movementX, movementY }: PointerEvent) {
    const virtualCursor = scrubAreaCursorRef.current;
    const scrubAreaEl = scrubAreaElement;

    if (!virtualCursor || !scrubAreaEl) {
      return;
    }

    const rect = getViewportRect(
      untrack(() => componentProps.teleportDistance),
      scrubAreaEl,
    );

    const coords = virtualCursorCoords;

    // Wrap the cursor to the opposite edge when its center crosses a viewport bound.
    const wrap = (coord: number, halfSize: number, low: number, high: number) => {
      if (coord + halfSize < low) {
        return high - halfSize;
      }
      if (coord + halfSize > high) {
        return low - halfSize;
      }
      return coord;
    };

    const newCoords = {
      x: wrap(
        Math.round(coords.x + movementX),
        virtualCursor.offsetWidth / 2,
        rect.left,
        rect.right,
      ),
      y: wrap(
        Math.round(coords.y + movementY),
        virtualCursor.offsetHeight / 2,
        rect.top,
        rect.bottom,
      ),
    };

    virtualCursorCoords = newCoords;

    updateCursorTransform(virtualCursor, newCoords.x, newCoords.y);
  }

  function onScrubbingChange(scrubbingValue: boolean, { clientX, clientY }: PointerEvent) {
    // Port note: `ReactDOM.flushSync(fn)` -> `fn(); flush();`.
    setIsScrubbing(scrubbingValue);
    setRootScrubbing(scrubbingValue);
    flush();

    const virtualCursor = scrubAreaCursorRef.current;
    if (!virtualCursor || !scrubbingValue) {
      return;
    }

    const initialCoords = {
      x: clientX - virtualCursor.offsetWidth / 2,
      y: clientY - virtualCursor.offsetHeight / 2,
    };

    virtualCursorCoords = initialCoords;

    updateCursorTransform(virtualCursor, initialCoords.x, initialCoords.y);
  }

  useEffect(
    function registerGlobalScrubbingEventListeners([
      currentDisabled,
      currentReadOnly,
      currentIsScrubbing,
      currentDirection,
      currentPixelSensitivity,
    ]) {
      // Only listen while actively scrubbing; avoids unrelated pointerup events committing.
      if (!inputRef.current || currentDisabled || currentReadOnly || !currentIsScrubbing) {
        return undefined;
      }

      let cumulativeDelta = 0;

      function handleScrubPointerUp(event: PointerEvent) {
        function handler() {
          try {
            ownerDocument(scrubAreaElement).exitPointerLock();
          } catch {
            // Ignore errors.
          } finally {
            isScrubbingRef = false;
            onScrubbingChange(false, event);
            onValueCommitted(
              lastChangedValueRef.current ?? valueRef.current,
              createGenericEventDetails(REASONS.scrub, event),
            );

            // Manually dispatch a click event if no movement happened, since
            // preventDefault on pointerdown prevents the browser click event.
            const target = pointerDownTarget;
            const input = inputRef.current;
            if (!didMove && target != null && input) {
              target.dispatchEvent(
                new (ownerWindow(input).MouseEvent)('click', {
                  bubbles: true,
                  cancelable: true,
                }),
              );
            }

            didMove = false;
            pointerDownTarget = null;
          }
        }

        if (platform.engine.gecko) {
          // Firefox needs a small delay here when soft-clicking as the pointer
          // lock will not release otherwise.
          exitPointerLockTimeout.start(20, handler);
        } else {
          handler();
        }
      }

      function handleScrubPointerMove(event: PointerEvent) {
        // The effects below can tear down and re-run without unmounting (`<Activity>`), which
        // clears the ref while `isScrubbing` stays `true` and re-attaches this listener. The ref
        // is the source of truth for whether a pointer is actually down.
        if (!isScrubbingRef) {
          return;
        }

        // Prevent text selection.
        event.preventDefault();

        onScrub(event);

        const { movementX, movementY } = event;

        cumulativeDelta += currentDirection === 'vertical' ? movementY : movementX;

        if (Math.abs(cumulativeDelta) >= currentPixelSensitivity) {
          cumulativeDelta = 0;
          didMove = true;
          const dValue = currentDirection === 'vertical' ? -movementY : movementX;
          const stepAmount = getStepAmount(event);
          const rawAmount = dValue * stepAmount;

          if (rawAmount !== 0) {
            allowInputSyncRef.current = true;
            incrementValue(Math.abs(rawAmount), {
              direction: rawAmount >= 0 ? 1 : -1,
              event,
              reason: REASONS.scrub,
            });
          }
        }
      }

      const win = ownerWindow(inputRef.current);
      const unsubscribe = mergeCleanups(
        addEventListener(win, 'pointerup', handleScrubPointerUp, true),
        addEventListener(win, 'pointermove', handleScrubPointerMove, true),
      );

      return () => {
        exitPointerLockTimeout.clear();
        unsubscribe();
      };
    },
    () => [disabled(), readOnly(), isScrubbing(), direction(), pixelSensitivity()],
  );

  // If the scrub area unmounts mid-scrub, release pointer lock and clear the root's scrubbing
  // state so it doesn't stay locked or stuck. (No commit: there's no pointer release here.)
  onCleanup(() => {
    if (isScrubbingRef) {
      isScrubbingRef = false;
      setRootScrubbing(false);
      try {
        ownerDocument(scrubAreaElement).exitPointerLock();
      } catch {
        // Ignore errors.
      }
    }
  });

  // Prevent scrolling using touch input when scrubbing.
  useEffect(
    function registerScrubberTouchPreventListener([currentDisabled, currentReadOnly]) {
      const element = scrubAreaElement;
      if (!element || currentDisabled || currentReadOnly) {
        return undefined;
      }

      function handleTouchStart(event: TouchEvent) {
        if (event.touches.length === 1) {
          event.preventDefault();
        }
      }

      return addEventListener(element, 'touchstart', handleTouchStart);
    },
    () => [disabled(), readOnly()],
  );

  const defaultProps = {
    role: 'presentation',
    style: SCRUB_AREA_STYLE,
    async onPointerDown(event: PointerEvent) {
      if (event.defaultPrevented || untrack(readOnly) || event.button || untrack(disabled)) {
        return;
      }

      const isTouch = event.pointerType === 'touch';
      setIsTouchInput(isTouch);

      if (event.pointerType === 'mouse') {
        event.preventDefault();
        focusInput();
      }

      isScrubbingRef = true;
      didMove = false;
      pointerDownTarget = getTarget(event);
      onScrubbingChange(true, event);

      // WebKit causes significant layout shift with the native message, so we can't use it.
      if (!isTouch && !platform.engine.webkit) {
        try {
          // Avoid non-deterministic errors in testing environments. This error sometimes
          // appears:
          // "The root document of this element is not valid for pointer lock."
          await ownerDocument(scrubAreaElement).body.requestPointerLock();
          setIsPointerLockDenied(false);
        } catch (error) {
          setIsPointerLockDenied(true);
        } finally {
          // `onScrubbingChange` already wraps its state updates in `flushSync`, so re-emit the
          // scrubbing state directly (no extra nested `flushSync`) to reflect the resolved
          // pointer-lock result on the cursor.
          if (isScrubbingRef) {
            onScrubbingChange(true, event);
          }
        }
      }
    },
  };

  const contextValue: NumberFieldScrubAreaContext = {
    isScrubbing,
    isTouchInput,
    isPointerLockDenied,
    scrubAreaCursorRef,
  };

  return (
    <NumberFieldScrubAreaContext value={contextValue}>
      {useRenderElement('span', componentProps, {
        ref: (element: HTMLSpanElement | null) => {
          scrubAreaElement = element;
        },
        state,
        props: [defaultProps, elementProps],
        stateAttributesMapping,
      })}
    </NumberFieldScrubAreaContext>
  );
}

export interface NumberFieldScrubAreaState extends NumberFieldRootState {}

export interface NumberFieldScrubAreaProps extends BaseUIComponentProps<
  'span',
  NumberFieldScrubAreaState
> {
  /**
   * Cursor movement direction in the scrub area.
   * @default 'horizontal'
   */
  direction?: 'horizontal' | 'vertical' | undefined;
  /**
   * Determines how many pixels the cursor must move before the value changes.
   * A higher value will make scrubbing less sensitive.
   * @default 2
   */
  pixelSensitivity?: number | undefined;
  /**
   * If specified, determines the distance that the cursor may move from the center
   * of the scrub area before it will loop back around.
   */
  teleportDistance?: number | undefined;
}

export namespace NumberFieldScrubArea {
  export type State = NumberFieldScrubAreaState;
  export type Props = NumberFieldScrubAreaProps;
}
