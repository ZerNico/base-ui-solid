import { createSignal, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { InteractionType } from '@base-ui-solid/utils/useEnhancedClickHandler';
import { useEnhancedClickHandler } from '@base-ui-solid/utils/useEnhancedClickHandler';
import { platform } from '@base-ui-solid/utils/platform';

export function useOpenMethodTriggerProps(
  open: boolean | (() => boolean),
  setOpenMethod: (interactionType: InteractionType | null) => void,
) {
  const handleTriggerClick = (_: MouseEvent, interactionType: InteractionType) => {
    const isOpen = typeof open === 'function' ? untrack(open) : open;

    if (!isOpen) {
      setOpenMethod(
        interactionType ||
          // On iOS Safari, the hitslop around touch targets means tapping outside an element's
          // bounds does not fire `pointerdown` but does fire `mousedown`. The `interactionType`
          // will be "" in that case.
          (platform.os.ios ? 'touch' : ''),
      );
    }
  };

  const { onClick, onPointerDown } = useEnhancedClickHandler(handleTriggerClick);

  return {
    onClick,
    onPointerDown,
  };
}

/**
 * Determines the interaction type (keyboard, mouse, touch, etc.) that opened the component.
 *
 * Port note: `open` and the returned `openMethod` are accessors; `triggerProps` is stable.
 *
 * @param open The open state of the component.
 */
export function useOpenInteractionType(open: Accessor<boolean>) {
  // Port note: upstream resets the method from an effect when `open` becomes `false`. A writable
  // memo applies that rule when `open` changes, and otherwise keeps the method the trigger wrote.
  let wasOpen = untrack(open);
  const [openMethod, setOpenMethodState] = createSignal<InteractionType | null>(
    (previous) => {
      const isOpen = open();
      const closed = wasOpen && !isOpen;
      wasOpen = isOpen;
      return closed ? null : (previous ?? null);
    },
    { ownedWrite: true },
  );
  const setOpenMethod = (value: InteractionType | null) => setOpenMethodState(() => value);

  const triggerProps = useOpenMethodTriggerProps(open, setOpenMethod);

  return {
    openMethod,
    triggerProps,
  };
}
