import { expect, vi, describe, it } from 'vitest';
import { Show, createEffect, createSignal, flush, untrack } from 'solid-js';
import type { Setter } from 'solid-js';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { flushMicrotasks, render, screen, waitFor } from '#test-utils';
import { useAnimationsFinished } from './useAnimationsFinished';

function createAnimation(iterations = 1, duration = 1) {
  let resolveFinished!: () => void;
  let rejectFinished!: () => void;

  const finished = new Promise<void>((resolve, reject) => {
    resolveFinished = resolve;
    rejectFinished = reject;
  });

  return {
    animation: {
      finished,
      effect: { getTiming: () => ({ duration, iterations }) },
      pending: false,
      playState: 'running',
    } as unknown as Animation,
    finish: resolveFinished,
    cancel: rejectFinished,
  };
}

/**
 * Port note: upstream wraps these steps in an async `act`, which keeps draining queued work after
 * the callback resolves. Batched completions are flushed from an extra `queueMicrotask`, so a single
 * `flushMicrotasks()` isn't enough here; wait for the microtask queue to drain completely instead.
 * This doesn't affect what is asserted: whether callbacks share a batch is decided by when their
 * animation promises settle, not by how long the test waits.
 */
async function flushAllMicrotasks() {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  flush();
}

interface TestProps {
  getAnimations: () => Animation[];
  onFinished: () => void;
  signal?: AbortSignal;
  batch?: boolean;
}

function Test(props: TestProps) {
  let ref: HTMLDivElement | undefined;
  const runOnceAnimationsFinish = useAnimationsFinished(
    () => ref,
    false,
    untrack(() => props.batch),
  );

  useIsoLayoutEffect(
    ([getAnimations]) => {
      if (ref) {
        ref.getAnimations = getAnimations;
      }
    },
    () => [props.getAnimations],
  );

  useEffect(
    ([onFinished, signal]) => {
      runOnceAnimationsFinish(onFinished, signal ?? null);
    },
    () => [props.onFinished, props.signal],
  );

  return <div ref={ref} />;
}

