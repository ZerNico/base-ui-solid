import { createEffect, createMemo, untrack } from 'solid-js';
import { runCleanup } from './cleanup';
import { IS_DEV } from './isDev';

export type EffectCallback<Deps extends readonly unknown[]> = (deps: Deps) => void | (() => void);

export interface IsoLayoutEffectOptions {
  /**
   * Debug label for Solid's diagnostics. Defaults to `BaseUI.useIsoLayoutEffect` in development.
   */
  name?: string | undefined;
  /**
   * Marks an effect that reads the DOM (layout, focus, rendered items) and writes what it read.
   *
   * Port note: Solid's diagnostics treat an effect whose apply function takes no arguments as a
   * measurement, so its late write is reported as advisory rather than escalated as a copied value.
   * With this option the apply reads the dependencies itself to keep that shape. Only use it where
   * the write depends on the DOM, so effects that copy state stay visible to the diagnostics.
   */
  measuring?: boolean | undefined;
}

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
 * Port note: the third argument is a debug label for Solid's diagnostics (the `name` option of the
 * effect, and `<name>.deps` for its dependency memo), or options with that label (see
 * `IsoLayoutEffectOptions`). In development the label defaults to `BaseUI.useIsoLayoutEffect`, so
 * diagnostics about the library's effects don't show up as anonymous effects in the user's
 * component tree. Production builds ignore names, so pass one only when `IS_DEV` is true.
 */
export function useIsoLayoutEffect<const Deps extends readonly unknown[]>(
  effect: EffectCallback<Deps>,
  deps: () => Deps,
  nameOrOptions?: string | IsoLayoutEffectOptions | undefined,
) {
  const options = typeof nameOrOptions === 'object' ? nameOrOptions : { name: nameOrOptions };
  const name = options.name ?? (IS_DEV ? 'BaseUI.useIsoLayoutEffect' : undefined);
  // Solid effects re-run whenever their compute re-runs, so dependency equality is enforced by
  // a memo in front of the effect.
  const memoizedDeps = createMemo(
    deps,
    name === undefined ? { equals: areDepsEqual } : { equals: areDepsEqual, name: `${name}.deps` },
  );
  const run = (value: Deps) => {
    // Untracked, like reading from a React render closure. This also marks the reads as
    // intentional for Solid's `STRICT_READ_UNTRACKED` diagnostic.
    const cleanup = untrack(() => effect(value));
    return cleanup ? () => runCleanup(cleanup) : undefined;
  };
  createEffect(
    memoizedDeps,
    // The measuring apply must declare no parameters (see `IsoLayoutEffectOptions.measuring`).
    options.measuring ? () => run(untrack(memoizedDeps)) : run,
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
