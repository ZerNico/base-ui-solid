/**
 * Resolves an element that is either passed directly or through an accessor.
 * Replaces upstream's ref object resolution: Solid refs are callbacks, so elements are kept in
 * variables and exposed through accessors.
 */
export function resolveRef<T extends HTMLElement | null | undefined>(maybeRef: T | (() => T)): T {
  return typeof maybeRef === 'function' ? maybeRef() : maybeRef;
}
