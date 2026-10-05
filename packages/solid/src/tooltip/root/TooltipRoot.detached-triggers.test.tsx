import { vi, expect, describe, beforeEach, it } from 'vitest';
import { createSignal, flush, Show } from 'solid-js';
import type { Accessor } from 'solid-js';
import { render as solidRender } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import {
  createRenderer,
  isJSDOM,
  resetBrowserPointer,
  screen,
  waitFor,
  fireEvent,
  flushMicrotasks,
  renderToString,
} from '#test-utils';
import { Tooltip } from 'base-ui-solid/tooltip';
import {
  ControlledRootWithSwitchableTrigger,
  DefaultOpenDetachedRoot,
  DetachedTrigger,
  getFixtureContext,
} from './TooltipRoot.detached-triggers.fixtures';

// Port note: counterpart of `@mui/internal-test-utils`' `randomStringValue`.
function randomStringValue() {
  return `s${Math.random().toString(36).slice(2)}`;
}

// Port note: React focuses `autoFocus` elements when they mount, Solid only sets the attribute.
// This ref callback focuses the element once it's connected, like React's commit phase.
function autoFocus(element: HTMLElement) {
  queueMicrotask(() => {
    element.focus();
  });
}

describe('<Tooltip.Root />', () => {
  // Tests here leave the real pointer resting on a trigger, which the next render would put a
  // fresh trigger under, opening the tooltip before the test interacts.
  beforeEach(resetBrowserPointer);

  beforeEach(async () => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;

    document.body.click();
    await flushMicrotasks();

    // Wait for all tooltips to unmount (`expect` is not allowed outside test blocks)
    await waitFor(() => {
      const tooltips = document.querySelectorAll('[data-open]');
      if (tooltips.length > 0) {
        throw new Error(`${tooltips.length} tooltips still mounted`);
      }
    });
  });

  const { render, clock } = createRenderer();

  it.skipIf(!isJSDOM)(
    'keeps a default-open root open until its detached trigger hydrates',
    async () => {
      // Port note: upstream suspends the trigger's hydration with a `React.Suspense` boundary.
      // Here the root and the trigger are server-rendered separately, and the trigger's markup is
      // hydrated after the root's, which leaves the trigger unhydrated in the meantime.
      const fixtureKey = randomStringValue();
      const handle = getFixtureContext(fixtureKey).handle;

      const { hydrate } = await renderToString(DefaultOpenDetachedRoot, { fixtureKey });
      const { hydrate: hydrateTrigger } = await renderToString(DetachedTrigger, {
        fixtureKey,
        id: 'trigger',
        label: 'Trigger',
      });
      const trigger = screen.getByRole('button', { name: 'Trigger' });
      expect(trigger).not.toHaveAttribute('data-popup-open');

      hydrate();

      try {
        await waitFor(() => {
          expect(handle.isOpen).toBe(true);
        });
        await flushMicrotasks();
        expect(handle.isOpen).toBe(true);
      } finally {
        hydrateTrigger();
        await flushMicrotasks();
      }

      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-popup-open');
      });
    },
  );

  it.skipIf(!isJSDOM)(
    'keeps an open root open when ownership moves to a trigger that has not hydrated',
    async () => {
      const fixtureKey = randomStringValue();
      const fixtureContext = getFixtureContext(fixtureKey);
      const handle = fixtureContext.handle;
      const onOpenChange = vi.fn();
      fixtureContext.onOpenChange = onOpenChange;

      const { hydrate } = await renderToString(ControlledRootWithSwitchableTrigger, {
        fixtureKey,
      });
      // Port note: upstream server-renders `<TriggerB />` into a separate container and hydrates it
      // later with `ReactDOMClient.hydrateRoot`. `renderToString` does both here (it also removes
      // the container when the test finishes).
      const { hydrate: hydrateTriggerB } = await renderToString(DetachedTrigger, {
        fixtureKey,
        id: 'trigger-b',
        label: 'Trigger B',
      });

      hydrate();

      await waitFor(() => {
        expect(handle.isOpen).toBe(true);
      });

      fireEvent.click(screen.getByRole('button', { name: 'Switch to B' }));
      await flushMicrotasks();

      expect(onOpenChange).not.toHaveBeenCalled();
      expect(handle.isOpen).toBe(true);

      hydrateTriggerB();
      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Trigger B' })).toHaveAttribute(
          'data-popup-open',
        );
      });
    },
  );

  describe.skipIf(isJSDOM)('handle-backed root ownership', () => {
    type NumberPayload = { payload: Accessor<number | undefined> };

    it('keeps a default-open root open while a detached trigger migrates after the initial commit', async () => {
      const handle = Tooltip.createHandle();
      const onOpenChange = vi.fn();
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const container = document.createElement('div');
      document.body.appendChild(container);

      let isOpen = false;
      let popupIsOpen = false;
      let unexpectedErrors: unknown[][] = [];
      let dispose: (() => void) | undefined;

      try {
        // Port note: rendered with Solid's `render` directly (counterpart of
        // `ReactDOMClient.createRoot(container).render(…)` outside `act`), without flushing.
        dispose = solidRender(
          () => (
            <>
              <Tooltip.Root
                handle={handle}
                defaultOpen
                defaultTriggerId="trigger"
                onOpenChange={onOpenChange}
              >
                <Tooltip.Portal>
                  <Tooltip.Positioner>
                    <Tooltip.Popup data-testid="default-open-content">Content</Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
              <Tooltip.Trigger handle={handle} id="trigger">
                Trigger
              </Tooltip.Trigger>
            </>
          ),
          container,
        );

        // Rendering outside act preserves the browser's native ordering: the queued "lost trigger"
        // microtask runs before useSyncExternalStore's passive subscription migrates the trigger.
        await waitFor(() => {
          expect(screen.getByRole('button', { name: 'Trigger' })).toHaveAttribute(
            'data-popup-open',
          );
        });

        isOpen = handle.isOpen;
        popupIsOpen =
          document
            .querySelector('[data-testid="default-open-content"]')
            ?.hasAttribute('data-open') ?? false;
      } finally {
        dispose?.();
        container.remove();
        // The spy only exists to silence the act() warnings caused by rendering outside act.
        unexpectedErrors = consoleError.mock.calls.filter(
          (call) => !String(call[0]).includes('act(...)'),
        );
        consoleError.mockRestore();
      }

      expect(unexpectedErrors).toEqual([]);
      expect(isOpen).toBe(true);
      expect(popupIsOpen).toBe(true);
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('ignores imperative handle calls made before a root is attached', async () => {
      const handle = Tooltip.createHandle<number>();

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      handle.open('trigger');
      handle.close();
      const detachedWarnings = consoleWarn.mock.calls.filter(
        ([message]) =>
          typeof message === 'string' && message.includes('no root using this handle is mounted'),
      );
      consoleWarn.mockRestore();

      expect(handle.isOpen).toBe(false);
      expect(detachedWarnings).toHaveLength(2);

      await render(() => (
        <div>
          <Tooltip.Trigger handle={handle} id="trigger" payload={1}>
            Trigger
          </Tooltip.Trigger>
          <Tooltip.Root handle={handle}>
            {/* Port note: `payload` is an accessor. */}
            {({ payload }: NumberPayload) => (
              <>
                <span data-testid="payload">{payload() ?? 'No payload'}</span>
                <Tooltip.Portal>
                  <Tooltip.Positioner>
                    <Tooltip.Popup data-testid="content">Content</Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </>
            )}
          </Tooltip.Root>
        </div>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      expect(screen.queryByTestId('content')).toBe(null);
      expect(screen.getByTestId('payload').textContent).toBe('No payload');

      handle.open('trigger');
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByTestId('content')).not.toBe(null);
      });
      expect(screen.getByTestId('payload').textContent).toBe('1');
      expect(trigger).toHaveAttribute('data-popup-open');
    });

    it('ignores imperative handle calls made after the root is detached', async () => {
      const handle = Tooltip.createHandle<number>();

      function App() {
        const [mounted, setMounted] = createSignal(true);

        return (
          <div>
            <Tooltip.Trigger handle={handle} id="trigger" payload={1}>
              Trigger
            </Tooltip.Trigger>
            <Show when={!mounted()}>
              <button type="button" onClick={() => setMounted(true)}>
                Remount root
              </button>
            </Show>
            <Show when={mounted()}>
              <Tooltip.Root handle={handle}>
                {/* Port note: `payload` is an accessor. */}
                {({ payload }: NumberPayload) => (
                  <>
                    <span data-testid="payload">{payload() ?? 'No payload'}</span>
                    <button type="button" onClick={() => setMounted(false)}>
                      Unmount root
                    </button>
                    <Tooltip.Portal>
                      <Tooltip.Positioner>
                        <Tooltip.Popup data-testid="content">Content</Tooltip.Popup>
                      </Tooltip.Positioner>
                    </Tooltip.Portal>
                  </>
                )}
              </Tooltip.Root>
            </Show>
          </div>
        );
      }

      const { user } = await render(() => <App />);

      handle.open('trigger');
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByTestId('content')).not.toBe(null);
      });
      expect(screen.getByTestId('payload').textContent).toBe('1');

      await user.click(screen.getByRole('button', { name: 'Unmount root' }));
      await flushMicrotasks();
      expect(handle.isOpen).toBe(false);
      await waitFor(() => {
        expect(screen.queryByTestId('content')).toBe(null);
      });

      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      handle.open('trigger');
      handle.close();
      const detachedWarnings = consoleWarn.mock.calls.filter(
        ([message]) =>
          typeof message === 'string' && message.includes('no root using this handle is mounted'),
      );
      consoleWarn.mockRestore();

      expect(handle.isOpen).toBe(false);
      expect(detachedWarnings).toHaveLength(2);

      await user.click(screen.getByRole('button', { name: 'Remount root' }));
      await flushMicrotasks();
      expect(screen.queryByTestId('content')).toBe(null);
      expect(screen.getByTestId('payload').textContent).toBe('No payload');

      handle.open('trigger');
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByTestId('content')).not.toBe(null);
      });
      expect(screen.getByTestId('payload').textContent).toBe('1');
    });

    it('registers a detached trigger declared after the root', async () => {
      const handle = Tooltip.createHandle();

      await render(() => (
        <div>
          <Tooltip.Root handle={handle}>
            <Tooltip.Portal>
              <Tooltip.Positioner>
                <Tooltip.Popup data-testid="content">Content</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
          <Tooltip.Trigger handle={handle} id="trigger">
            Trigger
          </Tooltip.Trigger>
        </div>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });

      handle.open('trigger');
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByTestId('content')).not.toBe(null);
      });

      expect(trigger).toHaveAttribute('data-popup-open');
    });

    it('throws when called with an unregistered trigger id', async () => {
      const handle = Tooltip.createHandle();

      await render(() => (
        <div>
          <Tooltip.Root handle={handle}>
            <Tooltip.Portal>
              <Tooltip.Positioner>
                <Tooltip.Popup data-testid="content">Content</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
          <Tooltip.Trigger handle={handle} id="trigger">
            Trigger
          </Tooltip.Trigger>
        </div>
      ));

      expect(() => handle.open('missing')).toThrow('was called with the trigger id "missing"');
      expect(handle.isOpen).toBe(false);
    });

    describe('multiple roots sharing one handle', () => {
      // Fake timers so the deferred overlap check only runs when ticked, after the handoff settles.
      clock.withFakeTimers();

      it('warns when a handle stays attached to more than one mounted root', async () => {
        const handle = Tooltip.createHandle();
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await render(() => (
          <div>
            <Tooltip.Root handle={handle}>
              <Tooltip.Portal>
                <Tooltip.Positioner>
                  <Tooltip.Popup>First</Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
            <Tooltip.Root handle={handle}>
              <Tooltip.Portal>
                <Tooltip.Positioner>
                  <Tooltip.Popup>Second</Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
        ));

        // Both roots stay mounted, so the deferred check still sees the overlap and warns.
        clock.tick(20);

        const overlapWarned = consoleWarn.mock.calls.some(
          ([message]) =>
            typeof message === 'string' && message.includes('more than one mounted root'),
        );
        expect(overlapWarned).toBe(true);
        consoleWarn.mockRestore();
      });

      it('resolves a trigger still registered to the previous root during a transient overlap', async () => {
        const handle = Tooltip.createHandle();
        const openErrors: unknown[] = [];

        function OpenOnMount() {
          useIsoLayoutEffect(
            () => {
              try {
                handle.open('trigger');
              } catch (error) {
                openErrors.push(error);
              }
            },
            () => [],
          );
          return null;
        }

        type Phase = 'outgoing' | 'overlap' | 'incoming';
        const [phase, setPhase] = createSignal<Phase>('outgoing');

        // Port note: the `key`s are dropped; each `<Show>` keeps its root mounted while its
        // condition stays truthy, like React keeps the keyed element.
        function App(props: { phase: Phase }) {
          return (
            <>
              <Tooltip.Trigger handle={handle} id="trigger">
                Trigger
              </Tooltip.Trigger>
              <Show when={props.phase === 'outgoing' || props.phase === 'overlap'}>
                <Tooltip.Root handle={handle}>
                  <Tooltip.Portal>
                    <Tooltip.Positioner>
                      <Tooltip.Popup>Outgoing</Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Show>
              <Show when={props.phase === 'overlap' || props.phase === 'incoming'}>
                <>
                  <Tooltip.Root handle={handle}>
                    <Tooltip.Portal>
                      <Tooltip.Positioner>
                        <Tooltip.Popup>Incoming</Tooltip.Popup>
                      </Tooltip.Positioner>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                  <OpenOnMount />
                </>
              </Show>
            </>
          );
        }

        // Port note: `setProps` -> a signal write, then a flush.
        async function setProps(props: { phase: Phase }) {
          setPhase(props.phase);
          await flushMicrotasks();
        }

        // The detached trigger settles into the outgoing root's store (it is no longer in the
        // fallback map). The incoming root then attaches while the outgoing one is still mounted,
        // and a layout effect in that same commit opens by trigger id — before the trigger has
        // migrated to the incoming root's store.
        await render(() => <App phase={phase()} />);
        await setProps({ phase: 'overlap' });

        expect(openErrors).toHaveLength(0);
        expect(handle.isOpen).toBe(true);
        expect(screen.getByRole('button', { name: 'Trigger' })).toHaveAttribute('data-popup-open');

        // Completing the handoff (the outgoing root unmounts) keeps the popup open and associated.
        await setProps({ phase: 'incoming' });
        expect(handle.isOpen).toBe(true);
      });
    });
  });

  describe.skipIf(isJSDOM)('multiple triggers within Root', () => {
    type NumberPayload = { payload: Accessor<number | undefined> };

    it('should open the tooltip with any trigger on hover', async () => {
      vi.spyOn(console, 'error').mockImplementation((...args) => {
        if (args[0] === 'null') {
          // a bug in vitest prints specific browser errors as "null"
          // See https://github.com/vitest-dev/vitest/issues/9285
          // TODO(@mui/base): debug why this test triggers "ResizeObserver loop completed with undelivered notifications"
          // It seems related to @testing-library/user-event. Native vitest `userEvent` does not trigger it.
          return;
        }
        console.error(...args);
      });

      const popupId = randomStringValue();
      await render(() => (
        <Tooltip.Root>
          <input type="text" aria-label="Initial focus" autofocus ref={autoFocus} />
          <Tooltip.Trigger delay={0} style={{ 'pointer-events': 'none' }}>
            Trigger 1
          </Tooltip.Trigger>
          <Tooltip.Trigger delay={0} style={{ 'pointer-events': 'none' }}>
            Trigger 2
          </Tooltip.Trigger>
          <Tooltip.Trigger delay={0} style={{ 'pointer-events': 'none' }}>
            Trigger 3
          </Tooltip.Trigger>

          <Tooltip.Portal>
            <Tooltip.Positioner>
              <Tooltip.Popup data-testid={popupId}>Tooltip Content</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });

      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBe(null);
      });

      // Port note: `fireEvent` doesn't flush Solid (upstream's is wrapped in `act`), so flush
      // before asserting.
      fireEvent.mouseEnter(trigger1);
      fireEvent.mouseMove(trigger1);
      flush();
      // Port note: Floating UI resolves positioning asynchronously after Solid mounts the popup.
      expect(screen.queryByTestId(popupId)).not.toBe(null);
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBeVisible();
      });
      fireEvent.mouseLeave(trigger1);
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBe(null);
      });

      fireEvent.mouseEnter(trigger2);
      fireEvent.mouseMove(trigger2);
      flush();
      // Port note: Floating UI resolves positioning asynchronously after Solid mounts the popup.
      expect(screen.queryByTestId(popupId)).not.toBe(null);
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBeVisible();
      });
      fireEvent.mouseLeave(trigger2);
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBe(null);
      });

      fireEvent.mouseEnter(trigger3);
      fireEvent.mouseMove(trigger3);
      flush();
      // Port note: Floating UI resolves positioning asynchronously after Solid mounts the popup.
      expect(screen.queryByTestId(popupId)).not.toBe(null);
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBeVisible();
      });
      fireEvent.mouseLeave(trigger3);
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBe(null);
      });
    });

    it('should open the tooltip with any trigger on focus', async () => {
      await render(() => (
        <Tooltip.Root>
          <Tooltip.Trigger style={{ 'pointer-events': 'none' }}>Trigger 1</Tooltip.Trigger>
          <Tooltip.Trigger style={{ 'pointer-events': 'none' }}>Trigger 2</Tooltip.Trigger>
          <Tooltip.Trigger style={{ 'pointer-events': 'none' }}>Trigger 3</Tooltip.Trigger>

          <Tooltip.Portal>
            <Tooltip.Positioner>
              <Tooltip.Popup>Tooltip Content</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });

      expect(screen.queryByText('Tooltip Content')).toBe(null);

      trigger1.focus();
      await flushMicrotasks();
      await flushMicrotasks();
      // Port note: Floating UI resolves positioning asynchronously after Solid mounts the popup.
      expect(screen.queryByText('Tooltip Content')).not.toBe(null);
      await waitFor(() => {
        expect(screen.getByText('Tooltip Content')).toBeVisible();
      });
      trigger1.blur();
      await flushMicrotasks();
      // Port note: useFocus closes in a zero-delay task, after the microtask flush.
      await waitFor(() => {
        expect(screen.queryByText('Tooltip Content')).toBe(null);
      });

      trigger2.focus();
      await flushMicrotasks();
      await flushMicrotasks();
      // Port note: Floating UI resolves positioning asynchronously after Solid mounts the popup.
      expect(screen.queryByText('Tooltip Content')).not.toBe(null);
      await waitFor(() => {
        expect(screen.getByText('Tooltip Content')).toBeVisible();
      });
      trigger2.blur();
      await flushMicrotasks();
      // Port note: useFocus closes in a zero-delay task, after the microtask flush.
      await waitFor(() => {
        expect(screen.queryByText('Tooltip Content')).toBe(null);
      });

      trigger3.focus();
      await flushMicrotasks();
      await flushMicrotasks();
      // Port note: Floating UI resolves positioning asynchronously after Solid mounts the popup.
      expect(screen.queryByText('Tooltip Content')).not.toBe(null);
      await waitFor(() => {
        expect(screen.getByText('Tooltip Content')).toBeVisible();
      });
      trigger3.blur();
      await flushMicrotasks();
      // Port note: useFocus closes in a zero-delay task, after the microtask flush.
      await waitFor(() => {
        expect(screen.queryByText('Tooltip Content')).toBe(null);
      });
    });

    it('should set the payload and render content based on its value', async () => {
      await render(() => (
        <Tooltip.Root>
          {/* Port note: `payload` is an accessor. */}
          {({ payload }: NumberPayload) => (
            <>
              <Tooltip.Trigger payload={1} delay={0} style={{ 'pointer-events': 'none' }}>
                Trigger 1
              </Tooltip.Trigger>
              <Tooltip.Trigger payload={2} delay={0} style={{ 'pointer-events': 'none' }}>
                Trigger 2
              </Tooltip.Trigger>

              <Tooltip.Portal>
                <Tooltip.Positioner>
                  <Tooltip.Popup>
                    <span data-testid="content">{payload()}</span>
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </>
          )}
        </Tooltip.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      fireEvent.mouseEnter(trigger1);
      fireEvent.mouseMove(trigger1);
      flush();
      expect(screen.getByTestId('content').textContent).toBe('1');

      fireEvent.mouseLeave(trigger1);
      fireEvent.mouseEnter(trigger2);
      fireEvent.mouseMove(trigger2);
      flush();
      expect(screen.getByTestId('content').textContent).toBe('2');
    });

    it('hands off open state and payload to a trigger with its own DOM id while open', async () => {
      await render(() => (
        <Tooltip.Root>
          {/* Port note: `payload` is an accessor. */}
          {({ payload }: NumberPayload) => (
            <>
              <Tooltip.Trigger
                payload={1}
                delay={0}
                closeDelay={0}
                style={{ 'pointer-events': 'none' }}
              >
                Trigger 1
              </Tooltip.Trigger>
              {/* Port note: `render={<button id="custom-button" type="button" />}` (React
                  element) -> a render function. */}
              <Tooltip.Trigger
                payload={2}
                delay={0}
                closeDelay={0}
                style={{ 'pointer-events': 'none' }}
                render={(props) => <button {...props} id="custom-button" type="button" />}
              >
                Trigger 2
              </Tooltip.Trigger>

              <Tooltip.Portal>
                <Tooltip.Positioner>
                  <Tooltip.Popup>
                    <span data-testid="content">{payload()}</span>
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </>
          )}
        </Tooltip.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      // Focus handoff keeps the popup open across the switch, so `open`/`triggerCount` do not change.
      trigger1.focus();
      await flushMicrotasks();
      await flushMicrotasks();
      expect(screen.getByTestId('content').textContent).toBe('1');

      trigger2.focus();
      await flushMicrotasks();
      await flushMicrotasks();
      expect(trigger2).toHaveAttribute('data-popup-open');
      expect(screen.getByTestId('content').textContent).toBe('2');
    });

    it('should close when the active trigger unmounts', async () => {
      let removeFirstTrigger: () => void = () => {};

      function Test() {
        const [showFirstTrigger, setShowFirstTrigger] = createSignal(true);
        removeFirstTrigger = () => setShowFirstTrigger(false);

        return (
          <div style={{ padding: '50px' }}>
            <Tooltip.Root defaultOpen defaultTriggerId="trigger-1">
              {/* Port note: `payload` is an accessor. */}
              {({ payload }: NumberPayload) => (
                <>
                  <div style={{ display: 'flex', gap: '120px' }}>
                    <Show when={showFirstTrigger()}>
                      <Tooltip.Trigger id="trigger-1" payload={1} delay={0}>
                        Trigger 1
                      </Tooltip.Trigger>
                    </Show>
                    <Tooltip.Trigger id="trigger-2" payload={2} delay={0}>
                      Trigger 2
                    </Tooltip.Trigger>
                  </div>

                  <Tooltip.Portal>
                    <Tooltip.Positioner side="bottom" align="start">
                      <Tooltip.Popup>
                        <span data-testid="content">{payload()}</span>
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </>
              )}
            </Tooltip.Root>
          </div>
        );
      }

      await render(() => <Test />);

      expect(await screen.findByTestId('content')).toHaveTextContent('1');

      removeFirstTrigger();
      await flushMicrotasks();

      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Trigger 1' })).toBe(null);
        expect(trigger2).not.toHaveAttribute('data-popup-open');
        expect(screen.queryByTestId('content')).toBe(null);
      });
    });

    it('should remain open when the active trigger unmount close is canceled', async () => {
      let removeFirstTrigger: () => void = () => {};
      const onOpenChange = vi.fn((nextOpen, details: Tooltip.Root.ChangeEventDetails) => {
        if (!nextOpen) {
          details.cancel();
        }
      });

      function Test() {
        const [showFirstTrigger, setShowFirstTrigger] = createSignal(true);
        removeFirstTrigger = () => setShowFirstTrigger(false);

        return (
          <div style={{ padding: '50px' }}>
            <Tooltip.Root defaultOpen defaultTriggerId="trigger-1" onOpenChange={onOpenChange}>
              {/* Port note: `payload` is an accessor. */}
              {({ payload }: NumberPayload) => (
                <>
                  <div style={{ display: 'flex', gap: '120px' }}>
                    <Show when={showFirstTrigger()}>
                      <Tooltip.Trigger id="trigger-1" payload={1} delay={0}>
                        Trigger 1
                      </Tooltip.Trigger>
                    </Show>
                    <Tooltip.Trigger id="trigger-2" payload={2} delay={0}>
                      Trigger 2
                    </Tooltip.Trigger>
                  </div>

                  <Tooltip.Portal>
                    <Tooltip.Positioner side="bottom" align="start">
                      <Tooltip.Popup>
                        <span data-testid="content">{payload()}</span>
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </>
              )}
            </Tooltip.Root>
          </div>
        );
      }

      await render(() => <Test />);

      expect(await screen.findByTestId('content')).toHaveTextContent('1');

      removeFirstTrigger();
      await flushMicrotasks();

      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Trigger 1' })).toBe(null);
        expect(onOpenChange).toHaveBeenCalledWith(
          false,
          expect.objectContaining({ reason: 'none' }),
        );
        expect(trigger2).not.toHaveAttribute('data-popup-open');
        expect(screen.getByTestId('content')).toHaveTextContent('1');
      });
    });

    it('should reuse the popup and positioner DOM nodes when switching triggers', async () => {
      await render(() => (
        <Tooltip.Root>
          {/* Port note: `payload` is an accessor. */}
          {({ payload }: NumberPayload) => (
            <>
              <Tooltip.Trigger payload={1} delay={0}>
                Trigger 1
              </Tooltip.Trigger>
              <Tooltip.Trigger payload={2} delay={0}>
                Trigger 2
              </Tooltip.Trigger>

              <Tooltip.Portal>
                <Tooltip.Positioner data-testid="positioner">
                  <Tooltip.Popup data-testid="popup">
                    <span>{payload()}</span>
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </>
          )}
        </Tooltip.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      trigger1.focus();
      await flushMicrotasks();
      const popupElement = screen.getByTestId('popup');
      const positionerElement = screen.getByTestId('positioner');

      trigger2.focus();
      await flushMicrotasks();
      expect(screen.getByTestId('positioner')).toBe(positionerElement);
      expect(screen.getByTestId('popup')).toBe(popupElement);
    });

    it('should allow controlling the tooltip state programmatically', async () => {
      function Test() {
        const [open, setOpen] = createSignal(false);
        const [activeTrigger, setActiveTrigger] = createSignal<string | null>(null);

        return (
          <div>
            <Tooltip.Root
              open={open()}
              triggerId={activeTrigger()}
              onOpenChange={(nextOpen, details) => {
                setActiveTrigger(details.trigger?.id ?? null);
                setOpen(nextOpen);
              }}
            >
              {/* Port note: `payload` is an accessor. */}
              {({ payload }: NumberPayload) => (
                <>
                  <Tooltip.Trigger payload={1} id="trigger-1" delay={0}>
                    Trigger 1
                  </Tooltip.Trigger>
                  <Tooltip.Trigger payload={2} id="trigger-2" delay={0}>
                    Trigger 2
                  </Tooltip.Trigger>

                  <Tooltip.Portal>
                    <Tooltip.Positioner>
                      <Tooltip.Popup>
                        <span data-testid="content">{payload() as number}</span>
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </>
              )}
            </Tooltip.Root>
            <button
              onClick={() => {
                setOpen(true);
                setActiveTrigger('trigger-1');
              }}
            >
              Open Trigger 1
            </button>
            <button
              onClick={() => {
                setOpen(true);
                setActiveTrigger('trigger-2');
              }}
            >
              Open Trigger 2
            </button>
            <button onClick={() => setOpen(false)}>Close</button>
          </div>
        );
      }

      const { user } = await render(() => <Test />);
      await user.click(screen.getByRole('button', { name: 'Open Trigger 1' }));
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });
      await user.click(screen.getByRole('button', { name: 'Open Trigger 2' }));
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('2');
      });
      await user.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByTestId('content')).toBe(null);
      });
    });

    it('allows setting an initially open tooltip', async () => {
      const testTooltip = Tooltip.createHandle<number>();
      const triggerId = randomStringValue();
      await render(() => (
        <Tooltip.Root handle={testTooltip} defaultOpen defaultTriggerId={triggerId}>
          {/* Port note: `payload` is an accessor. */}
          {({ payload }: NumberPayload) => (
            <>
              <button type="button" aria-label="Initial focus" autofocus ref={autoFocus} />
              <Tooltip.Trigger
                handle={testTooltip}
                payload={1}
                style={{ 'pointer-events': 'none' }}
              >
                Trigger 1
              </Tooltip.Trigger>
              <Tooltip.Trigger
                handle={testTooltip}
                payload={2}
                id={triggerId}
                style={{ 'pointer-events': 'none' }}
              >
                Trigger 2
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Positioner>
                  <Tooltip.Popup data-testid="popup">
                    <span>{payload()}</span>
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </>
          )}
        </Tooltip.Root>
      ));

      await waitFor(() => {
        expect(screen.getByTestId('popup').textContent).toBe('2');
      });
    });
  });

  describe.skipIf(isJSDOM)('multiple detached triggers', () => {
    type NumberPayload = { payload: Accessor<number | undefined> };

    it('should open the tooltip with any trigger on hover', async () => {
      const testTooltip = Tooltip.createHandle();
      const popupId = randomStringValue();
      await render(() => (
        <div>
          <button type="button" aria-label="Initial focus" autofocus ref={autoFocus} />
          <Tooltip.Trigger handle={testTooltip} delay={0} style={{ 'pointer-events': 'none' }}>
            Trigger 1
          </Tooltip.Trigger>
          <Tooltip.Trigger handle={testTooltip} delay={0} style={{ 'pointer-events': 'none' }}>
            Trigger 2
          </Tooltip.Trigger>
          <Tooltip.Trigger handle={testTooltip} delay={0} style={{ 'pointer-events': 'none' }}>
            Trigger 3
          </Tooltip.Trigger>

          <Tooltip.Root handle={testTooltip}>
            <Tooltip.Portal>
              <Tooltip.Positioner>
                <Tooltip.Popup data-testid={popupId}>Tooltip Content</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });

      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBe(null);
      });

      fireEvent.mouseEnter(trigger1);
      fireEvent.mouseMove(trigger1);
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBeVisible();
      });
      fireEvent.mouseLeave(trigger1);
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBe(null);
      });

      fireEvent.mouseEnter(trigger2);
      fireEvent.mouseMove(trigger2);
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBeVisible();
      });
      fireEvent.mouseLeave(trigger2);
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBe(null);
      });

      fireEvent.mouseEnter(trigger3);
      fireEvent.mouseMove(trigger3);
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBeVisible();
      });
      fireEvent.mouseLeave(trigger3);
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBe(null);
      });
    });

    it('should open the tooltip with any trigger on focus', async () => {
      const testTooltip = Tooltip.createHandle();
      await render(() => (
        <div>
          <Tooltip.Trigger handle={testTooltip}>Trigger 1</Tooltip.Trigger>
          <Tooltip.Trigger handle={testTooltip}>Trigger 2</Tooltip.Trigger>
          <Tooltip.Trigger handle={testTooltip}>Trigger 3</Tooltip.Trigger>

          <Tooltip.Root handle={testTooltip}>
            <Tooltip.Portal>
              <Tooltip.Positioner>
                <Tooltip.Popup>Tooltip Content</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });

      expect(screen.queryByText('Tooltip Content')).toBe(null);

      trigger1.focus();
      await flushMicrotasks();
      await flushMicrotasks();
      // Port note: Floating UI resolves positioning asynchronously after Solid mounts the popup.
      expect(screen.queryByText('Tooltip Content')).not.toBe(null);
      await waitFor(() => {
        expect(screen.getByText('Tooltip Content')).toBeVisible();
      });
      trigger1.blur();
      await flushMicrotasks();
      // Port note: useFocus closes in a zero-delay task, after the microtask flush.
      await waitFor(() => {
        expect(screen.queryByText('Tooltip Content')).toBe(null);
      });

      trigger2.focus();
      await flushMicrotasks();
      await flushMicrotasks();
      // Port note: Floating UI resolves positioning asynchronously after Solid mounts the popup.
      expect(screen.queryByText('Tooltip Content')).not.toBe(null);
      await waitFor(() => {
        expect(screen.getByText('Tooltip Content')).toBeVisible();
      });
      trigger2.blur();
      await flushMicrotasks();
      // Port note: useFocus closes in a zero-delay task, after the microtask flush.
      await waitFor(() => {
        expect(screen.queryByText('Tooltip Content')).toBe(null);
      });

      trigger3.focus();
      await flushMicrotasks();
      await flushMicrotasks();
      // Port note: Floating UI resolves positioning asynchronously after Solid mounts the popup.
      expect(screen.queryByText('Tooltip Content')).not.toBe(null);
      await waitFor(() => {
        expect(screen.getByText('Tooltip Content')).toBeVisible();
      });
      trigger3.blur();
      await flushMicrotasks();
      // Port note: useFocus closes in a zero-delay task, after the microtask flush.
      await waitFor(() => {
        expect(screen.queryByText('Tooltip Content')).toBe(null);
      });
    });

    it('should close when focusing a disabled trigger while another trigger is open', async () => {
      const testTooltip = Tooltip.createHandle<number>();
      await render(() => (
        <div>
          <Tooltip.Trigger handle={testTooltip} payload={1}>
            Trigger 1
          </Tooltip.Trigger>
          <Tooltip.Trigger handle={testTooltip} payload={2} disabled>
            Trigger 2
          </Tooltip.Trigger>

          <Tooltip.Root handle={testTooltip}>
            {/* Port note: `payload` is an accessor. */}
            {({ payload }: NumberPayload) => (
              <Tooltip.Portal>
                <Tooltip.Positioner>
                  <Tooltip.Popup>
                    <span data-testid="content">{payload()}</span>
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            )}
          </Tooltip.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      trigger1.focus();
      await flushMicrotasks();
      await flushMicrotasks();
      expect(screen.getByTestId('content').textContent).toBe('1');

      trigger2.focus();
      await flushMicrotasks();
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByTestId('content')).toBe(null);
      });
      expect(trigger2).not.toHaveAttribute('data-popup-open');
    });

    it('should set the payload and render content based on its value', async () => {
      const testTooltip = Tooltip.createHandle<number>();
      await render(() => (
        <div>
          <Tooltip.Trigger
            handle={testTooltip}
            payload={1}
            delay={0}
            style={{ 'pointer-events': 'none' }}
          >
            Trigger 1
          </Tooltip.Trigger>
          <Tooltip.Trigger
            handle={testTooltip}
            payload={2}
            delay={0}
            style={{ 'pointer-events': 'none' }}
          >
            Trigger 2
          </Tooltip.Trigger>

          <Tooltip.Root handle={testTooltip}>
            {/* Port note: `payload` is an accessor. */}
            {({ payload }: NumberPayload) => (
              <Tooltip.Portal>
                <Tooltip.Positioner>
                  <Tooltip.Popup>
                    <span data-testid="content">{payload()}</span>
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            )}
          </Tooltip.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      // Port note: `fireEvent` doesn't flush Solid (upstream's is wrapped in `act`), so flush
      // before asserting.
      fireEvent.mouseEnter(trigger1);
      fireEvent.mouseMove(trigger1);
      flush();
      expect(screen.getByTestId('content').textContent).toBe('1');

      fireEvent.mouseLeave(trigger1);
      fireEvent.mouseEnter(trigger2);
      fireEvent.mouseMove(trigger2);
      flush();
      expect(screen.getByTestId('content').textContent).toBe('2');
    });

    it('should close when the active detached trigger unmounts', async () => {
      const testTooltip = Tooltip.createHandle<number>();
      let removeFirstTrigger: () => void = () => {};

      function Test() {
        const [showFirstTrigger, setShowFirstTrigger] = createSignal(true);
        removeFirstTrigger = () => setShowFirstTrigger(false);

        return (
          <div style={{ padding: '50px' }}>
            <div style={{ display: 'flex', gap: '120px' }}>
              <Show when={showFirstTrigger()}>
                <Tooltip.Trigger handle={testTooltip} id="trigger-1" payload={1} delay={0}>
                  Trigger 1
                </Tooltip.Trigger>
              </Show>
              <Tooltip.Trigger handle={testTooltip} id="trigger-2" payload={2} delay={0}>
                Trigger 2
              </Tooltip.Trigger>
            </div>

            <Tooltip.Root handle={testTooltip} defaultOpen defaultTriggerId="trigger-1">
              {/* Port note: `payload` is an accessor. */}
              {({ payload }: NumberPayload) => (
                <Tooltip.Portal>
                  <Tooltip.Positioner side="bottom" align="start">
                    <Tooltip.Popup>
                      <span data-testid="content">{payload()}</span>
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              )}
            </Tooltip.Root>
          </div>
        );
      }

      await render(() => <Test />);

      expect(await screen.findByTestId('content')).toHaveTextContent('1');

      removeFirstTrigger();
      await flushMicrotasks();

      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Trigger 1' })).toBe(null);
        expect(trigger2).not.toHaveAttribute('data-popup-open');
        expect(screen.queryByTestId('content')).toBe(null);
      });
    });

    it('should close when hovering a disabled trigger while another trigger is open', async () => {
      const testTooltip = Tooltip.createHandle<number>();
      await render(() => (
        <div>
          <Tooltip.Trigger
            handle={testTooltip}
            payload={1}
            delay={0}
            style={{ 'pointer-events': 'none' }}
          >
            Trigger 1
          </Tooltip.Trigger>
          <Tooltip.Trigger
            handle={testTooltip}
            payload={2}
            disabled
            style={{ 'pointer-events': 'none' }}
          >
            Trigger 2
          </Tooltip.Trigger>

          <Tooltip.Root handle={testTooltip}>
            {/* Port note: `payload` is an accessor. */}
            {({ payload }: NumberPayload) => (
              <Tooltip.Portal>
                <Tooltip.Positioner>
                  <Tooltip.Popup>
                    <span data-testid="content">{payload()}</span>
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            )}
          </Tooltip.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      fireEvent.mouseEnter(trigger1);
      fireEvent.mouseMove(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });

      fireEvent.mouseLeave(trigger1);
      fireEvent.mouseEnter(trigger2);
      fireEvent.mouseMove(trigger2);
      await waitFor(() => {
        expect(screen.queryByTestId('content')).toBe(null);
      });
      expect(trigger2).not.toHaveAttribute('data-popup-open');
    });

    it('should switch to a rendered disabled button trigger when trigger hover is enabled', async () => {
      const testTooltip = Tooltip.createHandle<number>();
      await render(() => (
        <div>
          <Tooltip.Trigger
            handle={testTooltip}
            payload={1}
            delay={0}
            style={{ 'pointer-events': 'none' }}
          >
            Trigger 1
          </Tooltip.Trigger>
          {/* Port note: `render={<button type="button" disabled>Trigger 2</button>}` (React
              element) -> a render function. */}
          <Tooltip.Trigger
            handle={testTooltip}
            payload={2}
            delay={0}
            style={{ 'pointer-events': 'none' }}
            render={(props) => (
              <button {...props} type="button" disabled>
                Trigger 2
              </button>
            )}
          />

          <Tooltip.Root handle={testTooltip}>
            {/* Port note: `payload` is an accessor. */}
            {({ payload }: NumberPayload) => (
              <Tooltip.Portal>
                <Tooltip.Positioner>
                  <Tooltip.Popup>
                    <span data-testid="content">{payload()}</span>
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            )}
          </Tooltip.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      fireEvent.mouseEnter(trigger1);
      fireEvent.mouseMove(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });

      fireEvent.mouseLeave(trigger1);
      fireEvent.mouseEnter(trigger2);
      fireEvent.mouseMove(trigger2);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('2');
      });
      await waitFor(() => {
        expect(trigger2).toHaveAttribute('data-popup-open');
      });
    });

    it('should reuse the popup and positioner DOM nodes when switching triggers', async () => {
      const testTooltip = Tooltip.createHandle<number>();
      await render(() => (
        <>
          <Tooltip.Trigger handle={testTooltip} payload={1} delay={0}>
            Trigger 1
          </Tooltip.Trigger>
          <Tooltip.Trigger handle={testTooltip} payload={2} delay={0}>
            Trigger 2
          </Tooltip.Trigger>

          <Tooltip.Root handle={testTooltip}>
            {/* Port note: `payload` is an accessor. */}
            {({ payload }: NumberPayload) => (
              <Tooltip.Portal>
                <Tooltip.Positioner data-testid="positioner">
                  <Tooltip.Popup data-testid="popup">
                    <span>{payload()}</span>
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            )}
          </Tooltip.Root>
        </>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      trigger1.focus();
      await flushMicrotasks();
      const popupElement = screen.getByTestId('popup');
      const positionerElement = screen.getByTestId('positioner');

      trigger2.focus();
      await flushMicrotasks();
      expect(screen.getByTestId('popup')).toBe(popupElement);
      expect(screen.getByTestId('positioner')).toBe(positionerElement);
    });

    it('should allow controlling the tooltip state programmatically', async () => {
      const testTooltip = Tooltip.createHandle<number>();
      function Test() {
        const [open, setOpen] = createSignal(false);
        const [activeTrigger, setActiveTrigger] = createSignal<string | null>(null);

        return (
          <div style={{ margin: '50px' }}>
            <Tooltip.Trigger handle={testTooltip} payload={1} id="trigger-1" delay={0}>
              Trigger 1
            </Tooltip.Trigger>
            <Tooltip.Trigger handle={testTooltip} payload={2} id="trigger-2" delay={0}>
              Trigger 2
            </Tooltip.Trigger>

            <Tooltip.Root
              open={open()}
              onOpenChange={(nextOpen, details) => {
                setActiveTrigger(details.trigger?.id ?? null);
                setOpen(nextOpen);
              }}
              triggerId={activeTrigger()}
              handle={testTooltip}
            >
              {/* Port note: `payload` is an accessor. */}
              {({ payload }: NumberPayload) => (
                <Tooltip.Portal>
                  <Tooltip.Positioner data-testid="positioner" side="bottom" align="start">
                    <Tooltip.Popup>
                      <span data-testid="content">{payload()}</span>
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              )}
            </Tooltip.Root>

            <button
              onClick={() => {
                setOpen(true);
                setActiveTrigger('trigger-1');
              }}
            >
              Open Trigger 1
            </button>
            <button
              onClick={() => {
                setOpen(true);
                setActiveTrigger('trigger-2');
              }}
            >
              Open Trigger 2
            </button>
            <button onClick={() => setOpen(false)}>Close</button>
          </div>
        );
      }

      const { user } = await render(() => <Test />);

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(screen.getByRole('button', { name: 'Open Trigger 1' }));
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });

      await waitFor(() => {
        expect(
          Math.abs(
            screen.getByTestId('positioner').getBoundingClientRect().left -
              trigger1.getBoundingClientRect().left,
          ),
        ).toBeLessThanOrEqual(1);
      });

      await user.click(screen.getByRole('button', { name: 'Open Trigger 2' }));
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('2');
      });
      await waitFor(() => {
        expect(
          Math.abs(
            screen.getByTestId('positioner').getBoundingClientRect().left -
              trigger2.getBoundingClientRect().left,
          ),
        ).toBeLessThanOrEqual(1);
      });

      await user.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByTestId('content')).toBe(null);
      });
    });

    it('allows setting an initially open tooltip', async () => {
      const testTooltip = Tooltip.createHandle<number>();
      const triggerId = randomStringValue();
      await render(() => (
        <>
          <button type="button" aria-label="Initial focus" autofocus ref={autoFocus} />
          <Tooltip.Trigger handle={testTooltip} payload={1} style={{ 'pointer-events': 'none' }}>
            Trigger 1
          </Tooltip.Trigger>
          <Tooltip.Trigger
            handle={testTooltip}
            payload={2}
            id={triggerId}
            style={{ 'pointer-events': 'none' }}
          >
            Trigger 2
          </Tooltip.Trigger>

          <Tooltip.Root handle={testTooltip} defaultOpen defaultTriggerId={triggerId}>
            {/* Port note: `payload` is an accessor. */}
            {({ payload }: NumberPayload) => (
              <Tooltip.Portal>
                <Tooltip.Positioner>
                  <Tooltip.Popup data-testid="popup">
                    <span>{payload()}</span>
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            )}
          </Tooltip.Root>
        </>
      ));

      await waitFor(() => {
        expect(screen.getByTestId('popup').textContent).toBe('2');
      });
    });

    it('should not have inline scale style after switching triggers', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const testTooltip = Tooltip.createHandle<number>();

      function Test() {
        return (
          <>
            <button type="button" aria-label="Initial focus" autofocus ref={autoFocus} />
            <Tooltip.Trigger
              handle={testTooltip}
              payload={1}
              delay={0}
              style={{ 'pointer-events': 'none' }}
            >
              Trigger 1
            </Tooltip.Trigger>
            <Tooltip.Trigger
              handle={testTooltip}
              payload={2}
              delay={0}
              style={{ 'pointer-events': 'none' }}
            >
              Trigger 2
            </Tooltip.Trigger>

            <Tooltip.Root handle={testTooltip}>
              {/* Port note: `payload` is an accessor. */}
              {({ payload }: NumberPayload) => (
                <Tooltip.Portal>
                  <Tooltip.Positioner>
                    <Tooltip.Popup data-testid="popup">
                      <Tooltip.Viewport>
                        <span data-testid="content">{payload()}</span>
                      </Tooltip.Viewport>
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              )}
            </Tooltip.Root>
          </>
        );
      }

      await render(() => <Test />);

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      // Open with Trigger 1
      fireEvent.mouseEnter(trigger1);
      fireEvent.mouseMove(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });

      // Switch to Trigger 2
      fireEvent.mouseLeave(trigger1);
      fireEvent.mouseEnter(trigger2);
      fireEvent.mouseMove(trigger2);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('2');
      });

      // The popup should not have an inline scale style that would override CSS transitions
      const popup = screen.getByTestId('popup');
      expect(popup.style.scale).toBe('');
    });
  });

  describe.skipIf(isJSDOM)('imperative actions on the handle', () => {
    it('opens and closes the tooltip', async () => {
      const tooltip = Tooltip.createHandle();
      await render(() => (
        <div>
          <Tooltip.Trigger handle={tooltip} id="trigger">
            Trigger
          </Tooltip.Trigger>
          <Tooltip.Root handle={tooltip}>
            <Tooltip.Portal>
              <Tooltip.Positioner>
                <Tooltip.Popup data-testid="content">Content</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      expect(screen.queryByTestId('content')).toBe(null);

      tooltip.open('trigger');
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByTestId('content')).not.toBe(null);
      });

      expect(screen.getByTestId('content').textContent).toBe('Content');
      expect(trigger).toHaveAttribute('data-popup-open');

      tooltip.close();
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByTestId('content')).toBe(null);
      });

      expect(trigger).not.toHaveAttribute('data-popup-open');
    });

    it('sets the payload associated with the trigger', async () => {
      const tooltip = Tooltip.createHandle<number>();
      await render(() => (
        <div>
          <Tooltip.Trigger
            handle={tooltip}
            id="trigger1"
            payload={1}
            style={{ 'pointer-events': 'none' }}
          >
            Trigger 1
          </Tooltip.Trigger>
          <Tooltip.Trigger
            handle={tooltip}
            id="trigger2"
            payload={2}
            style={{ 'pointer-events': 'none' }}
          >
            Trigger 2
          </Tooltip.Trigger>
          <Tooltip.Root handle={tooltip}>
            {/* Port note: `payload` is an accessor. */}
            {({ payload }: { payload: Accessor<number | undefined> }) => (
              <Tooltip.Portal>
                <Tooltip.Positioner>
                  <Tooltip.Popup data-testid="content">{payload()}</Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            )}
          </Tooltip.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      expect(screen.queryByTestId('content')).toBe(null);

      tooltip.open('trigger2');
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('2');
      });

      await waitFor(() => {
        expect(trigger2).toHaveAttribute('data-popup-open');
      });
      await waitFor(() => {
        expect(trigger1).not.toHaveAttribute('data-popup-open');
      });

      tooltip.close();
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByTestId('content')).toBe(null);
      });

      expect(trigger2).not.toHaveAttribute('data-popup-open');
    });
  });
});
