import type { RefObject } from '@base-ui-solid/utils/refObject';
import { flush } from 'solid-js';
import { getTabbableNearElement, isOutsideEvent } from '../../floating-ui-react/utils';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';

/**
 * Minimal store interface required by the focus guard hook.
 * Both PopoverStore and MenuStore satisfy this interface.
 */
interface TriggerFocusGuardStore {
  setOpen(open: boolean, eventDetails: BaseUIChangeEventDetails<typeof REASONS.focusOut>): void;
  select(key: 'positionerElement'): HTMLElement | null;
  context: {
    /**
     * Shared with the focus manager through `getInsideElements` so that blurring the trigger
     * onto this guard does not close the popup before the guard's own focus handler runs.
     */
    readonly beforeTriggerFocusGuardRef: RefObject<HTMLElement | null>;
    readonly beforeContentFocusGuardRef: RefObject<HTMLElement | null>;
    readonly triggerFocusTargetRef: RefObject<HTMLElement | null>;
  };
}

/**
 * Provides focus guard handlers for popup triggers (Popover, Menu).
 *
 * When the popup is open, invisible focus guard elements are placed before and after
 * the trigger. These handlers close the popup and move focus to the appropriate
 * tabbable element when the guards receive focus (i.e. when the user tabs out).
 */
export function useTriggerFocusGuards(
  store: TriggerFocusGuardStore,
  triggerElementRef: RefObject<HTMLElement | null>,
) {
  function closeAndFocus(
    event: FocusEvent,
    direction: 1 | -1,
    positionerElement: HTMLElement | null,
  ) {
    const guard = event.currentTarget as HTMLElement;

    // Port note: `ReactDOM.flushSync(...)`.
    store.setOpen(false, createChangeEventDetails(REASONS.focusOut, event, guard));
    flush();

    // The close callback may change the tab order. Resolve it after the flush, using
    // the trigger as the anchor if the guard unmounted, even when its tabIndex is -1.
    getTabbableNearElement(
      guard.isConnected ? guard : triggerElementRef.current,
      direction,
      positionerElement,
    )?.focus();
  }

  function handlePreFocusGuardFocus(event: FocusEvent) {
    closeAndFocus(event, -1, store.select('positionerElement'));
  }

  function handleFocusTargetFocus(event: FocusEvent) {
    const positionerElement = store.select('positionerElement');
    if (positionerElement && isOutsideEvent(event, positionerElement)) {
      store.context.beforeContentFocusGuardRef.current?.focus();
    } else {
      closeAndFocus(event, 1, positionerElement);
    }
  }

  return { handlePreFocusGuardFocus, handleFocusTargetFocus };
}
