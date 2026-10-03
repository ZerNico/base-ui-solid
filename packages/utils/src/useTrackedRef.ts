import { createSignal } from 'solid-js';

export interface TrackedRef<T> {
  current: T;
}

/**
 * A React-style ref (`.current` is updated synchronously) whose reads are also tracked.
 *
 * Upstream reads some refs during render, relying on another state update to re-render with the
 * latest value. In Solid there's no re-render, so reading `.current` in a memo or JSX subscribes
 * to writes instead.
 */
export function useTrackedRef<T>(initialValue: T): TrackedRef<T> {
  let value = initialValue;
  const [track, trigger] = createSignal(undefined, { equals: false, ownedWrite: true });

  return {
    get current() {
      track();
      return value;
    },
    set current(nextValue: T) {
      if (!Object.is(value, nextValue)) {
        value = nextValue;
        trigger(undefined);
      }
    },
  };
}
