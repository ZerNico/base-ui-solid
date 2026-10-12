import { expect, vi, describe, beforeEach, it } from 'vitest';
import { createSignal, flush, Show } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { within } from '@solidjs/testing-library';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { Dialog } from 'base-ui-solid/dialog';
import {
  createRenderer,
  detachedTriggersConformanceTests,
  flushMicrotasks,
  isJSDOM,
  render,
  renderToString,
  screen,
  waitFor,
} from '#test-utils';
import { DetachedTriggerWithDefaultOpenRoot } from './DialogRoot.detached-triggers.fixtures';

// Port note: upstream's `act(() => fn())` becomes `fn()` followed by `flush()`, and
// `await act(() => fn())` becomes `fn()` followed by `await flushMicrotasks()`. `React.useState`
// wrappers are signals, and conditional rendering uses `<Show>`.
//
// Port note: a Root render-function child is called once with `{ payload }`, where `payload` is an
// accessor (upstream: the value, on every render), so the tests call `payload()`.

// Port note: upstream's `render(...).setProps` is replaced with a props signal that merges the new
// props like `setProps` does.
async function renderWithProps<Props extends object>(
  Component: (props: Props) => JSX.Element,
  initialProps: Props,
) {
  const [props, setPropsSignal] = createSignal({ value: initialProps });
  const AnyComponent = Component as (props: object) => JSX.Element;
  const view = await render(() => <AnyComponent {...props().value} />);
  return {
    ...view,
    setProps: async (newProps: Partial<Props>) => {
      setPropsSignal((prev) => ({ value: { ...prev.value, ...newProps } }));
      await flushMicrotasks();
    },
  };
}

