import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { platform } from '@base-ui-solid/utils/platform';
import { mergeCleanups } from '@base-ui-solid/utils/mergeCleanups';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { getWindow, isElement, isHTMLElement } from '@floating-ui/utils/dom';
import type { ElementProps, FloatingRootContext } from '../types';
import { createAttribute } from '../utils/createAttribute';
import {
  activeElement,
  contains,
  getTarget,
  isTargetInsideEnabledTrigger,
  isTypeableElement,
  matchesFocusVisible,
} from '../utils/element';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { FloatingUIOpenChangeDetails } from '../../internals/types';

const isMacSafari = platform.os.mac && platform.engine.webkit;

/**
 * Port note: read lazily like Solid props (`props.x`), so pass a props-like object with getters
 * for reactive options.
 */
export interface UseFocusProps {
  /**
   * Whether the Hook is enabled, including all internal Effects and event
   * handlers.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * Waits for the specified time before opening.
   * @default undefined
   */
  delay?: number | undefined;
}

/**
 * Opens the floating element while the reference element has focus, like CSS
 * `:focus`.
 * @see https://floating-ui.com/docs/useFocus
 */
export function useFocus(store: FloatingRootContext, props: UseFocusProps = {}): ElementProps {
  const enabled = () => props.enabled ?? true;
  const delay = () => props.delay;

  const { events, dataRef } = store.context;

  let blockFocus = false;
  // Track which reference should be blocked from re-opening after Escape/press dismissal.
  let blockedReference: Element | null = null;
  let keyboardModality = true;

  const timeout = useTimeout();

  useEffect(
    ([isEnabled]) => {
      const domReference = store.select('domReferenceElement');

      if (!isEnabled) {
        return undefined;
      }

      const win = getWindow(domReference);

      // If the reference was focused and the user left the tab/window, and the
      // floating element was not open, the focus should be blocked when they
      // return to the tab/window.
      function onBlur() {
        const currentDomReference = store.select('domReferenceElement');
        if (
          !store.select('open') &&
          isHTMLElement(currentDomReference) &&
          currentDomReference === activeElement(ownerDocument(currentDomReference))
        ) {
          blockFocus = true;
          blockedReference = currentDomReference;
        }
      }

      function onKeyDown() {
        keyboardModality = true;
      }

      function onPointerDown() {
        keyboardModality = false;
      }

      return mergeCleanups(
        addEventListener(win, 'blur', onBlur),
        isMacSafari && addEventListener(win, 'keydown', onKeyDown, true),
        isMacSafari && addEventListener(win, 'pointerdown', onPointerDown, true),
      );
    },
    () => [enabled()],
  );

  useEffect(
    ([isEnabled]) => {
      if (!isEnabled) {
        return undefined;
      }

      function onOpenChangeLocal(details: FloatingUIOpenChangeDetails) {
        if (details.reason === REASONS.triggerPress || details.reason === REASONS.escapeKey) {
          const referenceElement = store.select('domReferenceElement');
          if (isElement(referenceElement)) {
            blockedReference = referenceElement;
            blockFocus = true;
          }
        }
      }

      events.on('openchange', onOpenChangeLocal);
      return () => {
        events.off('openchange', onOpenChangeLocal);
      };
    },
    () => [enabled()],
  );

  function resetBlockedFocus() {
    blockFocus = false;
    blockedReference = null;
  }

  // Port note: React's `onFocus`/`onBlur` bubble, so they map to `onFocusIn`/`onFocusOut`.
  const reference: NonNullable<ElementProps['reference']> = {
    onMouseLeave() {
      resetBlockedFocus();
    },
    onFocusIn(event: FocusEvent) {
      const focusTarget = event.currentTarget as Element;

      if (blockFocus) {
        if (blockedReference === focusTarget) {
          return;
        }

        resetBlockedFocus();
      }

      const target = getTarget(event);

      if (isElement(target)) {
        // Safari fails to match `:focus-visible` if focus was initially
        // outside the document.
        if (isMacSafari && !event.relatedTarget) {
          if (!keyboardModality && !isTypeableElement(target)) {
            return;
          }
        } else if (!matchesFocusVisible(target)) {
          return;
        }
      }

      const movedFromOtherEnabledTrigger = isTargetInsideEnabledTrigger(
        event.relatedTarget,
        store.context.triggerElements,
      );

      const nativeEvent = event;
      // Capture the currentTarget before the timeout, as it's reset after the event handler
      // completes.
      const currentTarget = focusTarget;
      const openDelay = delay();

      if ((store.select('open') && movedFromOtherEnabledTrigger) || !openDelay) {
        store.setOpen(
          true,
          createChangeEventDetails(REASONS.triggerFocus, nativeEvent, currentTarget as HTMLElement),
        );
        return;
      }

      timeout.start(openDelay, () => {
        if (blockFocus) {
          return;
        }

        store.setOpen(
          true,
          createChangeEventDetails(REASONS.triggerFocus, nativeEvent, currentTarget as HTMLElement),
        );
      });
    },
    onFocusOut(event: FocusEvent) {
      resetBlockedFocus();

      const relatedTarget = event.relatedTarget;
      const nativeEvent = event;

      // Hit the non-modal focus management portal guard. Focus will be
      // moved into the floating element immediately after.
      const movedToFocusGuard =
        isElement(relatedTarget) &&
        relatedTarget.hasAttribute(createAttribute('focus-guard')) &&
        relatedTarget.getAttribute('data-type') === 'outside';

      // Wait for the window blur listener to fire.
      timeout.start(0, () => {
        const domReference = store.select('domReferenceElement');
        const activeEl = activeElement(ownerDocument(domReference));

        // Focus left the page, keep it open.
        if (!relatedTarget && activeEl === domReference) {
          return;
        }

        // When focusing the reference element (e.g. regular click), then
        // clicking into the floating element, prevent it from hiding.
        // Note: it must be focusable, e.g. `tabindex="-1"`.
        // We can not rely on relatedTarget to point to the correct element
        // as it will only point to the shadow host of the newly focused element
        // and not the element that actually has received focus if it is located
        // inside a shadow root.
        if (
          contains(dataRef.current.floatingContext?.refs.floating.current, activeEl) ||
          contains(domReference, activeEl) ||
          movedToFocusGuard
        ) {
          return;
        }

        // If the next focused element is one of the triggers, do not close
        // the floating element. The focus handler of that trigger will
        // handle the open state.
        const nextFocusedElement = relatedTarget ?? activeEl;
        if (isTargetInsideEnabledTrigger(nextFocusedElement, store.context.triggerElements)) {
          return;
        }

        store.setOpen(false, createChangeEventDetails(REASONS.triggerFocus, nativeEvent));
      });
    },
  };

  return {
    get reference() {
      return enabled() ? reference : undefined;
    },
    get trigger() {
      return enabled() ? reference : undefined;
    },
  };
}
