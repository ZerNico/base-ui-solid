import { createEffect, createMemo, untrack } from 'solid-js';
import { runCleanup } from './cleanup';
import { IS_DEV } from './isDev';

export type EffectCallback<Deps extends readonly unknown[]> = (deps: Deps) => void | (() => void);

/**
 * Port of React's `useEffect(effect, deps)` semantics on top of Solid's split effects.
 *
 * `deps` runs in the tracked compute phase; `effect` runs untracked after the render queue
 * flushes (before paint) and only when a dependency changed (`Object.is`), exactly like React.
 * The returned cleanup runs before the next run and on disposal, and may write reactive state
 * (see `runCleanup`).
 *
 * Read reactive values inside `deps` and use the values passed to `effect` — reads inside
 * `effect` are not tracked.
 *
 * Port note: `name` is an optional debug label for Solid's diagnostics (the `name` option of the
 * effect, and `<name>.deps` for its dependency memo). In development it defaults to
 * `BaseUI.useIsoLayoutEffect`, so diagnostics about the library's effects don't show up as
 * anonymous effects in the user's component tree. Production builds ignore names, so pass one
 * only when `IS_DEV` is true.
 */
export function useIsoLayoutEffect<const Deps extends readonly unknown[]>(
  effect: EffectCallback<Deps>,
  deps: () => Deps,
  name: string | undefined = IS_DEV ? 'BaseUI.useIsoLayoutEffect' : undefined,
) {
  // Solid effects re-run whenever their compute re-runs, so dependency equality is enforced by
  // a memo in front of the effect.
  const memoizedDeps = createMemo(
    deps,
    name === undefined ? { equals: areDepsEqual } : { equals: areDepsEqual, name: `${name}.deps` },
  );
  // Untracked, like reading from a React render closure. This also marks the reads as
  // intentional for Solid's `STRICT_READ_UNTRACKED` diagnostic.
  createEffect(
    memoizedDeps,
    (value) => {
      const cleanup = untrack(() => effect(value));
      return cleanup ? () => runCleanup(cleanup) : undefined;
    },
    name === undefined ? undefined : { name },
  );
}

/**
 * React's `useEffect` and `useLayoutEffect` both map to Solid's effect phase, which runs after
 * the DOM has been updated and before the browser paints.
 */
export const useEffect = useIsoLayoutEffect;

function areDepsEqual(a: readonly unknown[], b: readonly unknown[]) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (!Object.is(a[i], b[i])) {
      return false;
    }
  }
  return true;
}
