import { flush } from 'solid-js';
import { useAnimationFrame } from '@base-ui-solid/utils/useAnimationFrame';
import { NOOP } from '@base-ui-solid/utils/empty';
import { resolveRef } from '../utils/resolveRef';
import { getFiniteAnimations } from '../utils/getFiniteAnimations';
import * as TransitionStatusDataAttributes from './TransitionStatusDataAttributes';

let pendingCallbacks: Array<() => void> | null = null;

/**
 * Runs the callback and applies its updates synchronously before the browser paints, so that the
 * browser doesn't paint an intermediate frame: https://github.com/mui/base-ui/issues/979
 * Callbacks that become ready within the same microtask checkpoint (e.g. multiple elements
 * whose animations finish together) are batched into a single flush:
 * https://github.com/mui/base-ui/issues/5481
 */
function flushBeforePaint(fn: () => void) {
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
}

/**
 * Executes a function once all animations have finished on the provided element.
 * If an animation is canceled, waits for any replacement animations before executing.
 * @param elementOrAccessor - The element to watch for animations.
 * @param waitForStartingStyleRemoved - Whether to wait for [data-starting-style] to be removed before checking for animations.
 * @param batch - Whether completions ready in the same microtask may be coalesced into a single
 * flush. A batched callback runs before earlier callbacks' updates have been applied, so only
 * opt in when the callback doesn't read state that another completion can change.
 * @returns A function that takes a callback to execute once all animations have finished, and an optional AbortSignal to abort the callback
 */
export function useAnimationsFinished(
  elementOrAccessor: HTMLElement | null | (() => HTMLElement | null | undefined),
  waitForStartingStyleRemoved: boolean | (() => boolean) = false,
  batch = false,
) {
  const frame = useAnimationFrame();

  return (
    /**
     * A function to execute once all animations have finished.
     */
    fnToExecute: () => void,
    /**
     * An optional [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) that
     * can be used to abort `fnToExecute` before all the animations have finished.
     * @default null
     */
    signal: AbortSignal | null = null,
  ) => {
    frame.cancel();

    const element = resolveRef(elementOrAccessor);
    if (element == null) {
      return;
    }

    const resolvedElement = element;

    const done = () => {
      if (!batch) {
        // Synchronously apply the updates (e.g. unmounting the component) so that the browser
        // doesn't paint: https://github.com/mui/base-ui/issues/979
        // Each callback gets its own flush so that later completions observe the updates caused
        // by earlier ones.
        fnToExecute();
        flush();
        return;
      }

      flushBeforePaint(() => {
        // Re-check at flush time: the signal may abort between queueing and the flush.
        if (!signal?.aborted) {
          fnToExecute();
        }
      });
    };

    if (
      typeof resolvedElement.getAnimations !== 'function' ||
      (globalThis as any).BASE_UI_ANIMATIONS_DISABLED
    ) {
      fnToExecute();
      return;
    }

    function exec() {
      // Discard fulfilled Animation values so unfinished animations cannot retain their targets.
      Promise.all(
        getFiniteAnimations(resolvedElement).map((animation) => animation.finished.then(NOOP)),
      ).then(
        () => {
          if (!signal?.aborted) {
            done();
          }
        },
        () => {
          if (signal?.aborted) {
            return;
          }

          const currentAnimations = getFiniteAnimations(resolvedElement);

          if (
            currentAnimations.some(
              (animation) => animation.pending || animation.playState !== 'finished',
            )
          ) {
            // Sometimes animations can be aborted because a property they depend on changes while the animation plays.
            // In such cases, we need to re-check if any new animations have started.
            exec();
            return;
          }

          done();
        },
      );
    }

    const shouldWaitForStartingStyleRemoved =
      typeof waitForStartingStyleRemoved === 'function'
        ? waitForStartingStyleRemoved()
        : waitForStartingStyleRemoved;

    if (shouldWaitForStartingStyleRemoved) {
      const startingStyleAttribute = TransitionStatusDataAttributes.startingStyle;

      // If `[data-starting-style]` isn't present, fall back to waiting one more frame
      // to give "open" animations a chance to be registered.
      if (!resolvedElement.hasAttribute(startingStyleAttribute)) {
        frame.request(exec);
        return;
      }

      // Wait for `[data-starting-style]` to have been removed.
      const attributeObserver = new MutationObserver(() => {
        if (!resolvedElement.hasAttribute(startingStyleAttribute)) {
          attributeObserver.disconnect();
          exec();
        }
      });

      attributeObserver.observe(resolvedElement, {
        attributes: true,
        attributeFilter: [startingStyleAttribute],
      });

      signal?.addEventListener('abort', () => attributeObserver.disconnect(), { once: true });
      return;
    }

    frame.request(exec);
  };
}
