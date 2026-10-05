import { flush } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { render as solidRender } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';

export { screen, fireEvent, waitFor } from '@solidjs/testing-library';

/**
 * Lets queued microtasks (Solid's update batches, promise callbacks) run, then flushes Solid.
 */
export async function flushMicrotasks() {
  await new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });
  flush();
}

export function waitForAnimationFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

/**
 * Counterpart of upstream's `createRenderer().render`.
 */
export async function render(ui: () => JSX.Element, options?: { container?: HTMLElement }) {
  const user = userEvent.setup();
  const result = solidRender(ui, options);
  await flushMicrotasks();
  return { user, ...result };
}

/** Port note: applies pending Solid updates after an imperative upstream test action. */
export function act<T>(callback: () => T | Promise<T>): Promise<T> {
  const result = callback();
  flush();
  return Promise.resolve(result).then(async (value) => {
    await flushMicrotasks();
    return value;
  });
}

/**
 * Returns a callback that stores what it receives in `ref.current`.
 *
 * Port note: public `actionsRef`/`inputRef` props are callbacks in the port, not ref objects.
 * Tests keep upstream's ref objects to read the handle and pass `refCallback(ref)` to the prop.
 */
export function refCallback<T>(ref: { current: T | null }): (value: any) => void {
  return (value: T | null) => {
    ref.current = value;
  };
}
