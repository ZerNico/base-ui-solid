import { describe, expect, test } from 'vitest';
import { createSignal, flush, onSettled, Show } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { fireEvent, flushMicrotasks, render, screen, isJSDOM, waitFor } from '#test-utils';
import { Checkbox } from 'base-ui-solid/checkbox';
import { FloatingFocusManager } from '../focus/FloatingFocusManager';
import { FloatingPortal } from './FloatingPortal';
import { useFloating } from '../../../../test/floating-ui-tests/useFloating';
import { FloatingPortalLite } from './FloatingPortalLite';
import type { UseFloatingPortalNodeProps } from './FloatingPortal';

interface AppProps {
  container?: UseFloatingPortalNodeProps['container'];
}

function App(props: AppProps) {
  const [open, setOpen] = createSignal(false);
  const { refs } = useFloating({
    get open() {
      return open();
    },
    onOpenChange: setOpen,
  });

  return (
    <>
      <button data-testid="reference" ref={refs.setReference} onClick={() => setOpen(!open())} />
      <FloatingPortal {...props}>
        {open() && <div ref={refs.setFloating} data-testid="floating" />}
      </FloatingPortal>
    </>
  );
}

describe.skipIf(!isJSDOM)('FloatingPortal', () => {
  test('allows custom containers', async () => {
    const customRoot = document.createElement('div');
    customRoot.id = 'custom-root';
    document.body.appendChild(customRoot);
    await render(() => <App container={customRoot} />);
    fireEvent.click(screen.getByTestId('reference'));

    await flushMicrotasks();

    const parent = screen.getByTestId('floating').parentElement;
    expect(parent?.hasAttribute('data-base-ui-portal')).toBe(true);
    expect(parent?.parentElement).toBe(customRoot);
    customRoot.remove();
  });

  test('allows refs as containers', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const ref = { current: el };
    await render(() => <App container={ref} />);
    fireEvent.click(screen.getByTestId('reference'));
    await flushMicrotasks();
    const parent = screen.getByTestId('floating').parentElement;
    expect(parent?.hasAttribute('data-base-ui-portal')).toBe(true);
    expect(parent?.parentElement).toBe(el);
    document.body.removeChild(el);
  });

  test('allows containers to be initially null', async () => {
    function RootApp() {
      const [container, setContainer] = createSignal<HTMLElement | null>(null);
      const [renderContainer, setRenderContainer] = createSignal(false);

      onSettled(() => {
        setRenderContainer(true);
      });

      return (
        <>
          {renderContainer() && <div ref={setContainer} data-testid="root" />}
          <App container={container()} />
        </>
      );
    }

    await render(() => <RootApp />);

    fireEvent.click(screen.getByTestId('reference'));
    await flushMicrotasks();

    const subRoot = screen.getByTestId('floating').parentElement;
    const root = screen.getByTestId('root');
    expect(root).toBe(subRoot?.parentElement);
  });

  test('reattaches the portal when the container changes', async () => {
    const customRoot = document.createElement('div');
    document.body.appendChild(customRoot);

    try {
      function RootSwitcher() {
        const [container, setContainer] =
          createSignal<UseFloatingPortalNodeProps['container']>(undefined);

        return (
          <>
            <App container={container()} />
            <button onClick={() => setContainer(undefined)} data-testid="use-undefined" />
            <button onClick={() => setContainer(customRoot)} data-testid="use-element" />
          </>
        );
      }

      await render(() => <RootSwitcher />);

      fireEvent.click(screen.getByTestId('reference'));

      expect((await screen.findByTestId('floating')).parentElement?.parentElement).toBe(
        document.body,
      );

      fireEvent.click(screen.getByTestId('use-element'));

      expect((await screen.findByTestId('floating')).parentElement?.parentElement).toBe(customRoot);

      fireEvent.click(screen.getByTestId('use-undefined'));

      const floatingInBodyAgain = await screen.findByTestId('floating');
      expect(floatingInBodyAgain.parentElement?.parentElement).toBe(document.body);
      expect(customRoot.contains(floatingInBodyAgain)).toBe(false);
    } finally {
      customRoot.remove();
    }
  });

  test('forwards HTML props to the portal element', async () => {
    await render(() => (
      <FloatingPortal data-testid="portal-element" class="closed">
        <div />
      </FloatingPortal>
    ));

    const portal = document.querySelector('[data-testid="portal-element"]') as HTMLElement | null;
    expect(portal).not.toBeNull();
    expect(portal).toHaveClass('closed');
    expect(portal).toHaveAttribute('data-base-ui-portal');
  });

  test('uses the rendered portal ID for the aria-owns relationship', async () => {
    function Test() {
      const { context, refs } = useFloating({ open: true });

      return (
        <FloatingPortal id="custom-portal">
          <FloatingFocusManager store={context.rootStore} modal={false}>
            <div ref={refs.setFloating} />
          </FloatingFocusManager>
        </FloatingPortal>
      );
    }

    await render(() => <Test />);

    expect(document.querySelector('[aria-owns]')).toHaveAttribute('aria-owns', 'custom-portal');
  });

  test('FloatingPortalLite forwards HTML props to the portal element', async () => {
    await render(() => (
      <FloatingPortalLite data-testid="lite-portal">
        <div />
      </FloatingPortalLite>
    ));

    const portal = document.querySelector('[data-testid="lite-portal"]');
    expect(portal).not.toBeNull();
  });
});

