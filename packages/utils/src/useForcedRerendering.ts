import { createSignal } from 'solid-js';

export interface ForcedRerendering {
  /**
   * Forces a rerender.
   */
  (): void;
  /**
   * Port note: Solid components don't rerender. Call `track()` in the reactive scopes (memos,
   * JSX) that upstream recomputes on every render, so they re-run when a rerender is forced.
   */
  track: () => void;
}

/**
 * Returns a function that forces a rerender.
 *
 * Port note: the returned function invalidates the computations that call its `track()` method
 * (see {@link ForcedRerendering}).
 */
export function useForcedRerendering(): ForcedRerendering {
  const [track, setState] = createSignal(undefined, { equals: false, ownedWrite: true });

  const rerender = (() => {
    setState(undefined);
  }) as ForcedRerendering;
  rerender.track = track;
  return rerender;
}
