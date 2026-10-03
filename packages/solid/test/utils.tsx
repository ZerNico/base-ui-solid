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
