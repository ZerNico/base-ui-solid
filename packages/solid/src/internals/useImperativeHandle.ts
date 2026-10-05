import { runWithOwner, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';

/**
 * Hands an imperative `handle` to an `actionsRef`-style callback prop.
 *
 * Port note: counterpart of `React.useImperativeHandle`. Public `actionsRef` props are callbacks
 * (like Solid's `ref`), not ref objects. The callback is read once and called once, synchronously
 * on setup, so the handle is available before ancestors' effects run (React assigns imperative
 * handles before them too). Like this port's `ref` props, it isn't called with `null` on disposal.
 * It runs without an owner, like Solid's ref callbacks, so it may write signals.
 */
export function useImperativeHandle<T>(
  ref: Accessor<((handle: T) => void) | undefined>,
  handle: T,
) {
  const callback = untrack(ref);
  if (callback) {
    runWithOwner(null, () => callback(handle));
  }
}
