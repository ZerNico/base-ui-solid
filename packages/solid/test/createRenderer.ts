import { createSignal, flush } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { afterEach, beforeEach, vi } from 'vitest';
import { render as renderSolid, flushMicrotasks } from './utils';

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
 * `render` is the regular `render` from `#test-utils`. `clockOptions` are passed to
 * `vi.useFakeTimers` (e.g. `{ shouldAdvanceTime: true }`).
 */
export function createRenderer(
  options: { clockOptions?: Parameters<typeof vi.useFakeTimers>[0] } = {},
) {
  const clock: Clock = {
    withFakeTimers() {
      beforeEach(() => {
        vi.useFakeTimers(options.clockOptions);
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

  // Port note: upstream setProps updates the existing fixture instead of remounting it.
  // Factories that need this pass the override accessor through a final JSX spread.
  async function render(
    ui: (overrides: Accessor<Record<string, any>>) => JSX.Element,
    renderOptions?: Parameters<typeof renderSolid>[1],
  ) {
    const [overrides, setOverrides] = createSignal<Record<string, any>>({});
    const result = await renderSolid(() => ui(overrides), renderOptions);
    async function setProps(nextProps: Record<string, any>) {
      setOverrides((previous) => ({ ...previous, ...nextProps }));
      await flushMicrotasks();
    }
    return { ...result, setProps };
  }

  return { render, clock };
}
