import { createMemo } from 'solid-js';
import type { Accessor } from 'solid-js';

/**
 * Returns a previous value of its argument.
 *
 * Port note: takes an accessor and returns an accessor. The previous value changes only when the
 * value does (`Object.is`), like upstream's render-time state adjustment.
 *
 * @param value Current value.
 * @returns Previous value, or null if there is no previous value.
 */
export function usePreviousValue<T>(value: Accessor<T>): Accessor<T | null> {
  const state = createMemo<{ current: T; previous: T | null }>((previousState) => {
    const current = value();

    if (previousState === undefined) {
      return { current, previous: null };
    }

    if (!Object.is(current, previousState.current)) {
      return { current, previous: previousState.current };
    }

    return previousState;
  });

  return () => state().previous;
}
