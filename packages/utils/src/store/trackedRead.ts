/**
 * Port note: reads of `store.state` are untracked, like upstream's plain state
 * object. Only the selectors of `useStore` accessors (and the store's own bookkeeping) track the
 * derived keys they read (see `SolidStore`).
 */
let depth = 0;

export function runWithTrackedState<T>(fn: () => T): T {
  depth += 1;
  try {
    return fn();
  } finally {
    depth -= 1;
  }
}

export function isTrackingState() {
  return depth > 0;
}
