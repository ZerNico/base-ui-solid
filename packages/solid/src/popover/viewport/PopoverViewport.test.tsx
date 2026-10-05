import { expect, describe, it, beforeEach, afterEach } from 'vitest';
import { createSignal, Show } from 'solid-js';
import {
  createRenderer,
  describeConformance,
  flushMicrotasks,
  isJSDOM,
  screen,
  waitFor,
} from '#test-utils';
import { DirectionProvider } from '../../direction-provider';
import { Popover } from '..';
import type { Side } from '../../internals/useAnchorPositioning';

interface AnchoringCase {
  side: Side;
  direction: 'ltr' | 'rtl';
  expected: { position?: string; top?: string; right?: string; bottom?: string; left?: string };
}

describe('<Popover.Viewport />', () => {
  const { render } = createRenderer();

  describeConformance(Popover.Viewport, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>{node()}</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ),
  });

  it.each([
    {
      side: 'top',
      direction: 'ltr',
      expected: { position: 'absolute', bottom: '0px', left: '0px' },
    },
    {
      side: 'top',
      direction: 'rtl',
      expected: { position: 'absolute', bottom: '0px', left: '0px' },
    },
    { side: 'bottom', direction: 'ltr', expected: {} },
    { side: 'bottom', direction: 'rtl', expected: {} },
    {
      side: 'left',
      direction: 'ltr',
      expected: { position: 'absolute', top: '0px', right: '0px' },
    },
    {
      side: 'left',
      direction: 'rtl',
      expected: { position: 'absolute', top: '0px', right: '0px' },
    },
    { side: 'right', direction: 'ltr', expected: {} },
    { side: 'right', direction: 'rtl', expected: {} },
    {
      side: 'inline-start',
      direction: 'ltr',
      expected: { position: 'absolute', top: '0px', right: '0px' },
    },
    { side: 'inline-start', direction: 'rtl', expected: {} },
    { side: 'inline-end', direction: 'ltr', expected: {} },
    {
      side: 'inline-end',
      direction: 'rtl',
      expected: { position: 'absolute', top: '0px', right: '0px' },
    },
  ] satisfies AnchoringCase[])(
    'anchors side=$side correctly in $direction mode',
    async ({ side, direction, expected }: AnchoringCase) => {
      await render(() => (
        <DirectionProvider direction={direction}>
          <Popover.Root open>
            <Popover.Trigger>Trigger</Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner side={side} collisionAvoidance={{ side: 'none' }}>
                <Popover.Popup data-testid="popup">
                  <Popover.Viewport>Content</Popover.Viewport>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </DirectionProvider>
      ));

      const { style } = screen.getByTestId('popup');
      expect(style.position).toBe(expected.position ?? '');
      expect(style.top).toBe(expected.top ?? '');
      expect(style.right).toBe(expected.right ?? '');
      expect(style.bottom).toBe(expected.bottom ?? '');
      expect(style.left).toBe(expected.left ?? '');
    },
  );

  it('should render children in the `current` container by default', async () => {
    await render(() => (
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>
              <Popover.Viewport>
                <div data-testid="content">Content</div>
              </Popover.Viewport>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    const currentContainer = screen.getByTestId('content').closest('[data-current]');
    expect(currentContainer).not.toBe(null);
    expect(currentContainer!.textContent).toBe('Content');
  });

  it('should remount the `current` container when the active trigger changes', async () => {
    // Port note: `payload` is an accessor (the render function is called once).
    const { user } = await render(() => (
      <Popover.Root>
        {({ payload }) => (
          <>
            <Popover.Trigger payload="first" data-testid="trigger1">
              Trigger 1
            </Popover.Trigger>
            <Popover.Trigger payload="second" data-testid="trigger2">
              Trigger 2
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>
                  <Popover.Viewport>
                    {payload() === 'first' ? (
                      <img data-testid="payload-image-1" src="about:blank" alt="Preview 1" />
                    ) : null}
                    {payload() === 'second' ? (
                      <img data-testid="payload-image-2" src="about:blank" alt="Preview 2" />
                    ) : null}
                  </Popover.Viewport>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </>
        )}
      </Popover.Root>
    ));

    const trigger1 = screen.getByTestId('trigger1');
    const trigger2 = screen.getByTestId('trigger2');

    await user.click(trigger1);

    const firstImage = await screen.findByTestId('payload-image-1');
    const firstContainer = firstImage.closest('[data-current]');
    expect(firstContainer).not.toBe(null);

    await user.click(trigger2);

    await waitFor(() => {
      const secondImage = screen.getByTestId('payload-image-2');
      const secondContainer = secondImage.closest('[data-current]');
      expect(secondContainer).not.toBe(null);
      expect(secondContainer).not.toBe(firstContainer);
    });
  });

  // Port note: Solid has no StrictMode, so both rows run the same test. Upstream remounts the
  // trigger with a `key`; a keyed `Show` recreates it here, and `rerender` is a signal write.
  it.each([false, true])(
    'does not restart a transition when the active trigger remounts while closed and retained (strict: %s)',
    async () => {
      const [triggerKey, setTriggerKey] = createSignal('a');

      function Test() {
        return (
          <Popover.Root
            defaultOpen
            defaultTriggerId="trigger"
            onOpenChange={(open, eventDetails) => {
              if (!open) {
                eventDetails.preventUnmountOnClose();
              }
            }}
          >
            <Show when={triggerKey()} keyed>
              {(_key) => <Popover.Trigger id="trigger">Trigger</Popover.Trigger>}
            </Show>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>
                  <Popover.Viewport data-testid="viewport">Content</Popover.Viewport>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        );
      }

      const { user } = await render(() => <Test />);

      await user.click(screen.getByRole('button', { name: 'Trigger' }));
      setTriggerKey('b');
      await flushMicrotasks();

      expect(screen.getByTestId('viewport')).toBeInTheDocument();
    },
  );

  describe.skipIf(isJSDOM)('morphing containers with multiple triggers and payloads', () => {
    beforeEach(() => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
    });

    afterEach(() => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
    });

    it('should create morphing containers during transitions', async () => {
      const { user } = await render(() => (
        <div>
          <style>
            {`
              [data-transitioning] [data-previous] {
                animation: slide-out 0.3s ease-out forwards;
              }
              [data-transitioning] [data-current] {
                animation: slide-in 0.3s ease-out forwards;
              }
              @keyframes slide-out {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(-30%); opacity: 0; }
              }
              @keyframes slide-in {
                from { transform: translateX(30%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `}
          </style>
          <Popover.Root>
            {({ payload }) => (
              <>
                <Popover.Trigger
                  payload={0}
                  data-testid="trigger1"
                  style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    width: '100px',
                    height: '50px',
                  }}
                >
                  Trigger 1
                </Popover.Trigger>
                <Popover.Trigger
                  payload={1}
                  data-testid="trigger2"
                  style={{
                    position: 'absolute',
                    top: '100px',
                    left: '200px',
                    width: '100px',
                    height: '50px',
                  }}
                >
                  Trigger 2
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Positioner>
                    <Popover.Popup>
                      <Popover.Viewport>
                        <div data-testid="content">Content {payload() as number}</div>
                      </Popover.Viewport>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </>
            )}
          </Popover.Root>
        </div>
      ));

      const trigger1 = screen.getByTestId('trigger1');
      const trigger2 = screen.getByTestId('trigger2');

      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByText('Content 0')).toBeVisible();
      });

      // Click second trigger to trigger morphing
      await user.click(trigger2);

      // Check for morphing containers during transition
      let previousContainer: HTMLElement | null = null;
      await waitFor(() => {
        previousContainer = document.querySelector('[data-previous]');
        expect(previousContainer).not.toBe(null);
      });

      expect(previousContainer).toHaveAttribute('inert');
      expect(previousContainer!.textContent).toBe('Content 0');

      const nextContainer = document.querySelector('[data-current]');
      expect(nextContainer).not.toBe(null);
      expect(nextContainer!.textContent).toBe('Content 1');

      // Verify they are cleaned up after animation
      await waitFor(() => {
        expect(document.querySelector('[data-previous]')).toBe(null);
      });

      expect(document.querySelector('[data-current]')).toBeVisible();
      expect(screen.getByText('Content 1')).toBeVisible();
    });

    it('should create morphing containers after a kept-mounted popup closes and reopens', async () => {
      function TestComponent() {
        const [open, setOpen] = createSignal(false);

        return (
          <div>
            <style>
              {`
                [data-transitioning] [data-previous] {
                  animation: slide-out 0.2s ease-out forwards;
                }
                [data-transitioning] [data-current] {
                  animation: slide-in 0.2s ease-out forwards;
                }
                @keyframes slide-out {
                  from { transform: translateX(0); opacity: 1; }
                  to { transform: translateX(-30%); opacity: 0; }
                }
                @keyframes slide-in {
                  from { transform: translateX(30%); opacity: 0; }
                  to { transform: translateX(0); opacity: 1; }
                }
              `}
            </style>
            <button type="button" onClick={() => setOpen(false)}>
              Close
            </button>
            <Popover.Root open={open()} onOpenChange={setOpen}>
              {({ payload }) => (
                <>
                  <Popover.Trigger payload={0} data-testid="trigger1">
                    Trigger 1
                  </Popover.Trigger>
                  <Popover.Trigger payload={1} data-testid="trigger2">
                    Trigger 2
                  </Popover.Trigger>
                  <Popover.Portal keepMounted>
                    <Popover.Positioner>
                      <Popover.Popup data-testid="popup">
                        <Popover.Viewport>Content {payload() as number}</Popover.Viewport>
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </>
              )}
            </Popover.Root>
          </div>
        );
      }

      const { user } = await render(() => <TestComponent />);

      const trigger1 = screen.getByTestId('trigger1');
      const trigger2 = screen.getByTestId('trigger2');

      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByText('Content 0')).toBeVisible();
      });

      await user.click(trigger2);
      await waitFor(() => {
        expect(document.querySelector('[data-previous]')).not.toBe(null);
      });
      await waitFor(() => {
        expect(document.querySelector('[data-previous]')).toBe(null);
      });

      await user.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.getByTestId('popup')).not.toBeVisible();
      });

      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByText('Content 0')).toBeVisible();
      });

      await user.click(trigger2);

      let previousContainer: HTMLElement | null = null;
      await waitFor(() => {
        previousContainer = document.querySelector('[data-previous]');
        expect(previousContainer).not.toBe(null);
      });

      expect(previousContainer!.textContent).toBe('Content 0');
      // Port note: the morph starts in the same flush as upstream, but React's act/user-event add
      // macrotasks before upstream's synchronous assertion, so the slide-in animation has advanced
      // there, while here it's still on its first frame (opacity 0). Wait for it to become visible.
      await waitFor(() => {
        expect(screen.getByText('Content 1')).toBeVisible();
      });
    });

    it('should handle rapid trigger changes', async () => {
      function TestComponent() {
        return (
          <div>
            <style>
              {`
              [data-transitioning] [data-previous] {
                animation: slide-out 0.2s ease-out forwards;
              }
              [data-transitioning] [data-current] {
                animation: slide-in 0.2s ease-out forwards;
              }
              @keyframes slide-out {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(-30%); opacity: 0; }
              }
              @keyframes slide-in {
                from { transform: translateX(30%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `}
            </style>
            <Popover.Root>
              {({ payload }) => (
                <>
                  <Popover.Trigger payload={1} data-testid="trigger1">
                    Trigger 1
                  </Popover.Trigger>
                  <Popover.Trigger payload={2} data-testid="trigger2">
                    Trigger 2
                  </Popover.Trigger>
                  <Popover.Trigger payload={3} data-testid="trigger3">
                    Trigger 3
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Positioner>
                      <Popover.Popup>
                        <Popover.Viewport>Content {payload() as number}</Popover.Viewport>
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </>
              )}
            </Popover.Root>
          </div>
        );
      }

      const { user } = await render(() => <TestComponent />);

      const trigger1 = screen.getByTestId('trigger1');
      const trigger2 = screen.getByTestId('trigger2');
      const trigger3 = screen.getByTestId('trigger3');

      await user.click(trigger1);
      await user.click(trigger2);
      await user.click(trigger3);
      await user.click(trigger1);

      const content = await screen.findByText('Content 1');
      await waitFor(() => {
        expect(content).toBeVisible();
      });
    });

    it.each([
      {
        name: 'should calculate "right down" direction',
        trigger1: { top: 10, left: 10 },
        trigger2: { top: 100, left: 200 },
        expectedDirection: ['right', 'down'],
      },
      {
        name: 'should calculate "left up" direction',
        trigger1: { top: 100, left: 200 },
        trigger2: { top: 10, left: 10 },
        expectedDirection: ['left', 'up'],
      },
      {
        name: 'should calculate "right" direction (horizontal only)',
        trigger1: { top: 50, left: 10 },
        trigger2: { top: 52, left: 200 }, // 2px vertical difference within tolerance
        expectedDirection: ['right'],
      },
      {
        name: 'should calculate "down" direction (vertical only)',
        trigger1: { top: 10, left: 50 },
        trigger2: { top: 100, left: 52 }, // 2px horizontal difference within tolerance
        expectedDirection: ['down'],
      },
      {
        name: 'should handle tolerance for small differences',
        trigger1: { top: 50, left: 50 },
        trigger2: { top: 52, left: 52 }, // Both differences within 5px tolerance
        expectedDirection: [],
      },
      {
        name: 'should calculate "left down" direction',
        trigger1: { top: 10, left: 200 },
        trigger2: { top: 100, left: 10 },
        expectedDirection: ['left', 'down'],
      },
      {
        name: 'should calculate "right up" direction',
        trigger1: { top: 100, left: 10 },
        trigger2: { top: 10, left: 200 },
        expectedDirection: ['right', 'up'],
      },
    ])('$name', async ({ trigger1, trigger2, expectedDirection }) => {
      const { user } = await render(() => (
        <div>
          <style>
            {`
              [data-transitioning] [data-previous] {
                animation: slide-out 0.2s ease-out forwards;
              }
              [data-transitioning] [data-current] {
                animation: slide-in 0.2s ease-out forwards;
              }
              @keyframes slide-out {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(-30%); opacity: 0; }
              }
              @keyframes slide-in {
                from { transform: translateX(30%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `}
          </style>
          <Popover.Root>
            {({ payload }) => (
              <>
                <Popover.Trigger
                  payload={0}
                  data-testid="trigger1"
                  style={{
                    position: 'absolute',
                    top: `${trigger1.top}px`,
                    left: `${trigger1.left}px`,
                    width: '100px',
                    height: '50px',
                  }}
                >
                  Trigger 1
                </Popover.Trigger>
                <Popover.Trigger
                  payload={1}
                  data-testid="trigger2"
                  style={{
                    position: 'absolute',
                    top: `${trigger2.top}px`,
                    left: `${trigger2.left}px`,
                    width: '100px',
                    height: '50px',
                  }}
                >
                  Trigger 2
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Positioner>
                    <Popover.Popup>
                      <Popover.Viewport data-testid="viewport">
                        <div data-testid="content">Content {payload() as number}</div>
                      </Popover.Viewport>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </>
            )}
          </Popover.Root>
        </div>
      ));

      const triggerElement1 = screen.getByTestId('trigger1');
      const triggerElement2 = screen.getByTestId('trigger2');

      await user.click(triggerElement1);

      await waitFor(() => {
        expect(screen.getByText('Content 0')).toBeVisible();
      });

      await user.click(triggerElement2);

      const viewport = screen.getByTestId('viewport');
      await waitFor(() => {
        expect(viewport).toHaveAttribute('data-activation-direction');
      });

      const direction = viewport.getAttribute('data-activation-direction');
      const directionTokens = (direction ?? '').split(' ').filter(Boolean);

      expect(directionTokens.sort()).toEqual([...expectedDirection].sort());
    });
  });
});
