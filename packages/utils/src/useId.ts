import { createUniqueId } from 'solid-js';

/**
 * Returns a stable id that matches between server-rendered and hydrated trees.
 *
 * @example <div id={useId()} />
 * @param idOverride
 * @returns {string}
 */
export function useId(idOverride?: string, prefix?: string): string {
  const id = createUniqueId();
  return idOverride ?? (prefix ? `${prefix}-${id}` : id);
}
