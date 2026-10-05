import { createSignal, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { AnimationFrame } from '@base-ui-solid/utils/useAnimationFrame';

/**
 * Applies a status update made in an animation frame after the browser has rendered that frame.
 *
 * Port note: React applies a state update made in an animation frame callback in a later task,
 * after the browser has rendered the frame. Solid applies it in a microtask, before the frame is
 * rendered, so the current status (e.g. `starting` on a just-mounted element, or the measured size
 * before `ending`) would never be styled and CSS transitions would have nothing to start from.
 * Deferring the write to a task keeps upstream's timing.
 * @returns A function that cancels the update.
 */
function requestFrameUpdate(update: () => void) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const frame = AnimationFrame.request(() => {
    timeout = setTimeout(update);
  });

  return () => {
    AnimationFrame.cancel(frame);
    clearTimeout(timeout);
  };
}

export type TransitionStatus = 'starting' | 'ending' | 'idle' | undefined;

interface TransitionState {
  mounted: boolean;
  transitionStatus: TransitionStatus;
}

/**
 * Provides a status string for CSS animations.
 * @param open - a boolean that determines if the element is open.
 * @param enableIdleState - a boolean that enables the `'idle'` state between `'starting'` and `'ending'`
 * @param deferEndingState - a boolean that delays the `'ending'` state by a frame
 * @param animateInitialOpen - a boolean that makes an element which mounts already open still go
 *   through `'starting'`. Off by default so content that was open on the first render (a
 *   `defaultOpen` popup on page load, SSR'd markup) doesn't animate in.
 * @param unmountWhen - Port note: an accessor that resets `mounted` to `false` while it's `true`
 *   (e.g. when the containing popup unmounts first). Upstream callers adjust that during render
 *   with `setMounted(false)`; here it's one of the render-phase rules.
 */
export function useTransitionStatus(
  open: Accessor<boolean>,
  enableIdleState: boolean = false,
  deferEndingState: boolean = false,
  animateInitialOpen: boolean = false,
  unmountWhen?: Accessor<boolean>,
) {
  // Upstream adjusts `mounted` and `transitionStatus` during render. Here the same rules are
  // applied by a writable memo: they run whenever `open` changes, and after every write.
  function applyRenderPhaseRules(
    state: TransitionState,
    isOpen: boolean,
    shouldUnmount: boolean,
  ): TransitionState {
    let { mounted, transitionStatus } = state;

    if (shouldUnmount && mounted) {
      mounted = false;
    }

    if (isOpen && !mounted) {
      mounted = true;
      transitionStatus = 'starting';
    }

    if (!isOpen && mounted && transitionStatus !== 'ending' && !deferEndingState) {
      transitionStatus = 'ending';
    }

    if (!isOpen && !mounted && transitionStatus === 'ending') {
      transitionStatus = undefined;
    }

    // Port note: upstream sets `'starting'` from the layout effect below (an open, mounted element
    // that isn't idle yet, e.g. reopened while ending). Applying it here gives the same status
    // without a second pass.
    if (enableIdleState && isOpen && mounted && transitionStatus !== 'idle') {
      transitionStatus = 'starting';
    }

    return mounted === state.mounted && transitionStatus === state.transitionStatus
      ? state
      : { mounted, transitionStatus };
  }

  const [state, setState] = createSignal<TransitionState>(
    (prev) => {
      const isOpen = open();
      // Starting at `mounted: false` while open lets the `open && !mounted` rule run on the first
      // computation, which is what produces the `'starting'` phase.
      const initial: TransitionState = prev ?? {
        mounted: isOpen && !animateInitialOpen,
        transitionStatus: isOpen && enableIdleState ? 'idle' : undefined,
      };
      return applyRenderPhaseRules(initial, isOpen, unmountWhen?.() ?? false);
    },
    {
      equals: (a, b) => a.mounted === b.mounted && a.transitionStatus === b.transitionStatus,
    },
  );

  const mounted = () => state().mounted;
  const transitionStatus = () => state().transitionStatus;

  function update(patch: Partial<TransitionState>) {
    setState((prev) =>
      applyRenderPhaseRules(
        { ...prev, ...patch },
        untrack(open),
        untrack(() => unmountWhen?.() ?? false),
      ),
    );
  }

  const setMounted = (nextMounted: boolean) => update({ mounted: nextMounted });
  const setTransitionStatus = (nextStatus: TransitionStatus) =>
    update({ transitionStatus: nextStatus });

  useIsoLayoutEffect(
    ([isOpen, isMounted, status]) => {
      if (!isOpen && isMounted && status !== 'ending' && deferEndingState) {
        return requestFrameUpdate(() => {
          setTransitionStatus('ending');
        });
      }

      return undefined;
    },
    () => [open(), mounted(), transitionStatus()],
  );

  useIsoLayoutEffect(
    ([isOpen, status]) => {
      // Nothing to clear when the element mounted open or reopened after its exit settled.
      if (!isOpen || enableIdleState || status === undefined) {
        return undefined;
      }

      return requestFrameUpdate(() => {
        setTransitionStatus(undefined);
      });
    },
    () => [open(), transitionStatus()],
  );

  useIsoLayoutEffect(
    ([isOpen]) => {
      if (!isOpen || !enableIdleState) {
        return undefined;
      }

      return requestFrameUpdate(() => {
        setTransitionStatus('idle');
      });
    },
    () => [open(), mounted(), transitionStatus()],
  );

  return {
    mounted,
    setMounted,
    transitionStatus,
  };
}
