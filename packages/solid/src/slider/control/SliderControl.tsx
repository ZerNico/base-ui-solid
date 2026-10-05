import { omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { isElement } from '@floating-ui/utils/dom';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { ownerDocument, ownerWindow } from '@base-ui-solid/utils/owner';
import { useAnimationFrame } from '@base-ui-solid/utils/useAnimationFrame';
import { useIsoLayoutEffect, useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { clamp } from '@base-ui-solid/utils/clamp';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { activeElement, contains, getTarget } from '../../floating-ui-solid/utils';
import type { Coords } from '../../floating-ui-solid/types';
import type { BaseUIComponentProps } from '../../internals/types';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useRenderElement } from '../../internals/useRenderElement';
import { useDirection } from '../../internals/direction-context/DirectionContext';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';
import type { SliderRootState } from '../root/SliderRoot';
import { isTouchLikePointerType } from '../../internals/usePressAndHold';
import { getMidpoint } from '../utils/getMidpoint';
import { roundValueToStep } from '../utils/roundValueToStep';
import { validateMinimumDistance } from '../utils/validateMinimumDistance';
import { resolveThumbCollision } from '../utils/resolveThumbCollision';

const INTENTIONAL_DRAG_COUNT_THRESHOLD = 2;

function getControlOffset(styles: CSSStyleDeclaration | null, vertical: boolean) {
  if (!styles) {
    return {
      start: 0,
      end: 0,
    };
  }

  function parseSize(value: string | null | undefined) {
    const parsed = value != null ? parseFloat(value) : 0;
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  const start = !vertical ? 'InlineStart' : 'Top';
  const end = !vertical ? 'InlineEnd' : 'Bottom';

  return {
    start: parseSize(styles[`border${start}Width`]) + parseSize(styles[`padding${start}`]),
    end: parseSize(styles[`border${end}Width`]) + parseSize(styles[`padding${end}`]),
  };
}

function getFingerCoords(
  event: TouchEvent | PointerEvent,
  touchIdRef: RefObject<number | null>,
): Coords | null {
  // The event is TouchEvent
  if (touchIdRef.current != null && (event as TouchEvent).changedTouches) {
    const touchEvent = event as TouchEvent;
    for (let i = 0; i < touchEvent.changedTouches.length; i += 1) {
      const touch = touchEvent.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        return {
          x: touch.clientX,
          y: touch.clientY,
        };
      }
    }

    return null;
  }

  // The event is PointerEvent
  return {
    x: (event as PointerEvent).clientX,
    y: (event as PointerEvent).clientY,
  };
}

/**
 * The clickable, interactive part of the slider.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui-solid.pages.dev/solid/components/slider)
 */
export function SliderControl(componentProps: SliderControl.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const {
    disabled,
    dragging,
    inset,
    isArrayValue,
    lastChangeReasonRef,
    max,
    min,
    minStepsBetweenValues,
    onValueCommitted,
    orientation,
    pressedThumbCenterOffsetRef,
    pressedThumbIndexRef,
    pressedValuesRef,
    registerFieldControlRef,
    renderBeforeHydration,
    setActive,
    setDragging,
    setValue,
    state,
    step,
    thumbCollisionBehavior,
    thumbRefs,
    values,
  } = useSliderRootContext();

  const direction = useDirection();
  const range = () => values().length > 1;
  const vertical = () => orientation() === 'vertical';

  let controlElement: HTMLElement | null = null;
  let styles: CSSStyleDeclaration | null = null;
  const setStylesRef = (element: HTMLElement | null) => {
    if (element && styles == null) {
      styles = ownerWindow(element).getComputedStyle(element);
    }
  };

  // A number that uniquely identifies the current finger in the touch session.
  const touchIdRef: RefObject<number | null> = { current: null };
  // The number of touch/pointermove events that have fired.
  let moveCount = 0;
  // The offset amount to each side of the control for inset sliders.
  // This value should be equal to the radius or half the width/height of the thumb.
  let insetThumbOffset = 0;
  let currentInteractionValue: number | number[] | null = null;
  // Whether `pointerdown` started the current gesture, so the `touchstart` that follows it
  // doesn't restart it.
  let pointerGesture = false;
  // Port note: upstream's `useValueAsRef(values)` copies the rendered values after every render.
  // There are no re-renders here, so the copy runs whenever the root state changes.
  const latestValuesRef: RefObject<readonly number[]> = { current: untrack(values) };
  useIsoLayoutEffect(
    ([currentState]) => {
      latestValuesRef.current = currentState.values;
    },
    () => [state()],
  );

  function getThumbInput(el: Element | null | undefined) {
    return el?.querySelector<HTMLInputElement>('input[type="range"]');
  }

  function updatePressedThumb(nextIndex: number) {
    pressedThumbIndexRef.current = nextIndex;
    if (!thumbRefs.current[nextIndex]) {
      pressedThumbCenterOffsetRef.current = null;
    }
  }

  function resetPressedThumb() {
    pressedThumbIndexRef.current = -1;
    pressedThumbCenterOffsetRef.current = null;
  }

  function isTargetDisabledThumb(target: EventTarget | null) {
    if (!isElement(target)) {
      return false;
    }

    return thumbRefs.current.some((thumbEl) => {
      if (!isElement(thumbEl) || !contains(thumbEl, target)) {
        return false;
      }

      return getThumbInput(thumbEl)?.disabled === true;
    });
  }

  function getFingerState(fingerCoords: Coords): FingerState | null {
    const control = controlElement;
    const thumbIndex = pressedThumbIndexRef.current;
    const currentValues = values();

    if (!control || thumbIndex < 0 || thumbIndex >= currentValues.length) {
      if (thumbIndex >= currentValues.length) {
        currentInteractionValue = null;
      }
      return null;
    }

    const isVertical = vertical();
    const currentMin = min();
    const currentMax = max();
    const currentStep = step();

    const { width, height, bottom, left, right } = control.getBoundingClientRect();

    const controlOffset = getControlOffset(styles, isVertical);
    const controlSize =
      (isVertical ? height : width) -
      controlOffset.start -
      controlOffset.end -
      insetThumbOffset * 2;
    const thumbCenterOffset = pressedThumbCenterOffsetRef.current ?? 0;
    const fingerX = fingerCoords.x - thumbCenterOffset;
    const fingerY = fingerCoords.y - thumbCenterOffset;

    const valueSize = isVertical
      ? bottom - fingerY - controlOffset.end
      : (direction() === 'rtl' ? right - fingerX : fingerX - left) - controlOffset.start;
    // the value at the finger origin scaled down to fit the range [0, 1]
    const valueRescaled = clamp((valueSize - insetThumbOffset) / controlSize, 0, 1);

    let newValue = (currentMax - currentMin) * valueRescaled + currentMin;
    newValue = roundValueToStep(newValue, currentStep, currentMin);
    newValue = clamp(newValue, currentMin, currentMax);

    if (!range()) {
      return {
        value: isArrayValue() ? [newValue] : newValue,
        thumbIndex,
        didSwap: false,
      };
    }

    return resolveThumbCollision(
      thumbCollisionBehavior(),
      currentValues,
      latestValuesRef.current,
      pressedValuesRef.current,
      thumbIndex,
      newValue,
      currentMin,
      currentMax,
      currentStep,
      minStepsBetweenValues(),
    );
  }

  function startPressing(fingerCoords: Coords) {
    const currentValues = values();
    const currentMax = max();
    pressedValuesRef.current = range() ? currentValues.slice() : null;
    currentInteractionValue = null;
    latestValuesRef.current = currentValues;

    const pressedThumbIndex = pressedThumbIndexRef.current;
    let closestThumbIndex = pressedThumbIndex;

    if (pressedThumbIndex > -1 && pressedThumbIndex < currentValues.length) {
      if (currentValues[pressedThumbIndex] === currentMax) {
        let candidateIndex = pressedThumbIndex;

        while (candidateIndex > 0 && currentValues[candidateIndex - 1] === currentMax) {
          candidateIndex -= 1;
        }

        closestThumbIndex = candidateIndex;
      }
    } else {
      // pressed on control
      const axis = !vertical() ? 'x' : 'y';
      let minDistance: number | undefined;

      closestThumbIndex = -1;

      for (let i = 0; i < thumbRefs.current.length; i += 1) {
        const thumbEl = thumbRefs.current[i];
        if (isElement(thumbEl) && !getThumbInput(thumbEl)?.disabled) {
          const midpoint = getMidpoint(thumbEl, vertical());
          const distance = Math.abs(fingerCoords[axis] - midpoint);

          if (minDistance === undefined || distance <= minDistance) {
            closestThumbIndex = i;
            minDistance = distance;
          }
        }
      }
    }

    if (closestThumbIndex > -1 && closestThumbIndex !== pressedThumbIndex) {
      updatePressedThumb(closestThumbIndex);
    }

    if (inset()) {
      const thumbEl = thumbRefs.current[closestThumbIndex];
      if (isElement(thumbEl)) {
        const thumbRect = thumbEl.getBoundingClientRect();
        const side = !vertical() ? 'width' : 'height';
        insetThumbOffset = thumbRect[side] / 2;
      }
    }
  }

  function focusThumb(thumbIndex: number) {
    const input = getThumbInput(thumbRefs.current?.[thumbIndex]);
    if (!input) {
      return;
    }

    input.focus({
      preventScroll: true,
      // Prevent pointer-driven focus rings in browsers that support this option.
      // Supported in Chrome from 144+.
      focusVisible: false,
    } as FocusOptions);
  }

  function setValueFromPointer(
    finger: FingerState,
    reason: typeof REASONS.trackPress | typeof REASONS.drag,
    nativeEvent: TouchEvent | PointerEvent,
  ) {
    const applied = setValue(
      finger.value,
      createChangeEventDetails(reason, nativeEvent, undefined, {
        activeThumbIndex: finger.thumbIndex,
      }),
    );

    if (applied) {
      currentInteractionValue = finger.value;
      latestValuesRef.current = Array.isArray(finger.value) ? finger.value : [finger.value];

      // Only track and focus the swapped thumb once the change is actually applied so a
      // canceled swap doesn't leak the new index into subsequent moves.
      if (finger.didSwap) {
        updatePressedThumb(finger.thumbIndex);
        focusThumb(finger.thumbIndex);
      }
    }

    return applied;
  }

  const handleTouchMove = (nativeEvent: TouchEvent | PointerEvent) => {
    const fingerCoords = getFingerCoords(nativeEvent, touchIdRef);

    if (fingerCoords == null) {
      return;
    }

    moveCount += 1;

    // Cancel move in case some other element consumed a pointerup event and it was not fired.
    if (nativeEvent.type === 'pointermove' && (nativeEvent as PointerEvent).buttons === 0) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      handleTouchEnd(nativeEvent);
      return;
    }

    const finger = getFingerState(fingerCoords);

    if (finger == null) {
      return;
    }

    if (validateMinimumDistance(finger.value, step(), minStepsBetweenValues())) {
      if (!dragging() && moveCount > INTENTIONAL_DRAG_COUNT_THRESHOLD) {
        setDragging(true);
      }

      setValueFromPointer(finger, REASONS.drag, nativeEvent);
    }
  };

  const handleTouchEnd = (nativeEvent: TouchEvent | PointerEvent) => {
    if (getFingerCoords(nativeEvent, touchIdRef) == null) {
      return;
    }

    setActive(-1);
    setDragging(false);

    pressedThumbCenterOffsetRef.current = null;

    // If the value array shrank or grew mid-drag, the cached interaction value no longer
    // matches the current thumbs (the pressed index can still be in range), so dropping it
    // keeps a stale or malformed array from being committed on release.
    const interactionValue = currentInteractionValue;
    if (Array.isArray(interactionValue) && interactionValue.length !== values().length) {
      currentInteractionValue = null;
    }

    if (currentInteractionValue != null) {
      const commitReason = lastChangeReasonRef.current;
      onValueCommitted(
        currentInteractionValue,
        createGenericEventDetails(commitReason, nativeEvent),
      );
    }

    if ('pointerType' in nativeEvent && controlElement?.hasPointerCapture(nativeEvent.pointerId)) {
      controlElement?.releasePointerCapture(nativeEvent.pointerId);
    }

    pressedThumbIndexRef.current = -1;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    stopListening();
  };

  const handlePointerCancel = (nativeEvent: PointerEvent) => {
    // The browser cancels a touch pointer once it starts panning, but the touch listeners keep
    // tracking the finger until `touchend` or `touchcancel`.
    if (touchIdRef.current != null) {
      return;
    }

    handleTouchEnd(nativeEvent);
  };

  const handleTouchStart = (nativeEvent: TouchEvent) => {
    // Only the `touchstart` right after `pointerdown` belongs to the pointer gesture, so consume
    // the flag here where it can't outlive a cancelled gesture.
    const startedByPointer = pointerGesture;
    pointerGesture = false;

    if (disabled()) {
      return;
    }

    if (isTargetDisabledThumb(getTarget(nativeEvent))) {
      resetPressedThumb();
      return;
    }

    const touch = nativeEvent.changedTouches[0];
    if (touch == null) {
      return;
    }

    touchIdRef.current = touch.identifier;

    // The pointer handlers already started this gesture. Keep its state and only add the touch
    // listeners, which continue tracking the finger if the browser cancels the pointer.
    if (!startedByPointer) {
      const fingerCoords = { x: touch.clientX, y: touch.clientY };
      startPressing(fingerCoords);

      const finger = getFingerState(fingerCoords);

      if (finger == null) {
        return;
      }

      focusThumb(finger.thumbIndex);
      setValueFromPointer(finger, REASONS.trackPress, nativeEvent);

      moveCount = 0;
    }

    const doc = ownerDocument(controlElement);
    doc.addEventListener('touchmove', handleTouchMove, { passive: true });
    doc.addEventListener('touchend', handleTouchEnd, { passive: true });
    doc.addEventListener('touchcancel', handleTouchEnd, { passive: true });
  };

  const stopListening = () => {
    const doc = ownerDocument(controlElement);
    doc.removeEventListener('pointermove', handleTouchMove);
    doc.removeEventListener('pointerup', handleTouchEnd);
    doc.removeEventListener('pointercancel', handlePointerCancel);
    doc.removeEventListener('touchmove', handleTouchMove);
    doc.removeEventListener('touchend', handleTouchEnd);
    doc.removeEventListener('touchcancel', handleTouchEnd);
    touchIdRef.current = null;
    pressedValuesRef.current = null;
    currentInteractionValue = null;
    pointerGesture = false;
  };

  const focusFrame = useAnimationFrame();

  useEffect(
    () => {
      const control = controlElement;
      if (!control) {
        return () => stopListening();
      }

      const unsubscribeTouchStart = addEventListener(control, 'touchstart', handleTouchStart, {
        passive: true,
      });

      return () => {
        unsubscribeTouchStart();
        focusFrame.cancel();

        stopListening();
      };
    },
    () => [],
  );

  useEffect(
    ([isDisabled]) => {
      if (isDisabled) {
        stopListening();
      }
    },
    () => [disabled()],
  );

  return useRenderElement('div', componentProps, {
    state,
    ref: [
      registerFieldControlRef ?? undefined,
      (element: HTMLElement | null) => {
        controlElement = element;
      },
      setStylesRef,
    ],
    props: () => [
      {
        'data-base-ui-slider-control': renderBeforeHydration() ? '' : undefined,
        onPointerDown(event: PointerEvent) {
          // Replace a flag left by a cancelled gesture that had no `touchstart` to consume it.
          pointerGesture = false;
          const control = controlElement;
          const target = getTarget(event);

          if (
            !control ||
            disabled() ||
            event.defaultPrevented ||
            !isElement(target) ||
            // Only handle left clicks
            event.button !== 0
          ) {
            return;
          }

          if (isTargetDisabledThumb(target)) {
            resetPressedThumb();
            return;
          }

          const fingerCoords = { x: event.clientX, y: event.clientY };
          startPressing(fingerCoords);

          const finger = getFingerState(fingerCoords);

          if (finger == null) {
            return;
          }

          const pressedOnFocusedThumb = contains(
            thumbRefs.current[finger.thumbIndex],
            activeElement(ownerDocument(control)),
          );

          if (pressedOnFocusedThumb) {
            event.preventDefault();
          } else {
            focusFrame.request(() => {
              focusThumb(finger.thumbIndex);
            });
          }

          setDragging(true);

          const pressedOnAnyThumb = pressedThumbCenterOffsetRef.current != null;
          if (!pressedOnAnyThumb) {
            setValueFromPointer(finger, REASONS.trackPress, event);
          }

          if (event.pointerId) {
            control.setPointerCapture(event.pointerId);
          }

          moveCount = 0;
          // Touch and pen presses can be followed by a compatibility `touchstart` (Apple Pencil).
          pointerGesture = isTouchLikePointerType(event.pointerType);
          const doc = ownerDocument(control);
          doc.addEventListener('pointermove', handleTouchMove, { passive: true });
          doc.addEventListener('pointerup', handleTouchEnd, { once: true });
          doc.addEventListener('pointercancel', handlePointerCancel, { once: true });
        },
      },
      elementProps,
    ],
    stateAttributesMapping: sliderStateAttributesMapping,
  });
}

interface FingerState {
  value: number | number[];
  thumbIndex: number;
  didSwap: boolean;
}

export interface SliderControlState extends SliderRootState {}

export interface SliderControlProps extends BaseUIComponentProps<'div', SliderControlState> {}

export namespace SliderControl {
  export type State = SliderControlState;
  export type Props = SliderControlProps;
}
