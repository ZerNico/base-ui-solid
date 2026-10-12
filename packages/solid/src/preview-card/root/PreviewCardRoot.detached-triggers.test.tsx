import { expect, vi, describe, beforeEach, it } from 'vitest';
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
} from '#test-utils';
import { PreviewCard } from 'base-ui-solid/preview-card';
import { OPEN_DELAY } from '../utils/constants';

// Port note: counterpart of `@mui/internal-test-utils`' `randomStringValue`.
function randomStringValue() {
  return `s${Math.random().toString(36).slice(2)}`;
}

// Port note: counterpart of upstream's `await act(async () => fn())`: run the action, then let
// Solid's batched updates (and the promise callbacks they queue) settle.
async function act(fn: () => unknown) {
  await fn();
  await flushMicrotasks();
}

// Port note: React focuses `autoFocus` elements when they mount, Solid only sets the attribute.
// This ref callback focuses the element once it's connected, like React's commit phase.
function autoFocus(element: HTMLElement) {
  queueMicrotask(() => {
    element.focus();
  });
}

const CLOSE_TRANSITION_MS = 50;
const CLOSE_TRANSITION_TIMEOUT = 300;

describe('<PreviewCard.Root />', () => {
  // Tests here leave the real pointer resting on a trigger, which the next render would put a
  // fresh trigger under, opening the card before the test interacts.
  beforeEach(resetBrowserPointer);

  beforeEach(async () => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  const { render } = createRenderer();

  detachedTriggersConformanceTests({
    render,
    createHandle: PreviewCard.createHandle,
    Root: PreviewCard.Root,
    Trigger: PreviewCard.Trigger,
    Portal: PreviewCard.Portal,
    Positioner: PreviewCard.Positioner,
    Popup: PreviewCard.Popup,
    Viewport: PreviewCard.Viewport,
    // Keeps the real browser pointer from hovering the triggers; the suite dispatches the events.
    triggerProps: { href: '#', delay: 0, closeDelay: 0, style: { 'pointer-events': 'none' } },
    openInteractions: ['hover', 'focus'],
    ariaExpanded: false,
    throwOnMissingTrigger: true,
  });

  describe('does not re-render inactive triggers', () => {
    async function renderPreviewCard() {
      const handle = PreviewCard.createHandle();
      const bystander = { renders: 0 };

      await render(() => (
        <div>
          <PreviewCard.Trigger handle={handle} id="trigger-1" href="#" delay={0} closeDelay={0}>
            Trigger 1
          </PreviewCard.Trigger>
          <PreviewCard.Trigger handle={handle} id="trigger-2" href="#" delay={0} closeDelay={0}>
            Trigger 2
          </PreviewCard.Trigger>
          <PreviewCard.Trigger
            handle={handle}
            id="trigger-3"
            render={(props, state) => (
              <>
                {recordRender(props, state, () => {
                  bystander.renders += 1;
                })}
                <a {...props} />
              </>
            )}
          >
            Trigger 3
          </PreviewCard.Trigger>
          <PreviewCard.Root handle={handle}>
            <PreviewCard.Portal>
              <PreviewCard.Positioner>
                <PreviewCard.Popup data-testid="popup">Content</PreviewCard.Popup>
              </PreviewCard.Positioner>
            </PreviewCard.Portal>
          </PreviewCard.Root>
        </div>
      ));

      bystander.renders = 0;
      return {
        handle,
        bystander,
        trigger1: screen.getByText('Trigger 1'),
        trigger2: screen.getByText('Trigger 2'),
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
      const { handle, bystander, trigger1 } = await renderPreviewCard();

      async function openAndClose() {
        await act(() => handle.open('trigger-1'));
        await expectOpenedBy(trigger1);
        await act(() => handle.close());
        await expectClosed(trigger1);
      }

      await openAndClose();
      await openAndClose();
      expect(bystander.renders).toBe(0);
    });

    it('when the popup moves to another trigger', async () => {
      const { handle, bystander, trigger1, trigger2 } = await renderPreviewCard();

      await act(() => handle.open('trigger-1'));
      await expectOpenedBy(trigger1);
      await act(() => handle.open('trigger-2'));
      await expectOpenedBy(trigger2);
      expect(trigger1).not.toHaveAttribute('data-popup-open');
      await act(() => handle.close());
      await expectClosed(trigger2);

      expect(bystander.renders).toBe(0);
    });

    it('when focus opens and closes the popup', async () => {
      const { bystander, trigger1 } = await renderPreviewCard();

      async function openAndClose() {
        await act(() => trigger1.focus());
        await expectOpenedBy(trigger1);
        await act(() => trigger1.blur());
        await expectClosed(trigger1);
      }

      await openAndClose();
      await openAndClose();
      expect(bystander.renders).toBe(0);
    });

    it('when hover opens and closes the popup', async () => {
      const { bystander, trigger1, trigger2 } = await renderPreviewCard();

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

  describe.skipIf(isJSDOM)('handle-backed root ownership', () => {
    it('keeps a default-open root open while a detached trigger migrates after the initial commit', async () => {
      const handle = PreviewCard.createHandle();
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
              <PreviewCard.Root
                handle={handle}
                defaultOpen
                defaultTriggerId="trigger"
                onOpenChange={onOpenChange}
              >
                <PreviewCard.Portal>
                  <PreviewCard.Positioner>
                    <PreviewCard.Popup data-testid="default-open-content">
                      Content
                    </PreviewCard.Popup>
                  </PreviewCard.Positioner>
                </PreviewCard.Portal>
              </PreviewCard.Root>
              <PreviewCard.Trigger handle={handle} id="trigger" href="#">
                Trigger
              </PreviewCard.Trigger>
            </>
          ),
          container,
        );

        // Rendering outside act preserves the browser's native ordering: the queued "lost trigger"
        // microtask runs before useSyncExternalStore's passive subscription migrates the trigger.
        await waitFor(() => {
          expect(screen.getByRole('link', { name: 'Trigger' })).toHaveAttribute('data-popup-open');
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

    it('should open the preview card immediately when hovering another trigger', async () => {
      const popupId = randomStringValue();
      const { user } = await render(() => (
        <PreviewCard.Root>
          {/* Port note: `payload` is an accessor. */}
          {({ payload }: NumberPayload) => (
            <>
              <button type="button" aria-label="Initial focus" autofocus ref={autoFocus} />
              <PreviewCard.Trigger href="#" delay={0} payload={1}>
                Trigger 1
              </PreviewCard.Trigger>

              {/* delay should be ignored when moving from already active trigger */}
              <PreviewCard.Trigger href="#" delay={2000} payload={2}>
                Trigger 2
              </PreviewCard.Trigger>

              <PreviewCard.Portal>
                <PreviewCard.Positioner>
                  <PreviewCard.Popup data-testid={popupId}>Content: {payload()}</PreviewCard.Popup>
                </PreviewCard.Positioner>
              </PreviewCard.Portal>
            </>
          )}
        </PreviewCard.Root>
      ));

      const trigger1 = screen.getByRole('link', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('link', { name: 'Trigger 2' });

      await user.hover(trigger1);
      // Port note: Floating UI resolves positioning asynchronously after Solid mounts the popup.
      expect(screen.queryByTestId(popupId)).not.toBe(null);
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBeVisible();
      });
      expect(screen.getByTestId(popupId).textContent).toBe('Content: 1');

      await user.hover(trigger2);
      // Port note: Floating UI resolves positioning asynchronously after Solid mounts the popup.
      expect(screen.queryByTestId(popupId)).not.toBe(null);
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBeVisible();
      });
      expect(screen.getByTestId(popupId).textContent).toBe('Content: 2');
    });

    it('should open again after escape when focusing another trigger', async () => {
      const popupId = randomStringValue();
      const { user } = await render(() => (
        <PreviewCard.Root>
          <button type="button" aria-label="Initial focus" autofocus ref={autoFocus} />
          <PreviewCard.Trigger href="#" delay={0}>
            Trigger 1
          </PreviewCard.Trigger>
          <PreviewCard.Trigger href="#" delay={0}>
            Trigger 2
          </PreviewCard.Trigger>

          <PreviewCard.Portal>
            <PreviewCard.Positioner>
              <PreviewCard.Popup data-testid={popupId}>Content</PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        </PreviewCard.Root>
      ));

      const trigger1 = screen.getByRole('link', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('link', { name: 'Trigger 2' });

      await act(async () => trigger1.focus());
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBeVisible();
      });

      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBe(null);
      });

      await act(async () => trigger2.focus());
      await waitFor(() => {
        expect(screen.queryByTestId(popupId)).toBeVisible();
      });
    });

    it('should switch immediately when focusing another trigger while open', async () => {
      await render(() => (
        <PreviewCard.Root>
          {/* Port note: `payload` is an accessor. */}
          {({ payload }: NumberPayload) => (
            <>
              <button type="button" aria-label="Initial focus" autofocus ref={autoFocus} />
              <PreviewCard.Trigger href="#" payload={1} delay={0}>
                Trigger 1
              </PreviewCard.Trigger>
              <PreviewCard.Trigger href="#" payload={2} delay={2000}>
                Trigger 2
              </PreviewCard.Trigger>

              <PreviewCard.Portal>
                <PreviewCard.Positioner>
                  <PreviewCard.Popup>
                    <span data-testid="content">{payload()}</span>
                  </PreviewCard.Popup>
                </PreviewCard.Positioner>
              </PreviewCard.Portal>
            </>
          )}
        </PreviewCard.Root>
      ));

      const trigger1 = screen.getByRole('link', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('link', { name: 'Trigger 2' });

      await act(async () => trigger1.focus());
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });

      await act(async () => trigger2.focus());
      await flushMicrotasks();
      expect(screen.getByTestId('content').textContent).toBe('2');
    });

    it('should close when the active trigger unmounts', async () => {
      let removeFirstTrigger: () => void = () => {};

      function Test() {
        const [showFirstTrigger, setShowFirstTrigger] = createSignal(true);
        removeFirstTrigger = () => setShowFirstTrigger(false);

        return (
          <div style={{ padding: '50px' }}>
            <PreviewCard.Root defaultOpen defaultTriggerId="trigger-1">
              {/* Port note: `payload` is an accessor. */}
              {({ payload }: NumberPayload) => (
                <>
                  <button type="button" aria-label="Initial focus" autofocus ref={autoFocus} />
                  <div style={{ display: 'flex', gap: '120px' }}>
                    <Show when={showFirstTrigger()}>
                      <PreviewCard.Trigger href="#" id="trigger-1" payload={1} delay={0}>
                        Trigger 1
                      </PreviewCard.Trigger>
                    </Show>
                    <PreviewCard.Trigger href="#" id="trigger-2" payload={2} delay={0}>
                      Trigger 2
                    </PreviewCard.Trigger>
                  </div>

                  <PreviewCard.Portal>
                    <PreviewCard.Positioner side="bottom" align="start">
                      <PreviewCard.Popup>
                        <span data-testid="content">{payload()}</span>
                      </PreviewCard.Popup>
                    </PreviewCard.Positioner>
                  </PreviewCard.Portal>
                </>
              )}
            </PreviewCard.Root>
          </div>
        );
      }

      await render(() => <Test />);

      expect(await screen.findByTestId('content')).toHaveTextContent('1');

      await act(async () => removeFirstTrigger());

      const trigger2 = screen.getByRole('link', { name: 'Trigger 2' });

      await waitFor(() => {
        expect(screen.queryByTestId('content')).toBe(null);
      });
      expect(screen.queryByRole('link', { name: 'Trigger 1' })).toBe(null);
      expect(trigger2).not.toHaveAttribute('data-popup-open');
    });

    it('should remain open when the active trigger unmount close is canceled', async () => {
      let removeFirstTrigger: () => void = () => {};
      const onOpenChange = vi.fn((nextOpen, details: PreviewCard.Root.ChangeEventDetails) => {
        if (!nextOpen) {
          details.cancel();
        }
      });

      function Test() {
        const [showFirstTrigger, setShowFirstTrigger] = createSignal(true);
        removeFirstTrigger = () => setShowFirstTrigger(false);

        return (
          <div style={{ padding: '50px' }}>
            <PreviewCard.Root defaultOpen defaultTriggerId="trigger-1" onOpenChange={onOpenChange}>
              {/* Port note: `payload` is an accessor. */}
              {({ payload }: NumberPayload) => (
                <>
                  <button type="button" aria-label="Initial focus" autofocus ref={autoFocus} />
                  <div style={{ display: 'flex', gap: '120px' }}>
                    <Show when={showFirstTrigger()}>
                      <PreviewCard.Trigger href="#" id="trigger-1" payload={1} delay={0}>
                        Trigger 1
                      </PreviewCard.Trigger>
                    </Show>
                    <PreviewCard.Trigger href="#" id="trigger-2" payload={2} delay={0}>
                      Trigger 2
                    </PreviewCard.Trigger>
                  </div>

                  <PreviewCard.Portal>
                    <PreviewCard.Positioner side="bottom" align="start">
                      <PreviewCard.Popup>
                        <span data-testid="content">{payload()}</span>
                      </PreviewCard.Popup>
                    </PreviewCard.Positioner>
                  </PreviewCard.Portal>
                </>
              )}
            </PreviewCard.Root>
          </div>
        );
      }

      await render(() => <Test />);

      expect(await screen.findByTestId('content')).toHaveTextContent('1');

      await act(async () => removeFirstTrigger());

      const trigger2 = screen.getByRole('link', { name: 'Trigger 2' });

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(
          false,
          expect.objectContaining({ reason: 'none' }),
        );
      });
      expect(screen.queryByRole('link', { name: 'Trigger 1' })).toBe(null);
      expect(trigger2).not.toHaveAttribute('data-popup-open');
      expect(screen.getByTestId('content')).toHaveTextContent('1');
    });
  });

  describe.skipIf(isJSDOM)('multiple detached triggers', () => {
    type NumberPayload = { payload: Accessor<number | undefined> };

    it('should reposition to a different trigger when reopened with keepMounted=true', async () => {
      const previewCardHandle = PreviewCard.createHandle();
      const { user } = await render(() => (
        <div style={{ margin: '50px' }}>
          <PreviewCard.Trigger href="#" handle={previewCardHandle} delay={0}>
            Trigger 1
          </PreviewCard.Trigger>
          <PreviewCard.Trigger href="#" handle={previewCardHandle} delay={0}>
            Trigger 2
          </PreviewCard.Trigger>

          <PreviewCard.Root handle={previewCardHandle}>
            <PreviewCard.Portal keepMounted>
              <PreviewCard.Positioner data-testid="positioner" side="bottom" align="start">
                <PreviewCard.Popup>Content</PreviewCard.Popup>
              </PreviewCard.Positioner>
            </PreviewCard.Portal>
          </PreviewCard.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('link', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('link', { name: 'Trigger 2' });
      const positioner = screen.getByTestId('positioner');

      await user.hover(trigger1);

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeVisible();
      });

      await waitFor(() => {
        expect(
          Math.abs(positioner.getBoundingClientRect().left - trigger1.getBoundingClientRect().left),
        ).toBeLessThanOrEqual(1);
      });

      await user.unhover(trigger1);

      await waitFor(() => {
        expect(positioner).toHaveAttribute('hidden');
      });

      await user.hover(trigger2);

      await waitFor(() => {
        expect(screen.getByText('Content')).toBeVisible();
      });

      await waitFor(() => {
        expect(
          Math.abs(positioner.getBoundingClientRect().left - trigger2.getBoundingClientRect().left),
        ).toBeLessThanOrEqual(1);
      });
    });

    it('should close when the active detached trigger unmounts', async () => {
      const testPreviewCard = PreviewCard.createHandle<number>();
      let removeFirstTrigger: () => void = () => {};

      function Test() {
        const [showFirstTrigger, setShowFirstTrigger] = createSignal(true);
        removeFirstTrigger = () => setShowFirstTrigger(false);

        return (
          <div style={{ padding: '50px' }}>
            <button type="button" aria-label="Initial focus" autofocus ref={autoFocus} />
            <div style={{ display: 'flex', gap: '120px' }}>
              <Show when={showFirstTrigger()}>
                <PreviewCard.Trigger
                  href="#"
                  handle={testPreviewCard}
                  id="trigger-1"
                  payload={1}
                  delay={0}
                >
                  Trigger 1
                </PreviewCard.Trigger>
              </Show>
              <PreviewCard.Trigger
                href="#"
                handle={testPreviewCard}
                id="trigger-2"
                payload={2}
                delay={0}
              >
                Trigger 2
              </PreviewCard.Trigger>
            </div>

            <PreviewCard.Root handle={testPreviewCard} defaultOpen defaultTriggerId="trigger-1">
              {/* Port note: `payload` is an accessor. */}
              {({ payload }: NumberPayload) => (
                <PreviewCard.Portal>
                  <PreviewCard.Positioner side="bottom" align="start">
                    <PreviewCard.Popup>
                      <span data-testid="content">{payload()}</span>
                    </PreviewCard.Popup>
                  </PreviewCard.Positioner>
                </PreviewCard.Portal>
              )}
            </PreviewCard.Root>
          </div>
        );
      }

      await render(() => <Test />);

      expect(await screen.findByTestId('content')).toHaveTextContent('1');

      await act(async () => removeFirstTrigger());

      const trigger2 = screen.getByRole('link', { name: 'Trigger 2' });

      await waitFor(() => {
        expect(screen.queryByTestId('content')).toBe(null);
      });
      expect(screen.queryByRole('link', { name: 'Trigger 1' })).toBe(null);
      expect(trigger2).not.toHaveAttribute('data-popup-open');
    });

    it('opens immediately when entering trigger B during trigger A close transition', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
      const testPreviewCard = PreviewCard.createHandle<number>();
      const style = `
        @keyframes preview-card-a-to-b-close-transition {
          from { opacity: 1; }
          to { opacity: 0.01; }
        }
        [data-testid="popup"][data-ending-style] {
          animation: preview-card-a-to-b-close-transition ${CLOSE_TRANSITION_MS}ms linear forwards;
        }
      `;
      const { user } = await render(() => (
        <>
          {/* eslint-disable-next-line solid/no-innerhtml */}
          <style innerHTML={style} />
          <button type="button" aria-label="Initial focus" autofocus ref={autoFocus} />
          <PreviewCard.Trigger href="#" handle={testPreviewCard} payload={1} delay={0}>
            Trigger 1
          </PreviewCard.Trigger>
          <PreviewCard.Trigger href="#" handle={testPreviewCard} payload={2} delay={OPEN_DELAY}>
            Trigger 2
          </PreviewCard.Trigger>

          <PreviewCard.Root handle={testPreviewCard}>
            {/* Port note: `payload` is an accessor. */}
            {({ payload }: NumberPayload) => (
              <PreviewCard.Portal keepMounted>
                <PreviewCard.Positioner>
                  <PreviewCard.Popup data-testid="popup">
                    <span data-testid="content">{payload()}</span>
                  </PreviewCard.Popup>
                </PreviewCard.Positioner>
              </PreviewCard.Portal>
            )}
          </PreviewCard.Root>
        </>
      ));

      const trigger1 = screen.getByRole('link', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('link', { name: 'Trigger 2' });

      await user.hover(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });

      await user.unhover(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('popup')).toHaveAttribute('data-ending-style');
      });

      await user.hover(trigger2);

      await waitFor(
        () => {
          expect(screen.getByTestId('content').textContent).toBe('2');
        },
        { timeout: 200 },
      );
    });

    it('still respects trigger B open delay after trigger A close transition finishes', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
      const testPreviewCard = PreviewCard.createHandle<number>();
      const style = `
        @keyframes preview-card-a-to-b-post-close-delay {
          from { opacity: 1; }
          to { opacity: 0.01; }
        }
        [data-testid="popup"][data-ending-style] {
          animation: preview-card-a-to-b-post-close-delay ${CLOSE_TRANSITION_MS}ms linear forwards;
        }
      `;
      const { user } = await render(() => (
        <>
          {/* eslint-disable-next-line solid/no-innerhtml */}
          <style innerHTML={style} />
          <button type="button" aria-label="Initial focus" autofocus ref={autoFocus} />
          <PreviewCard.Trigger href="#" handle={testPreviewCard} payload={1} delay={0}>
            Trigger 1
          </PreviewCard.Trigger>
          <PreviewCard.Trigger href="#" handle={testPreviewCard} payload={2} delay={OPEN_DELAY}>
            Trigger 2
          </PreviewCard.Trigger>

          <PreviewCard.Root handle={testPreviewCard}>
            {/* Port note: `payload` is an accessor. */}
            {({ payload }: NumberPayload) => (
              <PreviewCard.Portal keepMounted>
                <PreviewCard.Positioner>
                  <PreviewCard.Popup data-testid="popup">
                    <span data-testid="content">{payload()}</span>
                  </PreviewCard.Popup>
                </PreviewCard.Positioner>
              </PreviewCard.Portal>
            )}
          </PreviewCard.Root>
        </>
      ));

      const trigger1 = screen.getByRole('link', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('link', { name: 'Trigger 2' });

      await user.hover(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });

      await user.unhover(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('popup')).toHaveAttribute('data-ending-style');
      });

      // Once close transition is done, this should behave like a normal delayed open.
      await waitFor(
        () => {
          expect(screen.getByTestId('popup')).not.toHaveAttribute('data-ending-style');
        },
        { timeout: CLOSE_TRANSITION_TIMEOUT },
      );
      await waitFor(() => {
        expect(screen.getByTestId('popup')).toHaveAttribute('data-closed');
      });

      await user.hover(trigger2);

      // Must not open immediately once close transition has finished.
      await waitFor(
        () => {
          expect(screen.getByTestId('popup')).toHaveAttribute('data-closed');
        },
        { timeout: 200 },
      );

      await waitFor(() => {
        expect(screen.getByTestId('popup')).toHaveAttribute('data-open');
      });
    });

    it('reopens immediately when re-hovering trigger A during its close transition', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const testPreviewCard = PreviewCard.createHandle<number>();
      const style = `
        @keyframes preview-card-reopen-during-close {
          from { opacity: 1; }
          to { opacity: 0.01; }
        }
        [data-testid="popup"][data-ending-style] {
          animation: preview-card-reopen-during-close ${CLOSE_TRANSITION_MS}ms linear forwards;
        }
      `;

      const { user } = await render(() => (
        <>
          {/* eslint-disable-next-line solid/no-innerhtml */}
          <style innerHTML={style} />
          <button type="button" aria-label="Initial focus" autofocus ref={autoFocus} />
          <PreviewCard.Trigger href="#" handle={testPreviewCard} payload={1} delay={OPEN_DELAY}>
            Trigger 1
          </PreviewCard.Trigger>
          <PreviewCard.Root handle={testPreviewCard}>
            {/* Port note: `payload` is an accessor. */}
            {({ payload }: NumberPayload) => (
              <PreviewCard.Portal keepMounted>
                <PreviewCard.Positioner>
                  <PreviewCard.Popup data-testid="popup">
                    <span data-testid="content">{payload()}</span>
                  </PreviewCard.Popup>
                </PreviewCard.Positioner>
              </PreviewCard.Portal>
            )}
          </PreviewCard.Root>
        </>
      ));

      const trigger1 = screen.getByRole('link', { name: 'Trigger 1' });

      await user.hover(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });

      await user.unhover(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('popup')).toHaveAttribute('data-ending-style');
      });

      await user.hover(trigger1);

      await waitFor(
        () => {
          expect(screen.getByTestId('popup')).toHaveAttribute('data-open');
        },
        { timeout: 200 },
      );
      expect(screen.getByTestId('popup')).not.toHaveAttribute('data-closed');
      expect(screen.getByTestId('content').textContent).toBe('1');
    });

    it('respects open delay on later same-trigger hovers after close lifecycle finishes', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const testPreviewCard = PreviewCard.createHandle<number>();
      const style = `
        @keyframes preview-card-reopen-during-close-delay {
          from { opacity: 1; }
          to { opacity: 0.01; }
        }
        [data-testid="popup"][data-ending-style] {
          animation: preview-card-reopen-during-close-delay ${CLOSE_TRANSITION_MS}ms linear forwards;
        }
      `;

      const { user } = await render(() => (
        <>
          {/* eslint-disable-next-line solid/no-innerhtml */}
          <style innerHTML={style} />
          <button type="button" aria-label="Initial focus" autofocus ref={autoFocus} />
          <PreviewCard.Trigger href="#" handle={testPreviewCard} payload={1} delay={OPEN_DELAY}>
            Trigger 1
          </PreviewCard.Trigger>
          <PreviewCard.Root handle={testPreviewCard}>
            {/* Port note: `payload` is an accessor. */}
            {({ payload }: NumberPayload) => (
              <PreviewCard.Portal keepMounted>
                <PreviewCard.Positioner>
                  <PreviewCard.Popup data-testid="popup">
                    <span data-testid="content">{payload()}</span>
                  </PreviewCard.Popup>
                </PreviewCard.Positioner>
              </PreviewCard.Portal>
            )}
          </PreviewCard.Root>
        </>
      ));

      const trigger1 = screen.getByRole('link', { name: 'Trigger 1' });

      // First cycle: close and immediate re-hover during close lifecycle should reopen.
      await user.hover(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });
      await user.unhover(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('popup')).toHaveAttribute('data-ending-style');
      });
      await user.hover(trigger1);
      await waitFor(
        () => {
          expect(screen.getByTestId('popup')).toHaveAttribute('data-open');
        },
        { timeout: 200 },
      );
      expect(screen.getByTestId('popup')).not.toHaveAttribute('data-closed');

      // Second cycle: once close lifecycle has fully finished, a fresh hover must honor OPEN_DELAY.
      await user.unhover(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('popup')).toHaveAttribute('data-closed');
      });
      await waitFor(
        () => {
          expect(screen.getByTestId('popup')).not.toHaveAttribute('data-ending-style');
        },
        { timeout: CLOSE_TRANSITION_TIMEOUT },
      );

      await user.hover(trigger1);

      // Should not reopen immediately this time.
      await waitFor(
        () => {
          expect(screen.getByTestId('popup')).toHaveAttribute('data-closed');
        },
        { timeout: 200 },
      );

      await waitFor(() => {
        expect(screen.getByTestId('popup')).toHaveAttribute('data-open');
      });
    });
  });
});
