import type { RefObject } from '@base-ui-solid/utils/refObject';

/**
 * If the provided argument is a ref object, returns its `current` value.
 * Otherwise, returns the argument itself.
 *
 * Port note: also resolves accessors. Solid refs are callbacks, so elements are often kept in
 * variables and exposed through accessors; ref objects (`RefObject`) are kept where upstream's
 * API takes them (e.g. `FloatingFocusManager`'s `initialFocus`).
 */
export function resolveRef<T extends HTMLElement | null | undefined>(
  maybeRef: T | RefObject<T> | (() => T),
): T {
  if (maybeRef == null) {
    return maybeRef as T;
  }

  if (typeof maybeRef === 'function') {
    return maybeRef();
  }

  return 'current' in maybeRef ? maybeRef.current : maybeRef;
}
