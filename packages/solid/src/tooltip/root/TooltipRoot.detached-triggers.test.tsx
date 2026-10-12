import { vi, expect, describe, beforeEach, it } from 'vitest';
import { createSignal, Show } from 'solid-js';
import type { Accessor } from 'solid-js';
import { render as solidRender } from '@solidjs/web';
import {
  createRenderer,
  detachedTriggersConformanceTests,
  isJSDOM,
  recordRender,
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

  const { render } = createRenderer();

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

  detachedTriggersConformanceTests({
    render,
    createHandle: Tooltip.createHandle,
    Root: Tooltip.Root,
    Trigger: Tooltip.Trigger,
    Portal: Tooltip.Portal,
    Positioner: Tooltip.Positioner,
    Popup: Tooltip.Popup,
    Viewport: Tooltip.Viewport,
    // Keeps the real browser pointer from hovering the triggers, the suite dispatches the events.
    triggerProps: { delay: 0, style: { 'pointer-events': 'none' } },
    openInteractions: ['hover', 'focus'],
    ariaExpanded: false,
    throwOnMissingTrigger: true,
  });

  describe('does not re-render inactive triggers', () => {
    async function renderTooltip() {
      const handle = Tooltip.createHandle();
      const bystander = { renders: 0 };

      await render(() => (
        <div>
          <Tooltip.Trigger handle={handle} id="trigger-1" delay={0} closeDelay={0}>
            Trigger 1
          </Tooltip.Trigger>
          <Tooltip.Trigger handle={handle} id="trigger-2" delay={0} closeDelay={0}>
            Trigger 2
          </Tooltip.Trigger>
          <Tooltip.Trigger
            handle={handle}
            id="trigger-3"
            render={(props, state) => (
              <>
                {recordRender(props, state, () => {
                  bystander.renders += 1;
                })}
                <button {...props} />
              </>
            )}
          >
            Trigger 3
          </Tooltip.Trigger>
          <Tooltip.Root handle={handle}>
            <Tooltip.Portal>
              <Tooltip.Positioner>
                <Tooltip.Popup data-testid="popup">Content</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>
      ));

      bystander.renders = 0;
      return {
        handle,
        bystander,
        trigger1: screen.getByRole('button', { name: 'Trigger 1' }),
        trigger2: screen.getByRole('button', { name: 'Trigger 2' }),
      };
    }

    async function expectOpenedBy(trigger: HTMLElement) {
      expect(await screen.findByTestId('popup')).not.toBe(null);
      await waitFor(() => {
        expect(trigger).toHaveAttribute('data-popup-open');
      });
    }

    async function expectClosed(trigger: HTMLElement) {
      await waitFor(() => {
        expect(screen.queryByTestId('popup')).toBe(null);
      });
      expect(trigger).not.toHaveAttribute('data-popup-open');
    }

    it('when opened and closed imperatively', async () => {
      const { handle, bystander, trigger1 } = await renderTooltip();

      async function openAndClose() {
        handle.open('trigger-1');
        await flushMicrotasks();
        await expectOpenedBy(trigger1);
        handle.close();
        await flushMicrotasks();
        await expectClosed(trigger1);
      }

      await openAndClose();
      await openAndClose();
      expect(bystander.renders).toBe(0);
    });

    it('when the popup moves to another trigger', async () => {
      const { handle, bystander, trigger1, trigger2 } = await renderTooltip();

      handle.open('trigger-1');
      await flushMicrotasks();
      await expectOpenedBy(trigger1);
      handle.open('trigger-2');
      await flushMicrotasks();
      await expectOpenedBy(trigger2);
      expect(trigger1).not.toHaveAttribute('data-popup-open');
      handle.close();
      await flushMicrotasks();
      await expectClosed(trigger2);

      expect(bystander.renders).toBe(0);
    });

    it('when focus opens and closes the popup', async () => {
      const { bystander, trigger1 } = await renderTooltip();

      async function openAndClose() {
        trigger1.focus();
        await flushMicrotasks();
        await expectOpenedBy(trigger1);
        trigger1.blur();
        await flushMicrotasks();
        await expectClosed(trigger1);
      }

      await openAndClose();
      await openAndClose();
      expect(bystander.renders).toBe(0);
    });

    it('when hover opens and closes the popup', async () => {
      const { bystander, trigger1, trigger2 } = await renderTooltip();

      fireEvent.mouseEnter(trigger1);
      fireEvent.mouseMove(trigger1);
      await expectOpenedBy(trigger1);
      fireEvent.mouseLeave(trigger1);
      fireEvent.mouseEnter(trigger2);
      fireEvent.mouseMove(trigger2);
      await expectOpenedBy(trigger2);
      fireEvent.mouseLeave(trigger2);
      await expectClosed(trigger2);

      expect(bystander.renders).toBe(0);
    });
  });

  it('closes a cursor-tracking tooltip when an inactive trigger is pressed', async () => {
    const handle = Tooltip.createHandle();

    await render(() => (
      <div>
        <Tooltip.Trigger handle={handle} id="trigger-1">
          Trigger 1
        </Tooltip.Trigger>
        <Tooltip.Trigger handle={handle} id="trigger-2">
          Trigger 2
        </Tooltip.Trigger>
        <Tooltip.Root handle={handle} trackCursorAxis="both">
          <Tooltip.Portal>
            <Tooltip.Positioner>
              <Tooltip.Popup data-testid="popup">Content</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
    ));

    handle.open('trigger-1');
    await flushMicrotasks();
    expect(await screen.findByTestId('popup')).not.toBe(null);

    const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
    fireEvent.pointerDown(trigger2, { pointerType: 'touch' });
    fireEvent.click(trigger2);

    await waitFor(() => {
      expect(screen.queryByTestId('popup')).toBe(null);
    });
  });

  describe.skipIf(isJSDOM)('handle-backed root ownership', () => {
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
  });

  describe.skipIf(isJSDOM)('multiple triggers within Root', () => {
    type NumberPayload = { payload: Accessor<number | undefined> };

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
        expect(screen.queryByTestId('content')).toBe(null);
      });
      expect(screen.queryByRole('button', { name: 'Trigger 1' })).toBe(null);
      expect(trigger2).not.toHaveAttribute('data-popup-open');
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
        expect(onOpenChange).toHaveBeenCalledWith(
          false,
          expect.objectContaining({ reason: 'none' }),
        );
      });
      expect(screen.queryByRole('button', { name: 'Trigger 1' })).toBe(null);
      expect(trigger2).not.toHaveAttribute('data-popup-open');
      expect(screen.getByTestId('content')).toHaveTextContent('1');
    });
  });

  describe.skipIf(isJSDOM)('multiple detached triggers', () => {
    type NumberPayload = { payload: Accessor<number | undefined> };

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
        expect(screen.queryByTestId('content')).toBe(null);
      });
      expect(screen.queryByRole('button', { name: 'Trigger 1' })).toBe(null);
      expect(trigger2).not.toHaveAttribute('data-popup-open');
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
  });
});
