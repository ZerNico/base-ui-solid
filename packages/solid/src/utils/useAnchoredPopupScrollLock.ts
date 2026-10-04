import { createSignal } from 'solid-js';
import type { Accessor } from 'solid-js';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { useScrollLock } from '@base-ui-solid/utils/useScrollLock';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';

// Touch-opened popups normally avoid scroll locking so users can still swipe outside to dismiss.
// This hook re-enables scroll lock only when the popup is effectively full-width.
// Treat popups with up to 20px of total horizontal gutter as full-width so common ~10px side
// padding still locks scroll, since that leaves too little outside space for a reliable swipe.
const VIEWPORT_WIDTH_TOLERANCE_PX = 20;

/**
 * Manages scroll lock for anchored popups. For non-touch opens, scroll lock is applied when
 * enabled. For touch opens, scroll lock is applied only when the positioner width is effectively
 * viewport-sized.
 *
 * Port note: the parameters are accessors.
 */
export function useAnchoredPopupScrollLock(
  enabled: Accessor<boolean>,
  touchOpen: Accessor<boolean>,
  positionerElement: Accessor<HTMLElement | null>,
  referenceElement: Accessor<Element | null>,
) {
  const [touchOpenShouldLockScroll, setTouchOpenShouldLockScroll] = createSignal(false, {
    ownedWrite: true,
  });

  useIsoLayoutEffect(
    ([enabledValue, touchOpenValue, positionerElementValue]) => {
      if (!enabledValue || !touchOpenValue || positionerElementValue == null) {
        setTouchOpenShouldLockScroll(false);
        return;
      }

      const viewportWidth = ownerDocument(positionerElementValue).documentElement.clientWidth;
      const popupWidth = positionerElementValue.offsetWidth;

      setTouchOpenShouldLockScroll(
        viewportWidth > 0 &&
          popupWidth > 0 &&
          popupWidth >= viewportWidth - VIEWPORT_WIDTH_TOLERANCE_PX,
      );
    },
    () => [enabled(), touchOpen(), positionerElement()] as const,
  );

  useScrollLock(() => enabled() && (!touchOpen() || touchOpenShouldLockScroll()), referenceElement);
}
