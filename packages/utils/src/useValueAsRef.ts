import { untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import { useIsoLayoutEffect } from './useIsoLayoutEffect';

/**
 * Untracks the provided value by turning it into a ref to remove its reactivity.
 *
 * Used to access the passed value inside effects without causing the effect to re-run when the value changes.
 *
 * Port note: takes an accessor. Like upstream, `current` is updated in a layout effect, and only
 * when the value changes (upstream copies it after every render).
 */
export function useValueAsRef<T>(value: Accessor<T>): { current: T } {
  const latest = { current: untrack(value) };

  useIsoLayoutEffect(
    ([next]) => {
      latest.current = next;
    },
    () => [value()],
  );

  return latest;
}
