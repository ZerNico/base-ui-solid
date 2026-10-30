import { afterEach, beforeEach, expect, vi, describe, it, onTestFinished } from 'vitest';
import { Show, createEffect, createSignal, flush, untrack } from 'solid-js';
import type { Setter } from 'solid-js';
import { Portal } from '@solidjs/web';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { flushMicrotasks, isJSDOM, render, screen, waitFor } from '#test-utils';
import { useAnimationsFinished } from './useAnimationsFinished';

const mockedAnimations = new Map<Element, () => Animation[]>();

afterEach(() => {
  mockedAnimations.clear();
  Reflect.deleteProperty(document, 'getAnimations');
});

/**
 * Mocks the element's animations. Elements checked in the same frame can be looked up through
 * `document.getAnimations()`, so it returns the mocked animations too.
 */
function mockAnimations(element: Element, getAnimations: () => Animation[]) {
  element.getAnimations = getAnimations;
  mockedAnimations.set(element, getAnimations);
  document.getAnimations = () =>
    Array.from(mockedAnimations, ([target, getTargetAnimations]) =>
      getTargetAnimations().map(
        (animation) =>
          ({ ...animation, effect: { ...animation.effect, target } }) as unknown as Animation,
      ),
    ).flat();
}

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
        mockAnimations(ref, getAnimations);
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
        await flushAllMicrotasks();

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
      await flushAllMicrotasks();

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
            mockAnimations(ref, () => {
              getAnimationsCallCounts[index] += 1;
              return [animation];
            });
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
            mockAnimations(ref, getAnimations);
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
  it('waits for an animation that an element created later starts in the next frame', async () => {
    const animationsDisabled = globalThis.BASE_UI_ANIMATIONS_DISABLED;
    globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

    const animation = createAnimation();
    const onFinished = vi.fn();
    let animations: Animation[] = [];
    const getAnimations = vi.fn(() => animations);

    /**
     * Like a component rendered inside a popup that animates it (e.g. Motion): its effect runs
     * after the popup's, and it starts the animation in the next frame.
     */
    function AnimatesNextFrame() {
      createEffect(
        () => undefined,
        () => {
          requestAnimationFrame(() => {
            animations = [animation.animation];
          });
        },
      );
      return null;
    }

    function Popup() {
      let ref: HTMLDivElement | undefined;
      const runOnceAnimationsFinish = useAnimationsFinished(() => ref);

      useEffect(
        () => {
          runOnceAnimationsFinish(onFinished);
        },
        () => [],
      );

      return (
        <div
          ref={(element) => {
            ref = element;
            element.getAnimations = getAnimations;
          }}
        >
          <AnimatesNextFrame />
        </div>
      );
    }

    try {
      await render(() => <Popup />);
      await waitFor(() => expect(getAnimations).toHaveBeenCalled());
      expect(onFinished).not.toHaveBeenCalled();

      animations = [];
      animation.finish();
      await flushMicrotasks();

      expect(onFinished).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = animationsDisabled;
    }
  });

  describe.skipIf(isJSDOM)('elements checked in the same frame', () => {
    const FADE: Keyframe[] = [{ opacity: 1 }, { opacity: 0 }];

    interface WatchedElement {
      onFinished: () => void;
      animate?: ((element: HTMLElement) => Animation | Animation[]) | undefined;
      signal?: AbortSignal | undefined;
    }

    function Watched(props: WatchedElement) {
      let ref: HTMLDivElement | undefined;
      const runOnceAnimationsFinish = useAnimationsFinished(() => ref);

      useIsoLayoutEffect(
        ([animate]) => {
          const animations = [animate?.(ref!) ?? []].flat();
          return () => animations.forEach((animation) => animation.cancel());
        },
        () => [props.animate],
      );

      useEffect(
        ([onFinished, signal]) => {
          runOnceAnimationsFinish(onFinished, signal ?? null);
        },
        () => [props.onFinished, props.signal],
      );

      return <div ref={ref} />;
    }

    function createWatchedElements(timings: Array<KeyframeAnimationOptions | null>) {
      const animations: Animation[] = [];
      const elements: WatchedElement[] = timings.map((timing, index) => ({
        onFinished: vi.fn(),
        animate: timing
          ? (element: HTMLElement) => {
              animations[index] = element.animate(FADE, timing);
              return animations[index];
            }
          : undefined,
      }));
      return { animations, elements };
    }

    function renderWatched(elements: WatchedElement[]) {
      return (
        <>
          {elements.map((element) => (
            <Watched {...element} />
          ))}
        </>
      );
    }

    function spyOnLookups() {
      const getDocumentAnimations = vi.spyOn(document, 'getAnimations');
      const getElementAnimations = vi.spyOn(Element.prototype, 'getAnimations');
      onTestFinished(() => {
        getDocumentAnimations.mockRestore();
        getElementAnimations.mockRestore();
      });
      return { getDocumentAnimations, getElementAnimations };
    }

    beforeEach(() => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
    });

    it('serves the other elements of the tree with one root lookup once one has animations', async () => {
      const { getDocumentAnimations, getElementAnimations } = spyOnLookups();

      const { animations, elements } = createWatchedElements([
        { duration: 1000, iterations: Infinity },
        { duration: 10_000 },
        { duration: 10_000 },
      ]);
      await render(() => renderWatched(elements));

      await waitFor(() => {
        expect(getDocumentAnimations).toHaveBeenCalledTimes(1);
      });
      expect(getElementAnimations).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(elements[0].onFinished).toHaveBeenCalledTimes(1);
      });
      expect(elements[1].onFinished).not.toHaveBeenCalled();
      expect(elements[2].onFinished).not.toHaveBeenCalled();

      animations[2].finish();
      await flushAllMicrotasks();

      expect(elements[2].onFinished).toHaveBeenCalledTimes(1);
      expect(elements[1].onFinished).not.toHaveBeenCalled();
    });

    it('ignores animations of pseudo-elements in the root lookup', async () => {
      const { getDocumentAnimations } = spyOnLookups();

      const { elements } = createWatchedElements([
        { duration: 10_000 },
        { duration: 10_000, pseudoElement: '::after' },
        null,
      ]);
      await render(() => renderWatched(elements));

      await waitFor(() => {
        expect(elements[1].onFinished).toHaveBeenCalledTimes(1);
      });
      expect(getDocumentAnimations).toHaveBeenCalledTimes(1);
      expect(elements[0].onFinished).not.toHaveBeenCalled();
    });

    it.each([
      { name: 'no animations', timing: null },
      {
        name: 'only pseudo-element animations',
        timing: { duration: 10_000, pseudoElement: '::after' },
      },
    ])('looks up each element on its own when they have $name', async ({ timing }) => {
      const { getDocumentAnimations } = spyOnLookups();

      const { elements } = createWatchedElements([timing, timing, timing]);
      await render(() => renderWatched(elements));

      await waitFor(() => {
        expect(elements[2].onFinished).toHaveBeenCalledTimes(1);
      });
      expect(elements[0].onFinished).toHaveBeenCalledTimes(1);
      expect(elements[1].onFinished).toHaveBeenCalledTimes(1);
      expect(getDocumentAnimations).not.toHaveBeenCalled();
    });

    it('waits for every animation of an element served by the root lookup', async () => {
      const { getDocumentAnimations } = spyOnLookups();
      let firstAnimation: Animation;
      let secondAnimation: Animation;
      const { elements } = createWatchedElements([{ duration: 10_000 }, null, null]);
      elements[1].animate = (element) => {
        firstAnimation = element.animate(FADE, 10_000);
        secondAnimation = element.animate(FADE, 10_000);
        return [firstAnimation, secondAnimation];
      };
      await render(() => renderWatched(elements));

      await waitFor(() => {
        expect(getDocumentAnimations).toHaveBeenCalledTimes(1);
      });

      secondAnimation!.finish();
      await flushAllMicrotasks();
      expect(elements[1].onFinished).not.toHaveBeenCalled();

      firstAnimation!.finish();
      await flushAllMicrotasks();
      expect(elements[1].onFinished).toHaveBeenCalledTimes(1);
    });

    it.each([
      { name: 'a single animated element', timings: [{ duration: 10_000 }] },
      {
        name: 'two animated elements',
        timings: [{ duration: 10_000 }, { duration: 10_000 }],
      },
      {
        name: 'an animated element followed by a nonanimated element',
        timings: [{ duration: 10_000 }, null],
      },
      {
        name: 'a nonanimated element followed by an animated element',
        timings: [null, { duration: 10_000 }],
      },
      {
        name: 'three elements with one left after the animated one',
        timings: [null, { duration: 10_000 }, null],
      },
    ])('looks up $name individually without scanning the root', async ({ timings }) => {
      const { getDocumentAnimations, getElementAnimations } = spyOnLookups();

      const { animations, elements } = createWatchedElements(timings);
      await render(() => renderWatched(elements));

      await waitFor(() => {
        expect(getElementAnimations).toHaveBeenCalledTimes(elements.length);
      });
      expect(getDocumentAnimations).not.toHaveBeenCalled();
      const animatedIndex = timings.findIndex((timing) => timing !== null);
      expect(elements[animatedIndex].onFinished).not.toHaveBeenCalled();

      animations.forEach((animation) => animation.finish());
      await flushAllMicrotasks();

      expect(elements[0].onFinished).toHaveBeenCalledTimes(1);
      expect(elements.at(-1)!.onFinished).toHaveBeenCalledTimes(1);
    });

    it('looks up an element checked twice once and counts it once toward the root lookup', async () => {
      const { getDocumentAnimations, getElementAnimations } = spyOnLookups();
      const onFirstFinished = vi.fn();
      const onSecondFinished = vi.fn();
      const { elements } = createWatchedElements([null]);
      let animation: Animation | undefined;

      function TwiceWatched() {
        let ref: HTMLDivElement | undefined;
        const runFirst = useAnimationsFinished(() => ref);
        const runSecond = useAnimationsFinished(() => ref);

        useIsoLayoutEffect(
          () => {
            const currentAnimation = ref!.animate(FADE, { duration: 10_000 });
            animation = currentAnimation;
            return () => currentAnimation.cancel();
          },
          () => [],
        );

        useEffect(
          () => {
            runFirst(onFirstFinished);
            runSecond(onSecondFinished);
          },
          () => [],
        );

        return <div ref={ref} />;
      }

      await render(() => (
        <>
          <TwiceWatched />
          {renderWatched(elements)}
        </>
      ));

      await waitFor(() => {
        expect(elements[0].onFinished).toHaveBeenCalledTimes(1);
      });
      expect(getElementAnimations).toHaveBeenCalledTimes(2);
      expect(getDocumentAnimations).not.toHaveBeenCalled();
      expect(onFirstFinished).not.toHaveBeenCalled();
      expect(onSecondFinished).not.toHaveBeenCalled();

      animation!.finish();
      await flushAllMicrotasks();

      expect(onFirstFinished).toHaveBeenCalledTimes(1);
      expect(onSecondFinished).toHaveBeenCalledTimes(1);
    });

    it('skips the callback of an aborted element that was looked up with others', async () => {
      const { getDocumentAnimations } = spyOnLookups();
      const abortController = new AbortController();
      const { animations, elements } = createWatchedElements([
        { duration: 10_000 },
        { duration: 10_000 },
        { duration: 10_000 },
      ]);
      elements[1] = { ...elements[1], signal: abortController.signal };
      await render(() => renderWatched(elements));

      await waitFor(() => {
        expect(getDocumentAnimations).toHaveBeenCalledTimes(1);
      });
      abortController.abort();

      animations.forEach((animation) => animation.finish());
      await flushAllMicrotasks();

      expect(elements[0].onFinished).toHaveBeenCalledTimes(1);
      expect(elements[1].onFinished).not.toHaveBeenCalled();
      expect(elements[2].onFinished).toHaveBeenCalledTimes(1);
    });

    // Port note: `ReactDOM.createPortal` -> Solid's `<Portal mount>`.
    it.each([
      {
        name: 'a shadow root',
        createContainer() {
          const host = document.createElement('div');
          document.body.append(host);
          return { container: host.attachShadow({ mode: 'open' }), remove: () => host.remove() };
        },
      },
      {
        name: 'an iframe',
        createContainer() {
          const iframe = document.createElement('iframe');
          document.body.append(iframe);
          return { container: iframe.contentDocument!.body, remove: () => iframe.remove() };
        },
      },
    ])('looks up elements in $name through their own root', async ({ createContainer }) => {
      const { container, remove } = createContainer();
      const root = container.getRootNode() as Document | ShadowRoot;
      const getRootAnimations = vi.spyOn(root, 'getAnimations');
      const { getDocumentAnimations } = spyOnLookups();
      onTestFinished(remove);

      const { animations, elements } = createWatchedElements([
        { duration: 10_000 },
        { duration: 10_000 },
        { duration: 10_000 },
      ]);
      await render(() => (
        <Portal mount={container as unknown as Element}>{renderWatched(elements)}</Portal>
      ));

      await waitFor(() => {
        expect(getRootAnimations).toHaveBeenCalledTimes(1);
      });
      expect(getDocumentAnimations).not.toHaveBeenCalled();
      await flushAllMicrotasks();
      expect(elements[0].onFinished).not.toHaveBeenCalled();
      expect(elements[1].onFinished).not.toHaveBeenCalled();

      animations[1].finish();
      await flushAllMicrotasks();

      expect(elements[1].onFinished).toHaveBeenCalledTimes(1);
      expect(elements[0].onFinished).not.toHaveBeenCalled();
    });
  });
});
