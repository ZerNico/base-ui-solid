import { untrack } from 'solid-js';

/**
 * Port note: Solid components render once, so `fn` is called immediately (untracked).
 */
export function useOnFirstRender(fn: Function) {
  untrack(() => fn());
}