describe('useAnimationsFinished', () => {
  it.each(['finish', 'cancel'] as const)(
    'ignores infinite animations when a finite animation completes via %s',
    async (completion) => {
      const animationsDisabled = globalThis.BASE_UI_ANIMATIONS_DISABLED;
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const finite = createAnimation();
      const infinite = createAnimation(Infinity);
      const onFinished = vi.fn();
      let animations = [finite.animation, infinite.animation];
      const getAnimations = vi.fn(() => animations);

      try {
        await render(() => <Test getAnimations={getAnimations} onFinished={onFinished} />);
        await waitFor(() => expect(getAnimations).toHaveBeenCalled());
        expect(onFinished).not.toHaveBeenCalled();

        animations = [infinite.animation];
        finite[completion]();
        await flushMicrotasks();

        expect(onFinished).toHaveBeenCalledTimes(1);
      } finally {
        globalThis.BASE_UI_ANIMATIONS_DISABLED = animationsDisabled;
      }
    },
  );

  it.each([
    ['iteration count', Infinity, 1],
    ['duration', 1, Infinity],
  ] as const)(
    'finishes when the element only has an animation with an infinite %s',
    async (_timing, iterations, duration) => {
      const animationsDisabled = globalThis.BASE_UI_ANIMATIONS_DISABLED;
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
      const infinite = createAnimation(iterations, duration);
      const onFinished = vi.fn();

      try {
        await render(() => (
          <Test getAnimations={() => [infinite.animation]} onFinished={onFinished} />
        ));
        await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
      } finally {
        globalThis.BASE_UI_ANIMATIONS_DISABLED = animationsDisabled;
      }
    },
  );

  it('waits for a replacement animation after an animation is canceled', async () => {
    const animationsDisabled = globalThis.BASE_UI_ANIMATIONS_DISABLED;
    globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

    const initialAnimation = createAnimation();
    const replacementAnimation = createAnimation();
    const infiniteAnimation = createAnimation(Infinity);
    const onFinished = vi.fn();
    let animations: Animation[] = [initialAnimation.animation, infiniteAnimation.animation];
    let getAnimationsCallCount = 0;

    try {
      await render(() => (
        <Test
          getAnimations={() => {
            getAnimationsCallCount += 1;
            return animations;
          }}
          onFinished={onFinished}
        />
      ));

      await waitFor(() => {
        expect(getAnimationsCallCount).toBeGreaterThan(0);
      });

      animations = [replacementAnimation.animation, infiniteAnimation.animation];

      initialAnimation.cancel();
      await flushMicrotasks();

      expect(onFinished).not.toHaveBeenCalled();

      animations = [];

      replacementAnimation.finish();
      await flushMicrotasks();

      expect(onFinished).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = animationsDisabled;
    }
  });

  it('finishes when a canceled animation has no replacement', async () => {
    const animationsDisabled = globalThis.BASE_UI_ANIMATIONS_DISABLED;
    globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

    const initialAnimation = createAnimation();
    const onFinished = vi.fn();
    let animations: Animation[] = [initialAnimation.animation];
    let getAnimationsCallCount = 0;

    try {
      await render(() => (
        <Test
          getAnimations={() => {
            getAnimationsCallCount += 1;
            return animations;
          }}
          onFinished={onFinished}
        />
      ));

      await waitFor(() => {
        expect(getAnimationsCallCount).toBeGreaterThan(0);
      });

      animations = [];

      initialAnimation.cancel();
      await flushMicrotasks();

      expect(onFinished).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = animationsDisabled;
    }
  });

  it('batches opted-in callbacks that finish in the same microtask into a single commit', async () => {
    const animationsDisabled = globalThis.BASE_UI_ANIMATIONS_DISABLED;
    globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

    const first = createAnimation();
    const second = createAnimation();
    const getAnimationsCallCounts = [0, 0];
    let commitCount = 0;

    // Port note: Solid has no `React.Profiler`. The `mounted` state is lifted into the test so a
    // single effect can observe both items; it runs once per flush that changes either of them,
    // which is the Solid counterpart of a React commit.
    function Item(props: {
      index: number;
      animation: Animation;
      mounted: boolean;
      setMounted: Setter<boolean>;
    }) {
      let ref: HTMLDivElement | undefined;
      const runOnceAnimationsFinish = useAnimationsFinished(() => ref, false, true);
      const index = untrack(() => props.index);

      useIsoLayoutEffect(
        ([animation]) => {
          if (ref) {
            ref.getAnimations = () => {
              getAnimationsCallCounts[index] += 1;
              return [animation];
            };
          }
        },
        () => [props.animation],
      );

      useEffect(
        ([setMounted]) => {
          runOnceAnimationsFinish(() => setMounted(false));
        },
        () => [props.setMounted],
      );

      return (
        <Show when={props.mounted}>
          <div
            data-testid={`item-${index}`}
            ref={(element) => {
              ref = element;
            }}
          />
        </Show>
      );
    }

    function App() {
      const [mounted0, setMounted0] = createSignal(true);
      const [mounted1, setMounted1] = createSignal(true);

      createEffect(
        () => [mounted0(), mounted1()],
        () => {
          commitCount += 1;
        },
      );

      return (
        <>
          <Item
            index={0}
            animation={first.animation}
            mounted={mounted0()}
            setMounted={setMounted0}
          />
          <Item
            index={1}
            animation={second.animation}
            mounted={mounted1()}
            setMounted={setMounted1}
          />
        </>
      );
    }

    try {
      await render(() => <App />);

      await waitFor(() => {
        expect(getAnimationsCallCounts[0]).toBeGreaterThan(0);
      });
      await waitFor(() => {
        expect(getAnimationsCallCounts[1]).toBeGreaterThan(0);
      });

      const commitCountBefore = commitCount;

      first.finish();
      second.finish();
      await flushAllMicrotasks();

      expect(screen.queryByTestId('item-0')).toBeNull();
      expect(screen.queryByTestId('item-1')).toBeNull();
      expect(commitCount).toBe(commitCountBefore + 1);
    } finally {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = animationsDisabled;
    }
  });

  it('skips a callback whose signal aborts while the batch is flushing', async () => {
    const animationsDisabled = globalThis.BASE_UI_ANIMATIONS_DISABLED;
    globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

    const first = createAnimation();
    const second = createAnimation();
    const secondController = new AbortController();
    const onFirstFinished = vi.fn(() => secondController.abort());
    const onSecondFinished = vi.fn();
    const firstGetAnimations = vi.fn(() => [first.animation]);
    const secondGetAnimations = vi.fn(() => [second.animation]);

    try {
      await render(() => (
        <>
          <Test batch getAnimations={firstGetAnimations} onFinished={onFirstFinished} />
          <Test
            batch
            getAnimations={secondGetAnimations}
            onFinished={onSecondFinished}
            signal={secondController.signal}
          />
        </>
      ));

      await waitFor(() => {
        expect(firstGetAnimations).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(secondGetAnimations).toHaveBeenCalled();
      });

      first.finish();
      second.finish();
      await flushAllMicrotasks();

      expect(onFirstFinished).toHaveBeenCalledTimes(1);
      expect(onSecondFinished).not.toHaveBeenCalled();
    } finally {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = animationsDisabled;
    }
  });

  it('commits each callback separately by default so later callbacks observe earlier updates', async () => {
    const animationsDisabled = globalThis.BASE_UI_ANIMATIONS_DISABLED;
    globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

    const first = createAnimation();
    const second = createAnimation();
    const firstGetAnimations = vi.fn(() => [first.animation]);
    const secondGetAnimations = vi.fn(() => [second.animation]);
    const onSecondUnmount = vi.fn();

    interface PopupProps {
      open: boolean;
      getAnimations: () => Animation[];
      onCloseComplete: () => void;
    }

    // Mirrors `useOpenChangeComplete`: the completion reads the latest `open` and only
    // unmounts while the popup is still closed.
    function Popup(props: PopupProps) {
      let ref: HTMLDivElement | undefined;
      const runOnceAnimationsFinish = useAnimationsFinished(() => ref);

      const onComplete = () => {
        if (!props.open) {
          props.onCloseComplete();
        }
      };

      useIsoLayoutEffect(
        ([getAnimations]) => {
          if (ref) {
            ref.getAnimations = getAnimations;
          }
        },
        () => [props.getAnimations],
      );

      useEffect(
        () => {
          const abortController = new AbortController();
          runOnceAnimationsFinish(onComplete, abortController.signal);
          return () => abortController.abort();
        },
        () => [props.open],
      );

      return <div ref={ref} />;
    }

    function App() {
      const [secondOpen, setSecondOpen] = createSignal(false);
      return (
        <>
          <Popup
            open={false}
            getAnimations={firstGetAnimations}
            onCloseComplete={() => setSecondOpen(true)}
          />
          <Popup
            open={secondOpen()}
            getAnimations={secondGetAnimations}
            onCloseComplete={onSecondUnmount}
          />
        </>
      );
    }

    try {
      await render(() => <App />);

      await waitFor(() => {
        expect(firstGetAnimations).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(secondGetAnimations).toHaveBeenCalled();
      });

      // Both popups are closing. The first popup's close completion reopens the second,
      // which must prevent the second popup's queued completion from unmounting it.
      first.finish();
      second.finish();
      await flushMicrotasks();

      expect(onSecondUnmount).not.toHaveBeenCalled();
    } finally {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = animationsDisabled;
    }
  });
});