// Port note: upstream's `React.useRef` containers are ref objects set from Solid ref callbacks
// (`ref={(node) => { container.current = node; }}`), and `ReactDOM.flushSync(fn)` is
// `fn(); flush();`. Solid has no StrictMode, so the `strict` rows render the same tree.
describe.each([
  { name: 'FloatingPortal', Portal: FloatingPortal },
  { name: 'FloatingPortalLite', Portal: FloatingPortalLite },
])('$name container resolution', ({ Portal }) => {
  test.each([
    { ancestor: true, strict: false },
    { ancestor: true, strict: true },
    { ancestor: false, strict: false },
    { ancestor: false, strict: true },
  ])(
    'mounts directly inside a ref attached later in the commit (ancestor=$ancestor, strict=$strict)',
    async ({ ancestor }) => {
      // Port note: Solid calls the portal's ref before it inserts the element, so the parents it
      // was inserted into are read from DOM mutations (plus where it ends up).
      let portal: HTMLDivElement | null = null;
      const observer = new MutationObserver(() => {});
      observer.observe(document.body, { childList: true, subtree: true });
      function Test() {
        const container: RefObject<HTMLDivElement | null> = { current: null };
        const setContainer = (node: HTMLDivElement) => {
          container.current = node;
        };
        const content = () => (
          <Portal
            container={container}
            ref={(node: HTMLDivElement) => {
              portal = node;
            }}
          >
            <div data-testid="content" />
          </Portal>
        );
        // eslint-disable-next-line solid/components-return-once
        return ancestor ? (
          <div ref={setContainer} data-testid="container">
            {content()}
          </div>
        ) : (
          <>
            {content()}
            <div ref={setContainer} data-testid="container" />
          </>
        );
      }

      await render(() => <Test />);

      const parents = new Set<ParentNode | null>([portal!.parentNode]);
      for (const record of observer.takeRecords()) {
        if (Array.from(record.addedNodes).includes(portal!)) {
          parents.add(record.target as ParentNode);
        }
      }
      observer.disconnect();

      const container = screen.getByTestId('container');
      expect(container).toContainElement(screen.getByTestId('content'));
      // The portal must never mount in the fallback container, even temporarily.
      expect(parents).toEqual(new Set([container]));
    },
  );

  test('mounts inside an ancestor ref before the next paint', async () => {
    let show = () => {};

    function Content() {
      const container: RefObject<HTMLDivElement | null> = { current: null };
      return (
        <div
          ref={(node) => {
            container.current = node;
          }}
          data-testid="container"
        >
          <Portal container={container}>
            <div data-testid="content" />
          </Portal>
        </div>
      );
    }

    function Test() {
      const [visible, setVisible] = createSignal(false);
      show = () => setVisible(true);
      return (
        <Show when={visible()}>
          <Content />
        </Show>
      );
    }

    await render(() => <Test />);
    expect(screen.queryByTestId('container')).toBe(null);

    // Both callbacks run in one frame with a microtask checkpoint between them, so the second
    // one sees the DOM that the browser paints after the commit outside act().
    const mountedBeforePaint = await new Promise<boolean>((resolve) => {
      requestAnimationFrame(() => {
        show();
        flush();
      });
      requestAnimationFrame(() => {
        resolve(screen.getByTestId('container').contains(screen.queryByTestId('content')));
      });
    });

    expect(mountedBeforePaint).toBe(true);
  });

  // React-only: `React.ViewTransition` (upstream's `$name without canceling a view transition`
  // and `does not cancel a view transition that reveals a hidden pending portal` rows).
  test.skip('$name without canceling a view transition', () => {});

  // React-only: `React.ViewTransition` and `React.Activity`.
  test.skip('does not cancel a view transition that reveals a hidden pending portal', () => {});

  test.skipIf(isJSDOM)(
    'keeps content connected when an indicator exit removes the container in the same checkpoint',
    async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
      let content: HTMLDivElement | null = null;
      let showPortal = () => {};

      function Test() {
        const container: RefObject<HTMLSpanElement | null> = { current: null };
        const [visible, setVisible] = createSignal(false);
        showPortal = () => setVisible(true);
        return (
          <>
            <style>{`
              @keyframes indicator-exit { from { opacity: 1; } to { opacity: 0; } }
              .indicator[data-ending-style] { animation: indicator-exit 100ms paused; }
            `}</style>
            {visible() && (
              <Portal container={container}>
                <div
                  ref={(node) => {
                    content = node;
                  }}
                />
              </Portal>
            )}
            <Checkbox.Root defaultChecked>
              <Checkbox.Indicator class="indicator" data-testid="indicator">
                {visible() && (
                  <span
                    ref={(node) => {
                      container.current = node;
                    }}
                  />
                )}
              </Checkbox.Indicator>
            </Checkbox.Root>
          </>
        );
      }

      const { user } = await render(() => <Test />);
      await user.click(screen.getByRole('checkbox'));
      // Wait until the indicator has registered its own completion handler.
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });

      const indicator = screen.getByTestId('indicator');
      expect(indicator).toHaveAttribute('data-ending-style');
      const [animation] = indicator.getAnimations();

      // Mirror the indicator's completion chain, so this runs right after it queues its unmount.
      const portalShown = Promise.all([animation.finished.then(() => {})]).then(() => {
        showPortal();
        flush();
      });
      animation.finish();
      await portalShown;
      await new Promise((resolve) => {
        requestAnimationFrame(resolve);
      });

      expect(screen.queryByTestId('indicator')).toBe(null);
      expect((content as HTMLDivElement | null)?.isConnected).toBe(true);
    },
  );

  test('mounts children once in a connected container when a later update replaces its ref', async () => {
    const mounts: boolean[] = [];

    function Child() {
      let node: HTMLDivElement | null = null;
      useIsoLayoutEffect(
        () => {
          mounts.push(node?.isConnected ?? false);
        },
        () => [],
      );
      return (
        <div
          ref={(element) => {
            node = element;
          }}
          data-testid="content"
        />
      );
    }

    function Test() {
      const container: RefObject<HTMLDivElement | null> = { current: null };
      const [step, setStep] = createSignal(0);

      useIsoLayoutEffect(
        ([stepValue]) => {
          if (stepValue < 2) {
            setStep(stepValue + 1);
          }
        },
        () => [step()],
      );

      const containerId = () => (step() < 2 ? 'first' : 'second');
      return (
        <>
          <Portal container={container} data-testid="portal">
            <Child />
          </Portal>
          <Show when={containerId()} keyed>
            {(id) => (
              <div
                ref={(node) => {
                  container.current = node;
                }}
                data-testid={id}
              />
            )}
          </Show>
        </>
      );
    }

    await render(() => <Test />);

    expect(screen.getByTestId('portal').parentElement).toBe(screen.getByTestId('second'));
    expect(mounts).toEqual([true]);
  });

  test('mounts deeply nested portals inside their ancestor refs', async () => {
    function Nested(props: { remaining: number }) {
      const container: RefObject<HTMLDivElement | null> = { current: null };
      return (
        <div
          ref={(node) => {
            container.current = node;
          }}
          data-testid="nested-container"
        >
          <Portal container={container} data-testid="nested-portal">
            {props.remaining > 1 ? (
              <Nested remaining={props.remaining - 1} />
            ) : (
              <div data-testid="leaf" />
            )}
          </Portal>
        </div>
      );
    }

    await render(() => <Nested remaining={18} />);

    // Port note: each level reads its ref a microtask after its parent mounted it. Upstream's `act`
    // drains the chained microtasks, while `render` awaits one.
    await waitFor(() => {
      expect(screen.getByTestId('leaf')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('nested-portal').map((node) => node.parentElement)).toEqual(
      screen.getAllByTestId('nested-container'),
    );
  });

  // React-only: counts React commits with `React.Profiler`.
  test.skip('batches sibling portals without adding commits for each container ref', () => {});

  test.each([{ nested: false }, { nested: true }])(
    'uses the fallback container when a ref stays empty (nested=$nested)',
    async ({ nested }) => {
      const container: RefObject<HTMLDivElement | null> = { current: null };
      const content = () => (
        <Portal container={container} data-testid="portal">
          <div data-testid="content" />
        </Portal>
      );

      await render(() =>
        nested ? <FloatingPortal data-testid="parent">{content()}</FloatingPortal> : content(),
      );

      const fallback = nested ? screen.getByTestId('parent') : document.body;
      expect(screen.getByTestId('portal').parentElement).toBe(fallback);
      expect(fallback).toContainElement(screen.getByTestId('content'));
    },
  );

  test.each([{ clear: false }, { clear: true }])(
    'cancels a queued container check when the container prop changes (clear=$clear)',
    async ({ clear }) => {
      function Test() {
        const firstContainer: RefObject<HTMLDivElement | null> = { current: null };
        const secondContainer: RefObject<HTMLDivElement | null> = { current: null };
        const [step, setStep] = createSignal(0);

        useIsoLayoutEffect(
          ([stepValue]) => {
            if (stepValue < 2) {
              setStep(stepValue + 1);
            }
          },
          () => [step()],
        );

        const container = () => {
          if (step() < 2) {
            return firstContainer;
          }
          return clear ? null : secondContainer.current;
        };
        return (
          <>
            <Portal container={container()} data-testid="portal">
              <div data-testid="content" />
            </Portal>
            <div
              ref={(node) => {
                firstContainer.current = node;
              }}
              data-testid="first"
            />
            <div
              ref={(node) => {
                secondContainer.current = node;
              }}
              data-testid="second"
            />
          </>
        );
      }

      await render(() => <Test />);

      expect(screen.getByTestId('first')).toBeEmptyDOMElement();
      expect(screen.queryByTestId('portal')?.parentElement ?? null).toBe(
        clear ? null : screen.getByTestId('second'),
      );
    },
  );
});
