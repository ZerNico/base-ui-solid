import { flush } from 'solid-js';
import { afterEach, beforeEach, vi } from 'vitest';
import { render } from './utils';

export interface Clock {
  /**
   * Installs Vitest's fake timers for every test of the enclosing `describe`.
   */
  withFakeTimers(): void;
  /**
   * Advances the fake clock by `ms`, running the timers (and the microtasks they queue) that are
   * due, then flushes Solid's pending updates.
   */
  tickAsync(ms: number): Promise<void>;
  /**
   * Advances the fake clock by `ms`, running the timers that are due, then flushes Solid's pending
   * updates.
   */
  tick(ms: number): void;
}

/**
 * Counterpart of the subset of `@mui/internal-test-utils`' `createRenderer` that upstream tests
 * use for fake timers: `const { render, clock } = createRenderer(); clock.withFakeTimers();`.
 * `render` is the regular `render` from `#test-utils`.
 */
export function createRenderer() {
  const clock: Clock = {
    withFakeTimers() {
      beforeEach(() => {
        vi.useFakeTimers();
      });
      afterEach(() => {
        vi.useRealTimers();
      });
    },
    async tickAsync(ms: number) {
      await vi.advanceTimersByTimeAsync(ms);
      flush();
    },
    tick(ms: number) {
      vi.advanceTimersByTime(ms);
      flush();
    },
  };

  return { render, clock };
}
