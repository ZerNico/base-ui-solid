import { flush } from 'solid-js';

/**
 * Creates a queue that runs callbacks and applies their updates synchronously before the browser
 * paints, so that the browser doesn't paint an intermediate frame:
 * https://github.com/mui/base-ui/issues/979
 * Callbacks that become ready within the same microtask checkpoint are batched into a single
 * flush: https://github.com/mui/base-ui/issues/5481
 * A callback runs before the updates of earlier callbacks in its batch have been applied, so
 * callers that read DOM or state another caller can change need their own queue.
 */
export function createFlushBeforePaint() {
  let pendingCallbacks: Array<() => void> | null = null;

  return function flushBeforePaint(fn: () => void) {
    if (!pendingCallbacks) {
      const callbacks: Array<() => void> = [];
      pendingCallbacks = callbacks;
      queueMicrotask(() => {
        pendingCallbacks = null;
        for (const callback of callbacks) {
          callback();
        }
        flush();
      });
    }
    pendingCallbacks.push(fn);
  };
}
