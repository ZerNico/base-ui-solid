import { useAnimationFrame } from '@base-ui-solid/utils/useAnimationFrame';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import type { ElementProps, FloatingRootContext } from '../types';
import { getTarget, isTypeableElement } from '../utils/element';
import { isMouseLikePointerType, isVirtualPointerEvent } from '../utils/event';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';

/**
 * Port note: read lazily like Solid props (`props.x`), so pass a props-like object with getters
 * for reactive options.
 */
export interface UseClickProps {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * The type of event to use to determine a “click” with mouse input.
   * Keyboard clicks work as normal.
   * @default 'click'
   */
  event?: 'click' | 'mousedown' | 'mousedown-only' | undefined;
  /**
   * Whether to toggle the open state with repeated clicks.
   * @default true
   */
  toggle?: boolean | undefined;
  /**
   * Whether to ignore the logic for mouse input (for example, if `useHover()`
   * is also being used).
   * @default false
   */
  ignoreMouse?: boolean | undefined;
  /**
   * If already open from another event such as the `useHover()` Hook,
   * determines whether to keep the floating element open when clicking the
   * reference element for the first time.
   * @default true
   */
  stickIfOpen?: boolean | undefined;
  /**
   * Touch-only delay (ms) before opening. Useful to allow mobile viewport/keyboard to settle.
   * @default 0
   */
  touchOpenDelay?: number | undefined;
  /**
   * The reason for the click.
   * @default REASONS.triggerPress
   */
  reason?: typeof REASONS.triggerPress | typeof REASONS.inputPress | undefined;
}

/**
 * Opens or closes the floating element when clicking the reference element.
 * @see https://floating-ui.com/docs/useClick
 */
export function useClick(store: FloatingRootContext, props: UseClickProps = {}): ElementProps {
  const enabled = () => props.enabled ?? true;
  const eventOption = () => props.event ?? 'click';
  const toggle = () => props.toggle ?? true;
  const ignoreMouse = () => props.ignoreMouse ?? false;
  const stickIfOpen = () => props.stickIfOpen ?? true;
  const touchOpenDelay = () => props.touchOpenDelay ?? 0;
  const reason = () => props.reason ?? REASONS.triggerPress;

  const dataRef = store.context.dataRef;

  let pointerType: 'mouse' | 'pen' | 'touch' | 'virtual' | undefined;
  const frame = useAnimationFrame();
  const touchOpenTimeout = useTimeout();

  function setOpenWithTouchDelay(
    nextOpen: boolean,
    nativeEvent: MouseEvent,
    target: HTMLElement,
    eventPointerType: 'mouse' | 'pen' | 'touch' | 'virtual' | undefined,
  ) {
    const details = createChangeEventDetails(reason(), nativeEvent, target);
    const delay = touchOpenDelay();

    if (nextOpen && eventPointerType === 'touch' && delay > 0) {
      touchOpenTimeout.start(delay, () => {
        store.setOpen(true, details);
      });
    } else {
      store.setOpen(nextOpen, details);
    }
  }

  function getNextOpen(
    open: boolean,
    currentTarget: EventTarget | null,
    isClickLikeOpenEvent: (eventType: string | undefined) => boolean,
  ) {
    const openEvent = dataRef.current.openEvent;
    const hasClickedOnInactiveTrigger = store.select('domReferenceElement') !== currentTarget;

    if (open && hasClickedOnInactiveTrigger) {
      // Moving between triggers should always open the newly active one.
      return true;
    }

    if (!open) {
      // A closed popup should open on the next press.
      return true;
    }

    if (!toggle()) {
      // Non-toggle mode never closes on a repeated trigger press.
      return true;
    }

    if (openEvent && stickIfOpen()) {
      // Preserve hover/focus-opened popups until the matching click-like event closes them.
      return !isClickLikeOpenEvent(openEvent.type);
    }

    // Otherwise, a repeated click toggles the popup closed.
    return false;
  }

  const reference: NonNullable<ElementProps['reference']> = {
    onPointerDown(event: PointerEvent) {
      // Screen reader activations (Android TalkBack, desktop screen readers) report a
      // mouse-like `pointerType`, but `ignoreMouse` must not drop them: hover logic cannot
      // open for a virtual press since there is no real pointer movement to wait for.
      // Virtual `touch` presses (iOS VoiceOver) keep their type so `touchOpenDelay` applies.
      pointerType =
        isMouseLikePointerType(event.pointerType, true) && isVirtualPointerEvent(event)
          ? 'virtual'
          : (event.pointerType as typeof pointerType);
    },
    onMouseDown(event: MouseEvent) {
      const currentPointerType = pointerType;
      const nativeEvent = event;
      const open = store.select('open');

      // Ignore all buttons except for the "main" button.
      // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
      if (
        event.button !== 0 ||
        eventOption() === 'click' ||
        (isMouseLikePointerType(currentPointerType, true) && ignoreMouse())
      ) {
        return;
      }

      const nextOpen = getNextOpen(
        open,
        event.currentTarget,
        (openEventType) => openEventType === 'click' || openEventType === 'mousedown',
      );

      // Animations sometimes won't run on a typeable element if using a rAF.
      // Focus is always set on these elements. For touch, we may delay opening.
      // A screen reader press opens synchronously, so the popup's focus lands before the reader
      // re-syncs focus to its cursor, which would otherwise read as a stray move.
      const target = getTarget(nativeEvent);
      const isTypeable = isTypeableElement(target);

      if (isTypeable || currentPointerType === 'virtual') {
        // A virtual press may target a descendant of the trigger; the trigger is what opened.
        setOpenWithTouchDelay(
          nextOpen,
          nativeEvent,
          (isTypeable ? target : event.currentTarget) as HTMLElement,
          currentPointerType,
        );
        return;
      }

      // Capture the currentTarget before the rAF,
      // as it's set to null after the event handler completes.
      const eventCurrentTarget = event.currentTarget as HTMLElement;

      // Wait until focus is set on the element. This is an alternative to
      // `event.preventDefault()` to avoid :focus-visible from appearing when using a pointer.
      frame.request(() => {
        setOpenWithTouchDelay(nextOpen, nativeEvent, eventCurrentTarget, currentPointerType);
      });
    },
    onClick(event: MouseEvent) {
      const option = eventOption();
      if (option === 'mousedown-only') {
        return;
      }

      const currentPointerType = pointerType;

      if (option === 'mousedown' && currentPointerType) {
        pointerType = undefined;
        return;
      }

      if (isMouseLikePointerType(currentPointerType, true) && ignoreMouse()) {
        return;
      }

      const open = store.select('open');
      const nextOpen = getNextOpen(
        open,
        event.currentTarget,
        (openEventType) =>
          openEventType === 'click' ||
          openEventType === 'mousedown' ||
          openEventType === 'keydown' ||
          openEventType === 'keyup',
      );
      setOpenWithTouchDelay(
        nextOpen,
        event,
        event.currentTarget as HTMLElement,
        currentPointerType,
      );
    },
    onKeyDown() {
      pointerType = undefined;
    },
  };

  return {
    get reference() {
      return enabled() ? reference : undefined;
    },
  };
}