describe('<Dialog.Root />', () => {
  const { render, clock } = createRenderer();

  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  detachedTriggersConformanceTests({
    render,
    createHandle: Dialog.createHandle,
    Root: Dialog.Root,
    Trigger: Dialog.Trigger,
    Portal: Dialog.Portal,
    Popup: Dialog.Popup,
    Close: Dialog.Close,
    openInteractions: ['click'],
    ariaExpanded: true,
    throwOnMissingTrigger: false,
  });

  describe('handle-backed root ownership', () => {
    type NumberPayload = { payload: Accessor<number | undefined> };

    it('hydrates a detached trigger from the stable fallback store', async () => {
      // Port note: the server-rendered tree lives in `DialogRoot.detached-triggers.fixtures.tsx`.
      const { hydrate } = await renderToString(DetachedTriggerWithDefaultOpenRoot);

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).not.toHaveAttribute('data-popup-open');

      hydrate();

      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
      });
      expect(trigger).toHaveAttribute('data-popup-open');
    });

    // React-only: `React.Suspense` delaying the hydration of a suspended trigger.
    it.skip('keeps the server snapshot stable when the root closes before a delayed trigger hydrates', () => {});

    it('opens from a descendant layout effect on initial mount', async () => {
      const handle = Dialog.createHandle();
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      function OpenOnMount() {
        useIsoLayoutEffect(
          () => {
            handle.open(null);
          },
          () => [],
        );
        return null;
      }

      await render(() => (
        <Dialog.Root handle={handle}>
          <OpenOnMount />
        </Dialog.Root>
      ));

      const detachedWarned = consoleWarn.mock.calls.some(
        ([message]) =>
          typeof message === 'string' && message.includes('no root using this handle is mounted'),
      );
      consoleWarn.mockRestore();

      expect(detachedWarned).toBe(false);
      expect(handle.isOpen).toBe(true);
    });

    it('opens with a payload from a descendant layout effect on initial mount', async () => {
      const handle = Dialog.createHandle<number>();
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      function OpenOnMount() {
        useIsoLayoutEffect(
          () => {
            handle.openWithPayload(8);
          },
          () => [],
        );
        return null;
      }

      await render(() => (
        <Dialog.Root handle={handle}>
          {({ payload }: NumberPayload) => (
            <>
              <span data-testid="payload">{payload() ?? 'No payload'}</span>
              <OpenOnMount />
            </>
          )}
        </Dialog.Root>
      ));

      const detachedWarned = consoleWarn.mock.calls.some(
        ([message]) =>
          typeof message === 'string' && message.includes('no root using this handle is mounted'),
      );
      consoleWarn.mockRestore();

      expect(detachedWarned).toBe(false);
      expect(handle.isOpen).toBe(true);
      expect(screen.getByTestId('payload').textContent).toBe('8');
    });

    it('closes from a descendant layout effect on an initially open root', async () => {
      const handle = Dialog.createHandle();
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      function CloseOnMount() {
        useIsoLayoutEffect(
          () => {
            handle.close();
          },
          () => [],
        );
        return null;
      }

      await render(() => (
        <Dialog.Root handle={handle} defaultOpen>
          <CloseOnMount />
        </Dialog.Root>
      ));

      const detachedWarned = consoleWarn.mock.calls.some(
        ([message]) =>
          typeof message === 'string' && message.includes('no root using this handle is mounted'),
      );
      consoleWarn.mockRestore();

      expect(detachedWarned).toBe(false);
      expect(handle.isOpen).toBe(false);
    });

    it.skipIf(!isJSDOM)('does not warn for a detached payload open in production', async () => {
      // Port note: dev checks use `IS_DEV` (Solid's dev build) instead of `process.env.NODE_ENV`,
      // so production is emulated by loading the module with `IS_DEV` mocked to `false`.
      vi.resetModules();
      vi.doMock('@base-ui-solid/utils/isDev', () => ({ IS_DEV: false }));
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        const { createDialogHandle } = await import('../store/DialogHandle');
        const handle = createDialogHandle<number>();

        handle.openWithPayload(8);

        expect(handle.isOpen).toBe(false);
        expect(consoleWarn.mock.calls.length).toBe(0);
      } finally {
        vi.doUnmock('@base-ui-solid/utils/isDev');
        vi.resetModules();
        consoleWarn.mockRestore();
      }
    });

    it('ignores openWithPayload() after the root unmounts and keeps the remounted root without payload', async () => {
      const handle = Dialog.createHandle<number>();

      function App(props: { mounted: boolean }) {
        return (
          <Show when={props.mounted}>
            <Dialog.Root handle={handle}>
              {({ payload }: NumberPayload) => (
                <span data-testid="payload">{payload() ?? 'No payload'}</span>
              )}
            </Dialog.Root>
          </Show>
        );
      }

      const { setProps } = await renderWithProps(App, { mounted: true });
      await setProps({ mounted: false });

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        handle.openWithPayload(8);
        expect(
          consoleWarn.mock.calls.filter(
            ([message]) =>
              typeof message === 'string' &&
              message.includes('openWithPayload() was called while no root using this handle'),
          ),
        ).toHaveLength(1);
      } finally {
        consoleWarn.mockRestore();
      }
      expect(handle.isOpen).toBe(false);

      await setProps({ mounted: true });
      expect(handle.isOpen).toBe(false);
      expect(screen.getByTestId('payload').textContent).toBe('No payload');
    });

    // React-only: `React.useTransition` + `React.Suspense` abandoning a suspended render.
    it.skip('does not attach a replacement root store from an abandoned transition render', () => {});

    it('attaches a fresh root store when the handle prop changes to a previously dirtied handle', async () => {
      const handleA = Dialog.createHandle<number>();
      const handleB = Dialog.createHandle<number>();

      function App() {
        const [phase, setPhase] = createSignal<'dirty' | 'main'>('dirty');
        const [handle, setHandle] = createSignal(handleA);

        return (
          <Show
            when={phase() === 'dirty'}
            fallback={
              <>
                <Dialog.Trigger handle={handle()} id="trigger" payload={1}>
                  Trigger
                </Dialog.Trigger>
                <button type="button" onClick={() => setHandle(handleB)}>
                  Switch to handle B
                </button>
                <Dialog.Root handle={handle()}>
                  {({ payload }: NumberPayload) => (
                    <>
                      <span data-testid="payload">{payload() ?? 'No payload'}</span>
                      <Dialog.Portal>
                        <Dialog.Popup>Dialog Content</Dialog.Popup>
                      </Dialog.Portal>
                    </>
                  )}
                </Dialog.Root>
              </>
            }
          >
            <Dialog.Root handle={handleB}>
              {({ payload }: NumberPayload) => (
                <>
                  <span data-testid="dirty-payload">{payload() ?? 'No payload'}</span>
                  <Dialog.Portal>
                    <Dialog.Popup>
                      Dirty dialog
                      <button type="button" onClick={() => setPhase('main')}>
                        Unmount dirty root
                      </button>
                    </Dialog.Popup>
                  </Dialog.Portal>
                </>
              )}
            </Dialog.Root>
          </Show>
        );
      }

      const { user } = await render(() => <App />);

      handleB.openWithPayload(8);
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.getByText('Dirty dialog')).toBeVisible();
      });
      expect(screen.getByTestId('dirty-payload').textContent).toBe('8');

      await user.click(screen.getByRole('button', { name: 'Unmount dirty root' }));
      expect(handleB.isOpen).toBe(false);
      expect(screen.queryByRole('dialog')).toBe(null);
      expect(screen.getByTestId('payload').textContent).toBe('No payload');

      await user.click(screen.getByRole('button', { name: 'Switch to handle B' }));
      expect(handleB.isOpen).toBe(false);
      expect(screen.queryByRole('dialog')).toBe(null);
      expect(screen.getByTestId('payload').textContent).toBe('No payload');

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeVisible();
      });
      expect(screen.getByTestId('payload').textContent).toBe('1');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('keeps a handle-backed dialog open and controllable across handle swaps on a live root', async () => {
      const handleA = Dialog.createHandle();
      const handleB = Dialog.createHandle();

      function App() {
        const [handle, setHandle] = createSignal(handleA);

        return (
          <>
            <Dialog.Trigger handle={handle()} id="trigger">
              Trigger
            </Dialog.Trigger>
            <button type="button" onClick={() => setHandle(handleA)}>
              Use handle A
            </button>
            <button type="button" onClick={() => setHandle(handleB)}>
              Use handle B
            </button>
            <Dialog.Root handle={handle()} modal={false} disablePointerDismissal>
              <Dialog.Portal>
                <Dialog.Popup>Dialog Content</Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>
          </>
        );
      }

      const { user } = await render(() => <App />);
      const trigger = screen.getByRole('button', { name: 'Trigger' });

      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeVisible();
      });

      // The store is owned by the Root, so swapping the handle re-attaches it without resetting state.
      await user.click(screen.getByRole('button', { name: 'Use handle B' }));
      expect(screen.getByText('Dialog Content')).toBeVisible();
      expect(handleB.isOpen).toBe(true);
      expect(handleA.isOpen).toBe(false);
      await waitFor(() => {
        expect(trigger.getAttribute('aria-controls')).toBe(
          screen.getByRole('dialog').getAttribute('id'),
        );
      });

      // Swapping back to a previously-attached handle keeps working (no stale registrations).
      await user.click(screen.getByRole('button', { name: 'Use handle A' }));
      expect(screen.getByText('Dialog Content')).toBeVisible();
      expect(handleA.isOpen).toBe(true);
      expect(handleB.isOpen).toBe(false);

      // The currently-attached handle controls the live dialog.
      handleA.close();
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).toBe(null);
      });
    });

    it('attaches and detaches a handle when the prop toggles on a live root', async () => {
      const handle = Dialog.createHandle();
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      function App() {
        const [attached, setAttached] = createSignal(false);

        return (
          <>
            <Dialog.Trigger handle={handle} id="trigger">
              Trigger
            </Dialog.Trigger>
            <button type="button" onClick={() => setAttached((value) => !value)}>
              Toggle handle
            </button>
            <Dialog.Root
              handle={attached() ? handle : undefined}
              modal={false}
              disablePointerDismissal
            >
              <Dialog.Portal>
                <Dialog.Popup>Dialog Content</Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>
          </>
        );
      }

      const { user } = await render(() => <App />);
      const trigger = screen.getByRole('button', { name: 'Trigger' });

      handle.open('trigger');
      flush();
      expect(handle.isOpen).toBe(false);
      expect(screen.queryByRole('dialog')).toBe(null);

      await user.click(screen.getByRole('button', { name: 'Toggle handle' }));
      handle.open('trigger');
      flush();

      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeVisible();
      });
      expect(trigger.getAttribute('aria-controls')).toBe(
        screen.getByRole('dialog').getAttribute('id'),
      );

      handle.close();
      flush();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBe(null);
      });

      await user.click(screen.getByRole('button', { name: 'Toggle handle' }));
      handle.open('trigger');
      flush();
      expect(handle.isOpen).toBe(false);
      expect(screen.queryByRole('dialog')).toBe(null);

      const detachedWarnings = consoleWarn.mock.calls.filter(
        ([message]) =>
          typeof message === 'string' && message.includes('no root using this handle is mounted'),
      );
      consoleWarn.mockRestore();
      expect(detachedWarnings).toHaveLength(2);
    });

    it('associates the requested trigger when opened by id in the same commit a root attaches', async () => {
      const handle = Dialog.createHandle<number>();

      function OpenOnMount() {
        // A layout effect runs in the same commit the root first attaches, after the root's attach
        // effect but before the detached triggers have re-registered into the root's store.
        useIsoLayoutEffect(
          () => {
            handle.open('trigger');
          },
          () => [],
        );
        return null;
      }

      await render(() => (
        <>
          <Dialog.Trigger handle={handle} id="other" payload={9}>
            Other
          </Dialog.Trigger>
          <Dialog.Trigger handle={handle} id="trigger" payload={5}>
            Trigger
          </Dialog.Trigger>
          <Dialog.Root handle={handle}>
            {({ payload }: NumberPayload) => (
              <>
                <span data-testid="payload">{payload() ?? 'No payload'}</span>
                <Dialog.Portal>
                  <Dialog.Popup>Dialog Content</Dialog.Popup>
                </Dialog.Portal>
              </>
            )}
          </Dialog.Root>
          <OpenOnMount />
        </>
      ));

      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeVisible();
      });

      // The requested trigger is associated (ARIA + its own payload), not the other detached trigger.
      const requestedTrigger = screen.getByRole('button', { name: 'Trigger', hidden: true });
      const otherTrigger = screen.getByRole('button', { name: 'Other', hidden: true });
      expect(requestedTrigger).toHaveAttribute('aria-expanded', 'true');
      expect(requestedTrigger.getAttribute('aria-controls')).toBe(
        screen.getByRole('dialog').getAttribute('id'),
      );
      expect(otherTrigger).not.toHaveAttribute('aria-controls');
      expect(screen.getByTestId('payload').textContent).toBe('5');
    });

    describe('multiple roots sharing one handle', () => {
      // Fake timers so the deferred overlap check only runs when ticked, after the handoff settles.
      clock.withFakeTimers();

      const overlapWarned = (consoleWarn: ReturnType<typeof vi.spyOn>) =>
        consoleWarn.mock.calls.some(
          ([message]: unknown[]) =>
            typeof message === 'string' && message.includes('more than one mounted root'),
        );

      function TransitioningRoots(props: {
        handle: ReturnType<typeof Dialog.createHandle>;
        phase: 'outgoing' | 'overlap' | 'incoming';
      }) {
        return (
          <>
            <Show when={props.phase === 'outgoing' || props.phase === 'overlap'}>
              <Dialog.Root handle={props.handle}>
                <Dialog.Portal>
                  <Dialog.Popup>Outgoing</Dialog.Popup>
                </Dialog.Portal>
              </Dialog.Root>
            </Show>
            <Show when={props.phase === 'overlap' || props.phase === 'incoming'}>
              <Dialog.Root handle={props.handle}>
                <Dialog.Portal>
                  <Dialog.Popup>Incoming</Dialog.Popup>
                </Dialog.Portal>
              </Dialog.Root>
            </Show>
          </>
        );
      }

      // Port note: upstream declares `TransitioningRoots` inside each test, closing over the test's
      // handle; here it's shared and receives the handle as a prop.
      it('does not warn when one root replaces another during a route transition', async () => {
        const handle = Dialog.createHandle();
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const { setProps } = await renderWithProps(TransitioningRoots, {
          handle,
          phase: 'outgoing',
        });
        // The incoming root mounts while the outgoing one is still mounted (overlap)...
        await setProps({ phase: 'overlap' });
        // ...then the outgoing root unmounts, completing a clean handoff, all before the deferred
        // check runs.
        await setProps({ phase: 'incoming' });

        clock.tick(20);

        expect(overlapWarned(consoleWarn)).toBe(false);
        consoleWarn.mockRestore();
      });

      it('keeps the newer root attached after the older root unmounts', async () => {
        const handle = Dialog.createHandle();

        const { setProps } = await renderWithProps(TransitioningRoots, {
          handle,
          phase: 'outgoing',
        });
        await setProps({ phase: 'overlap' });
        await setProps({ phase: 'incoming' });

        clock.tick(20);

        handle.open(null);
        await flushMicrotasks();

        expect(screen.getByText('Incoming')).toBeVisible();
        expect(screen.queryByText('Outgoing')).toBe(null);
        expect(handle.isOpen).toBe(true);
      });

      it('restores control to the previous root when a newer overlapping root detaches', async () => {
        const handle = Dialog.createHandle();
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const { setProps } = await renderWithProps(TransitioningRoots, {
          handle,
          phase: 'outgoing',
        });
        // The incoming root mounts while the outgoing one is still mounted (overlap)...
        await setProps({ phase: 'overlap' });
        // ...then the transition is canceled: the newer (incoming) root unmounts first while the
        // older (outgoing) root stays mounted.
        await setProps({ phase: 'outgoing' });

        clock.tick(20);

        // The still-mounted outgoing root regains control of the handle instead of being left inert.
        handle.open(null);
        await flushMicrotasks();

        expect(screen.getByText('Outgoing')).toBeVisible();
        expect(screen.queryByText('Incoming')).toBe(null);
        expect(handle.isOpen).toBe(true);
        // A canceled transient overlap should not warn.
        expect(overlapWarned(consoleWarn)).toBe(false);
        consoleWarn.mockRestore();
      });

      // React-only: StrictMode (double-invoked effects).
      it.skip('keeps the root attached through Strict Mode effect replay', () => {});
    });
  });

  describe.skipIf(isJSDOM)('multiple triggers within Root', () => {
    type NumberPayload = { payload: Accessor<number | undefined> };

    it('keeps the payload reactive', async () => {
      function App() {
        const [payloads, setPayloads] = createSignal([1, 2]);

        return (
          <div>
            <Dialog.Root>
              {({ payload }: NumberPayload) => (
                <>
                  <Dialog.Trigger id="trigger-1" payload={payloads()[0]}>
                    Dialog 1
                  </Dialog.Trigger>
                  <Dialog.Trigger id="trigger-2" payload={payloads()[1]}>
                    Dialog 2
                  </Dialog.Trigger>

                  <Dialog.Portal>
                    <Dialog.Popup>
                      <span data-testid="content">{payload()}</span>
                      <button type="button" onClick={() => setPayloads([8, 16])}>
                        Update payloads
                      </button>
                    </Dialog.Popup>
                  </Dialog.Portal>
                </>
              )}
            </Dialog.Root>
          </div>
        );
      }

      const { user } = await render(() => <App />);

      const trigger1 = screen.getByRole('button', { name: 'Dialog 1' });
      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });

      const updateButton = screen.getByRole('button', { name: 'Update payloads' });
      await user.click(updateButton);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('8');
      });
    });
  });

  describe.skipIf(isJSDOM)('multiple detached triggers', () => {
    type NumberPayload = { payload: Accessor<number | undefined> };

    it('attaches fresh root state when the root remounts after being unmounted while open', async () => {
      const testDialog = Dialog.createHandle();

      function App() {
        const [mounted, setMounted] = createSignal(true);

        return (
          <div>
            <Dialog.Trigger handle={testDialog} id="trigger-1">
              Trigger 1
            </Dialog.Trigger>
            <Dialog.Trigger handle={testDialog} id="trigger-2">
              Trigger 2
            </Dialog.Trigger>
            <Show when={!mounted()}>
              <button type="button" onClick={() => setMounted(true)}>
                Remount root
              </button>
            </Show>

            <Show when={mounted()}>
              <Dialog.Root handle={testDialog}>
                <Dialog.Portal>
                  <Dialog.Popup>
                    Dialog Content
                    <button type="button" onClick={() => setMounted(false)}>
                      Unmount root
                    </button>
                  </Dialog.Popup>
                </Dialog.Portal>
              </Dialog.Root>
            </Show>
          </div>
        );
      }

      const { user } = await render(() => <App />);
      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeVisible();
      });

      await user.click(screen.getByRole('button', { name: 'Unmount root' }));
      expect(screen.queryByText('Dialog Content')).toBe(null);

      await user.click(screen.getByRole('button', { name: 'Remount root' }));
      expect(screen.queryByText('Dialog Content')).toBe(null);
      await waitFor(() => {
        expect(trigger1).toHaveAttribute('aria-expanded', 'false');
      });

      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeVisible();
      });

      expect(trigger1).toHaveAttribute('aria-expanded', 'true');
      expect(trigger1.getAttribute('aria-controls')).toBe(
        screen.getByRole('dialog').getAttribute('id'),
      );
      expect(trigger2).toHaveAttribute('aria-expanded', 'false');
    });

    it('resets stale payload when a handle-backed root remounts', async () => {
      const testDialog = Dialog.createHandle<number>();

      function App() {
        const [mounted, setMounted] = createSignal(true);

        return (
          <div>
            <Show when={!mounted()}>
              <button type="button" onClick={() => setMounted(true)}>
                Remount root
              </button>
            </Show>

            <Show when={mounted()}>
              <Dialog.Root handle={testDialog}>
                {({ payload }: NumberPayload) => (
                  <>
                    <span data-testid="payload">{payload() ?? 'No payload'}</span>
                    <Dialog.Portal>
                      <Dialog.Popup>
                        Dialog Content
                        <button type="button" onClick={() => setMounted(false)}>
                          Unmount root
                        </button>
                      </Dialog.Popup>
                    </Dialog.Portal>
                  </>
                )}
              </Dialog.Root>
            </Show>
          </div>
        );
      }

      const { user } = await render(() => <App />);

      expect(screen.getByTestId('payload').textContent).toBe('No payload');

      testDialog.openWithPayload(8);
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeVisible();
      });
      expect(screen.getByTestId('payload').textContent).toBe('8');

      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Unmount root' }),
      );
      expect(screen.queryByTestId('payload')).toBe(null);

      await user.click(screen.getByRole('button', { name: 'Remount root' }));
      expect(screen.queryByRole('dialog')).toBe(null);
      expect(screen.getByTestId('payload').textContent).toBe('No payload');
    });

    it('notifies persistent detached triggers after attaching fresh root state on remount', async () => {
      const testDialog = Dialog.createHandle();

      // Port note: upstream wraps this in `React.memo` so it doesn't re-render with its parent;
      // Solid components never re-render.
      function HeaderTrigger() {
        return (
          <Dialog.Trigger handle={testDialog} id="trigger">
            Trigger
          </Dialog.Trigger>
        );
      }

      function RouteRoot() {
        const [mounted, setMounted] = createSignal(true);

        return (
          <>
            <Show when={!mounted()}>
              <button type="button" onClick={() => setMounted(true)}>
                Remount root
              </button>
            </Show>

            <Show when={mounted()}>
              <Dialog.Root handle={testDialog}>
                <Dialog.Portal>
                  <Dialog.Popup>
                    Dialog Content
                    <button type="button" onClick={() => setMounted(false)}>
                      Unmount root
                    </button>
                  </Dialog.Popup>
                </Dialog.Portal>
              </Dialog.Root>
            </Show>
          </>
        );
      }

      function App() {
        return (
          <>
            <HeaderTrigger />
            <RouteRoot />
          </>
        );
      }

      const { user } = await render(() => <App />);
      const trigger = screen.getByRole('button', { name: 'Trigger' });

      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeVisible();
      });

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger.getAttribute('aria-controls')).toBe(
        screen.getByRole('dialog').getAttribute('id'),
      );

      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Unmount root' }),
      );
      expect(screen.queryByText('Dialog Content')).toBe(null);

      await user.click(screen.getByRole('button', { name: 'Remount root' }));
      expect(screen.queryByText('Dialog Content')).toBe(null);

      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
      });
      expect(trigger).not.toHaveAttribute('aria-controls');
    });

    it('resets stale controlled open state when a handle-backed root remounts uncontrolled', async () => {
      const testDialog = Dialog.createHandle();

      function App() {
        const [mode, setMode] = createSignal<'controlled' | 'unmounted' | 'uncontrolled'>(
          'controlled',
        );

        return (
          <div>
            <Dialog.Trigger handle={testDialog} id="trigger">
              Trigger
            </Dialog.Trigger>
            <button type="button" onClick={() => setMode('unmounted')}>
              Unmount root
            </button>
            <Show when={mode() === 'unmounted'}>
              <button type="button" onClick={() => setMode('uncontrolled')}>
                Remount uncontrolled root
              </button>
            </Show>

            <Show when={mode() === 'controlled'}>
              <Dialog.Root handle={testDialog} open triggerId="trigger">
                <Dialog.Portal>
                  <Dialog.Popup>
                    Dialog Content
                    <button type="button" onClick={() => setMode('unmounted')}>
                      Unmount root
                    </button>
                  </Dialog.Popup>
                </Dialog.Portal>
              </Dialog.Root>
            </Show>

            <Show when={mode() === 'uncontrolled'}>
              <Dialog.Root handle={testDialog}>
                <Dialog.Portal>
                  <Dialog.Popup>Dialog Content</Dialog.Popup>
                </Dialog.Portal>
              </Dialog.Root>
            </Show>
          </div>
        );
      }

      const { user } = await render(() => <App />);

      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeVisible();
      });

      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Unmount root' }),
      );
      expect(screen.queryByText('Dialog Content')).toBe(null);

      await user.click(screen.getByRole('button', { name: 'Remount uncontrolled root' }));
      expect(screen.queryByText('Dialog Content')).toBe(null);
    });

    it('does not warn when a handle-backed root remounts controlled after being uncontrolled', async () => {
      const testDialog = Dialog.createHandle();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        function App() {
          const [mode, setMode] = createSignal<'uncontrolled' | 'unmounted' | 'controlled'>(
            'uncontrolled',
          );

          return (
            <div>
              <Dialog.Trigger handle={testDialog} id="trigger">
                Trigger
              </Dialog.Trigger>
              <button type="button" onClick={() => setMode('unmounted')}>
                Unmount root
              </button>
              <Show when={mode() === 'unmounted'}>
                <button type="button" onClick={() => setMode('controlled')}>
                  Remount controlled root
                </button>
              </Show>

              <Show when={mode() === 'uncontrolled'}>
                <Dialog.Root handle={testDialog}>
                  <Dialog.Portal>
                    <Dialog.Popup>Dialog Content</Dialog.Popup>
                  </Dialog.Portal>
                </Dialog.Root>
              </Show>

              <Show when={mode() === 'controlled'}>
                <Dialog.Root handle={testDialog} open triggerId="trigger">
                  <Dialog.Portal>
                    <Dialog.Popup>Dialog Content</Dialog.Popup>
                  </Dialog.Portal>
                </Dialog.Root>
              </Show>
            </div>
          );
        }

        const { user } = await render(() => <App />);

        await user.click(screen.getByRole('button', { name: 'Unmount root' }));
        expect(screen.queryByText('Dialog Content')).toBe(null);

        await user.click(screen.getByRole('button', { name: 'Remount controlled root' }));
        await waitFor(() => {
          expect(screen.getByText('Dialog Content')).toBeVisible();
        });

        expect(
          consoleError.mock.calls.some(([message]) => {
            return (
              typeof message === 'string' &&
              message.includes('controlled state of openProp') &&
              message.includes('controlled')
            );
          }),
        ).toBe(false);
      } finally {
        consoleError.mockRestore();
      }
    });

    it('keeps ARIA controls in sync when a detached handle is recreated while open', async () => {
      function DetachedTriggerTest(props: { handle: ReturnType<typeof Dialog.createHandle> }) {
        return (
          <>
            <Dialog.Trigger id="trigger" handle={props.handle}>
              Trigger
            </Dialog.Trigger>
            <Dialog.Root handle={props.handle} open triggerId="trigger" modal={false}>
              <Dialog.Portal>
                <Dialog.Popup data-testid="popup">Dialog Content</Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>
          </>
        );
      }

      const { setProps } = await renderWithProps(DetachedTriggerTest, {
        handle: Dialog.createHandle(),
      });

      let trigger = screen.getByRole('button', { name: 'Trigger' });
      let popup = await screen.findByTestId('popup');

      await waitFor(() => {
        expect(trigger.getAttribute('aria-controls')).toBe(popup.getAttribute('id'));
      });

      await setProps({ handle: Dialog.createHandle() });

      trigger = screen.getByRole('button', { name: 'Trigger' });
      popup = await screen.findByTestId('popup');

      await waitFor(() => {
        expect(trigger.getAttribute('aria-controls')).toBe(popup.getAttribute('id'));
      });
    });

    it('keeps the payload reactive', async () => {
      type NumberAccessorPayload = { payload: Accessor<(() => number) | undefined> };
      const testDialog = Dialog.createHandle<() => number>();
      function Triggers() {
        // Setting up triggers in a separate component so payload is in their local state
        // and updating it does not cause the Dialog.Root to re-render automatically.
        // This verifies that the payload is reactive and not only set on mount or on trigger click.
        const [payloads, setPayloads] = createSignal([1, 2]);

        return (
          <div>
            <Dialog.Trigger id="trigger-1" payload={() => payloads()[0]} handle={testDialog}>
              Dialog 1
            </Dialog.Trigger>
            <Dialog.Trigger id="trigger-2" payload={() => payloads()[1]} handle={testDialog}>
              Dialog 2
            </Dialog.Trigger>
            <button type="button" onClick={() => setPayloads([8, 16])}>
              Update payloads
            </button>
          </div>
        );
      }

      function App() {
        return (
          <div>
            <Triggers />
            <Dialog.Root modal={false} disablePointerDismissal={true} handle={testDialog}>
              {({ payload }: NumberAccessorPayload) => (
                <Dialog.Portal>
                  <Dialog.Popup>
                    <span data-testid="content">{payload()?.()}</span>
                  </Dialog.Popup>
                </Dialog.Portal>
              )}
            </Dialog.Root>
          </div>
        );
      }

      const { user } = await render(() => <App />);

      const trigger1 = screen.getByRole('button', { name: 'Dialog 1' });
      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });

      const updateButton = screen.getByRole('button', { name: 'Update payloads' });
      await user.click(updateButton);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('8');
      });
    });

    it('closes a non-modal dialog with Escape from an inactive detached trigger', async () => {
      const testDialog = Dialog.createHandle();
      const { user } = await render(() => (
        <>
          <Dialog.Trigger handle={testDialog}>Trigger 1</Dialog.Trigger>
          <Dialog.Trigger handle={testDialog}>Trigger 2</Dialog.Trigger>
          <Dialog.Root handle={testDialog} modal={false}>
            <Dialog.Portal>
              <Dialog.Popup>Dialog Content</Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      ));

      await user.click(screen.getByRole('button', { name: 'Trigger 1' }));
      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeVisible();
      });

      const inactiveTrigger = screen.getByRole('button', { name: 'Trigger 2' });
      inactiveTrigger.focus();
      await flushMicrotasks();
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Dialog Content')).toBe(null);
      });
    });
  });

  describe('imperative actions on the handle', () => {
    it('associates an imperative open-by-id with a persistent detached trigger after the root remounts', async () => {
      const dialog = Dialog.createHandle<number>();

      function App() {
        const [mounted, setMounted] = createSignal(true);

        return (
          <div>
            <Dialog.Trigger handle={dialog} id="trigger" payload={7}>
              Trigger
            </Dialog.Trigger>
            <Show when={!mounted()}>
              <button type="button" onClick={() => setMounted(true)}>
                Remount root
              </button>
            </Show>
            <Show when={mounted()}>
              <Dialog.Root handle={dialog}>
                {({ payload }: { payload: Accessor<number | undefined> }) => (
                  <>
                    <span data-testid="payload">{payload() ?? 'No payload'}</span>
                    <Dialog.Portal>
                      <Dialog.Popup>
                        Dialog Content
                        <button type="button" onClick={() => setMounted(false)}>
                          Unmount root
                        </button>
                      </Dialog.Popup>
                    </Dialog.Portal>
                  </>
                )}
              </Dialog.Root>
            </Show>
          </div>
        );
      }

      const { user } = await render(() => <App />);
      const trigger = screen.getByRole('button', { name: 'Trigger' });

      dialog.open('trigger');
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeVisible();
      });
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger.getAttribute('aria-controls')).toBe(
        screen.getByRole('dialog').getAttribute('id'),
      );
      expect(screen.getByTestId('payload').textContent).toBe('7');

      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Unmount root' }),
      );
      expect(screen.queryByRole('dialog')).toBe(null);

      await user.click(screen.getByRole('button', { name: 'Remount root' }));
      await waitFor(() => {
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
      });

      // The trigger stayed mounted across the remount, so an imperative open-by-id must still
      // associate it (ARIA + payload), not open unassociated.
      dialog.open('trigger');
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.getByText('Dialog Content')).toBeVisible();
      });
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger.getAttribute('aria-controls')).toBe(
        screen.getByRole('dialog').getAttribute('id'),
      );
      expect(screen.getByTestId('payload').textContent).toBe('7');
    });

    it('stops resolving a handle-A trigger after the root switches to handle B', async () => {
      const handleA = Dialog.createHandle<number>();
      const handleB = Dialog.createHandle<number>();
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        function App() {
          const [handle, setHandle] = createSignal(handleA);
          return (
            <div>
              <Dialog.Trigger handle={handleA} id="a" payload={1}>
                A trigger
              </Dialog.Trigger>
              <button type="button" onClick={() => setHandle(handleB)}>
                Switch root to B
              </button>
              <Dialog.Root handle={handle()} modal={false} disablePointerDismissal>
                <Dialog.Portal>
                  <Dialog.Popup>Dialog Content</Dialog.Popup>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          );
        }

        const { user } = await render(() => <App />);
        const aTrigger = screen.getByRole('button', { name: 'A trigger' });

        // Positive control: while the root is on handle A, opening by the A-trigger's id associates it.
        handleA.open('a');
        await flushMicrotasks();
        await waitFor(() => {
          expect(screen.getByText('Dialog Content')).toBeVisible();
        });
        expect(aTrigger).toHaveAttribute('aria-expanded', 'true');
        handleA.close();
        await flushMicrotasks();
        await waitFor(() => {
          expect(screen.queryByText('Dialog Content')).toBe(null);
        });

        // The A-trigger stays mounted on handle A; only the root moves to handle B.
        await user.click(screen.getByRole('button', { name: 'Switch root to B' }));

        // Handle B's root must no longer resolve the handle-A trigger: the trigger followed its own
        // handle's store off the root's store, so open-by-id finds nothing and warns.
        consoleWarn.mockClear();
        handleB.open('a');
        await flushMicrotasks();
        await waitFor(() => {
          expect(screen.getByText('Dialog Content')).toBeVisible();
        });
        expect(aTrigger).toHaveAttribute('aria-expanded', 'false');
        expect(
          consoleWarn.mock.calls.some(
            ([message]) => typeof message === 'string' && message.includes('No trigger found'),
          ),
        ).toBe(true);
      } finally {
        consoleWarn.mockRestore();
      }
    });

    it('does not associate the only rendered trigger when opened with a payload', async () => {
      const dialog = Dialog.createHandle<string>();
      const { user } = await render(() => (
        <div>
          <Dialog.Trigger handle={dialog} id="trigger" payload="from trigger">
            Trigger
          </Dialog.Trigger>
          <Dialog.Root handle={dialog}>
            {({ payload }: { payload: Accessor<string | undefined> }) => (
              <Dialog.Portal>
                <Dialog.Popup data-testid="content">{payload()}</Dialog.Popup>
              </Dialog.Portal>
            )}
          </Dialog.Root>
        </div>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });

      dialog.openWithPayload('from openWithPayload');
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBe(null);
      });

      expect(screen.getByTestId('content').textContent).toBe('from openWithPayload');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).not.toHaveAttribute('aria-controls');
      expect(trigger).not.toHaveAttribute('data-popup-open');

      dialog.close();
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBe(null);
      });

      // Opening through the trigger afterwards still associates it and forwards its payload.
      await user.click(trigger);
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBe(null);
      });
      expect(screen.getByTestId('content').textContent).toBe('from trigger');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger.getAttribute('aria-controls')).toBe(
        screen.getByRole('dialog').getAttribute('id'),
      );
    });

    it('does not let a trigger that mounts while open replace the programmatic payload', async () => {
      const dialog = Dialog.createHandle<string>();

      function App(props: { showTrigger: boolean }) {
        return (
          <div>
            <Show when={props.showTrigger}>
              <Dialog.Trigger handle={dialog} id="trigger" payload="from trigger">
                Trigger
              </Dialog.Trigger>
            </Show>
            <Dialog.Root handle={dialog}>
              {({ payload }: { payload: Accessor<string | undefined> }) => (
                <Dialog.Portal>
                  <Dialog.Popup data-testid="content">{payload()}</Dialog.Popup>
                </Dialog.Portal>
              )}
            </Dialog.Root>
          </div>
        );
      }

      const { setProps } = await renderWithProps(App, { showTrigger: false });

      dialog.openWithPayload('from openWithPayload');
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBe(null);
      });
      expect(screen.getByTestId('content').textContent).toBe('from openWithPayload');

      await setProps({ showTrigger: true });

      expect(screen.getByTestId('content').textContent).toBe('from openWithPayload');
      // The modal dialog hides the rest of the page from the accessibility tree.
      const trigger = screen.getByRole('button', { name: 'Trigger', hidden: true });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).not.toHaveAttribute('aria-controls');
    });

    it('keeps the programmatic payload when a controlled dialog declines a close request', async () => {
      const dialog = Dialog.createHandle<string>();

      function App(props: { showTrigger: boolean }) {
        const [open, setOpen] = createSignal(false);

        return (
          <div>
            <Show when={props.showTrigger}>
              <Dialog.Trigger handle={dialog} id="trigger" payload="from trigger">
                Trigger
              </Dialog.Trigger>
            </Show>
            <Dialog.Root
              handle={dialog}
              open={open()}
              onOpenChange={(nextOpen) => {
                // Accept opens, but keep the dialog open on close requests.
                if (nextOpen) {
                  setOpen(true);
                }
              }}
            >
              {({ payload }: { payload: Accessor<string | undefined> }) => (
                <Dialog.Portal>
                  <Dialog.Popup data-testid="content">{payload()}</Dialog.Popup>
                </Dialog.Portal>
              )}
            </Dialog.Root>
          </div>
        );
      }

      const { setProps } = await renderWithProps(App, { showTrigger: false });

      dialog.openWithPayload('from openWithPayload');
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBe(null);
      });

      // The close request is declined, so the dialog stays open without a trigger.
      dialog.close();
      await flushMicrotasks();
      expect(screen.queryByRole('dialog')).not.toBe(null);
      expect(dialog.isOpen).toBe(true);

      await setProps({ showTrigger: true });

      expect(screen.getByTestId('content').textContent).toBe('from openWithPayload');
      const trigger = screen.getByRole('button', { name: 'Trigger', hidden: true });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).not.toHaveAttribute('aria-controls');
    });
  });
});
