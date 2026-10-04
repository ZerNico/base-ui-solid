import { isElement } from '@floating-ui/utils/dom';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { getTarget, isInteractiveElement } from '../../floating-ui-solid/utils/element';
import type { ComboboxStore } from '../store';

export function handleInputPress(
  event: MouseEvent & { baseUIHandlerPrevented?: boolean | undefined },
  store: ComboboxStore,
  disabled: boolean,
  shouldIgnoreTarget?: ((target: Element | null) => boolean) | undefined,
) {
  if (event.baseUIHandlerPrevented) {
    return;
  }

  // Port note: events are native, so the target is read from `event` itself.
  const target = getTarget(event);
  const targetElement = isElement(target) ? target : null;
  if (
    targetElement !== event.currentTarget &&
    (shouldIgnoreTarget?.(targetElement) || isInteractiveElement(targetElement))
  ) {
    return;
  }

  event.preventDefault();

  if (disabled) {
    return;
  }

  store.context.inputRef.current?.focus();

  if (store.state.openOnInputClick) {
    store.context.setOpen(true, createChangeEventDetails(REASONS.inputPress, event));
  }
}
