import { flush, onCleanup } from 'solid-js';
import { useAnimationFrame } from '@base-ui-solid/utils/useAnimationFrame';
import { NOOP } from '@base-ui-solid/utils/empty';
import { resolveRef } from '../utils/resolveRef';
import { isFiniteAnimation } from '../utils/getFiniteAnimations';
import * as TransitionStatusDataAttributes from './TransitionStatusDataAttributes';
import { createFlushBeforePaint } from './createFlushBeforePaint';

/**
 * Returns a function that queues items and flushes them together in a microtask.
 */
function createMicrotaskQueue<T>(flushItems: (items: T[]) => void) {
  let pending: T[] = [];
  return (item: T) => {
    if (!pending.length) {
      queueMicrotask(() => {
        const items = pending;
        pending = [];
        flushItems(items);
      });
    }
    pending.push(item);
  };
}

/**
 * Passes each element's animations to its callback in a microtask.
 * In Blink, `element.getAnimations()` returns early for an element without animations, but
 * otherwise sorts every animation in the tree. Once an element with animations is found, the
 * remaining elements of its tree are served by a single `getAnimations()` call on the tree's root.
 * A root scan for a single remaining element cannot save a sort, so it is skipped.
 */
const getAnimationsBatched = createMicrotaskQueue<
  [element: Element, callback: (animations: Animation[]) => void]
>((lookups) => {
  const animationsByElement = new Map<Element, Animation[] | undefined>();
  for (const [element] of lookups) {
    animationsByElement.set(element, undefined);
  }
  let remaining = animationsByElement.size;
  let animatedRoot: (Node & Partial<DocumentOrShadowRoot>) | undefined;
  let animationsByTarget: Map<Element | null, Animation[]> | undefined;

  for (const [element, callback] of lookups) {
    let animations = animationsByElement.get(element);
    if (!animations) {
      remaining -= 1;
      const root: Node & Partial<DocumentOrShadowRoot> = element.getRootNode();
      if (root === animatedRoot && !animationsByTarget) {
        animationsByTarget = new Map();
        for (const animation of root.getAnimations!()) {
          const effect = animation.effect as KeyframeEffect;
          // `element.getAnimations()` excludes animations of the element's pseudo-elements.
          if (!effect.pseudoElement) {
            animationsByTarget.set(effect.target, [
              ...(animationsByTarget.get(effect.target) ?? []),
              animation,
            ]);
          }
        }
      }
      animations =
        root === animatedRoot ? (animationsByTarget!.get(element) ?? []) : element.getAnimations();
      if (remaining > 1 && animations.length && element.isConnected && root.getAnimations) {
        animatedRoot ??= root;
      }
      animationsByElement.set(element, animations);
    }
    callback(animations);
  }
});

const flushBeforePaint = createFlushBeforePaint();

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
  let frameRequest = 0;
  let disposed = false;
  onCleanup(() => {
    disposed = true;
  });

  /**
   * Port note: upstream checks for animations one frame after the effect that asks for it. React
   * runs the effects of children before those of their parents, so by then the elements rendered
   * inside the popup (e.g. a `render` component that animates the popup) have started their
   * animations, or requested the frame they start them in. Solid runs the effects of a flush in
   * creation order, parents first, so the frame is requested once the flush is over.
   */
  const requestFrameAfterFlush = (fn: () => void) => {
    const request = frameRequest;
    queueMicrotask(() => {
      if (!disposed && request === frameRequest) {
        frame.request(fn);
      }
    });
  };

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
    frameRequest += 1;

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
      getAnimationsBatched([resolvedElement, waitForAnimations]);
    }

    function waitForAnimations(animations: Animation[]) {
      // Discard fulfilled Animation values so unfinished animations cannot retain their targets.
      Promise.all(
        animations.filter(isFiniteAnimation).map((animation) => animation.finished.then(NOOP)),
      ).then(
        () => {
          if (!signal?.aborted) {
            done();
          }
        },
        () => {
          // Sometimes animations can be aborted because a property they depend on changes while
          // the animation plays. Wait for the element's current animations, which include any
          // replacement.
          if (!signal?.aborted) {
            exec();
          }
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
        requestFrameAfterFlush(exec);
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

    requestFrameAfterFlush(exec);
  };
}
