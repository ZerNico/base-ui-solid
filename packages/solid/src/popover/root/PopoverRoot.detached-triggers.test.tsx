import { expect, vi, describe, beforeEach, it } from 'vitest';
import { createSignal, Match, omit, Show, Switch, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { UserEvent } from '@testing-library/user-event';
import { createRenderer, fireEvent, flushMicrotasks, isJSDOM, screen, waitFor } from '#test-utils';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { Popover } from '..';

// Port notes:
// - `act(async () => { … })` becomes the body followed by `await flushMicrotasks()`, and
//   `React.useState` wrappers / `setProps` become signals (flushed before asserting).
// - `Popover.Root`'s children render function is called once with an object whose `payload` is a
//   getter, so it's read as `arg.payload` (not destructured).
// - `render={<Component />}` (React element) is unsupported: render functions are used instead.
// - A `render` function is called once, so the per-render `state` recording upstream does is done
//   from a layout effect that re-runs whenever the recorded state changes.

describe('<Popover.Root />', () => {
  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  const { render, clock } = createRenderer();

  // Stands in for ref mergers like `@rc-component/util`'s `useComposeRef`, which retain the
  // callback they were first given.
  // Port note: React's `key={nodeKey}` becomes a keyed `Show`, which recreates the host node when
  // `nodeKey` changes.
  function StaleRefButton(
    props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
      nodeKey?: string | undefined;
      ref?: ((element: HTMLButtonElement) => void) | undefined;
    },
  ) {
    const staleRef = untrack(() => props.ref);
    const rest = omit(props, 'nodeKey', 'ref');
    return (
      <Show when={props.nodeKey ?? 'default'} keyed>
        {(_nodeKey) => <button {...rest} ref={staleRef} />}
      </Show>
    );
  }

  it('opens by trigger from a descendant layout effect on initial mount', async () => {
    const handle = Popover.createHandle();
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    function OpenOnMount() {
      useIsoLayoutEffect(
        () => {
          handle.open('trigger');
        },
        () => [],
      );
      return null;
    }

    await render(() => (
      <Popover.Root handle={handle}>
        <Popover.Trigger id="trigger">Trigger</Popover.Trigger>
        <OpenOnMount />
      </Popover.Root>
    ));

    const detachedWarned = consoleWarn.mock.calls.some(
      ([message]) =>
        typeof message === 'string' && message.includes('no root using this handle is mounted'),
    );
    consoleWarn.mockRestore();

    expect(detachedWarned).toBe(false);
    expect(handle.isOpen).toBe(true);
    expect(screen.getByRole('button', { name: 'Trigger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('hands off hover between detached triggers when the rendered component retains a stale ref', async () => {
    const handle = Popover.createHandle<number>();
    const fallbackStore = handle.store;

    const { user } = await render(() => (
      <>
        {[1, 2].map((payload) => (
          <Popover.Trigger
            handle={handle}
            id={`trigger-${payload}`}
            payload={payload}
            openOnHover
            delay={0}
            // Forces the handoff path: without a close delay the popup just closes and reopens,
            // which works even when the trigger is registered on the wrong store.
            closeDelay={100}
            render={(props) => <StaleRefButton {...props} />}
          >
            Trigger {payload}
          </Popover.Trigger>
        ))}
        <Popover.Root handle={handle}>
          {(arg) => (
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup data-testid="popup">{arg.payload}</Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          )}
        </Popover.Root>
      </>
    ));

    expect(fallbackStore.context.triggerElements.size).toBe(0);
    expect(handle.store.context.triggerElements.size).toBe(2);

    await user.hover(screen.getByRole('button', { name: 'Trigger 1' }));
    await waitFor(() => {
      expect(screen.getByTestId('popup')).toHaveTextContent('1');
    });

    await user.hover(screen.getByRole('button', { name: 'Trigger 2' }));
    await waitFor(() => {
      expect(screen.getByTestId('popup')).toHaveTextContent('2');
    });
  });

  it('keeps registration on the attached store when a stale-ref component swaps its host node', async () => {
    const handle = Popover.createHandle<number>();
    const fallbackStore = handle.store;

    function App() {
      const [nodeKey, setNodeKey] = createSignal('a');
      return (
        <>
          <button type="button" onClick={() => setNodeKey('b')}>
            Swap node
          </button>
          <Popover.Trigger
            handle={handle}
            id="trigger"
            payload={1}
            render={(props) => <StaleRefButton {...props} nodeKey={nodeKey()} />}
          >
            Trigger
          </Popover.Trigger>
          <Popover.Root handle={handle}>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup data-testid="popup">Content</Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </>
      );
    }

    const { user } = await render(() => <App />);

    const initialTrigger = screen.getByRole('button', { name: 'Trigger' });
    expect(fallbackStore.context.triggerElements.size).toBe(0);
    expect(handle.store.context.triggerElements.getById('trigger')).toBe(initialTrigger);

    // Replacing the host node re-fires the retained ref callback after the migration.
    await user.click(screen.getByRole('button', { name: 'Swap node' }));
    await flushMicrotasks();

    const swappedTrigger = screen.getByRole('button', { name: 'Trigger' });
    // Guards the setup: without a real host swap the rest of the test proves nothing.
    expect(swappedTrigger).not.toBe(initialTrigger);
    expect(initialTrigger.isConnected).toBe(false);
    expect(fallbackStore.context.triggerElements.size).toBe(0);
    expect(handle.store.context.triggerElements.getById('trigger')).toBe(swappedTrigger);

    // `open()` searches attached stores first, so a registration left on the wrong store would
    // anchor the popup to the removed node.
    handle.open('trigger');
    await flushMicrotasks();

    await waitFor(() => {
      expect(screen.getByTestId('popup')).toBeVisible();
    });
    expect(handle.store.state.activeTriggerElement).toBe(swappedTrigger);
  });

  it('does not detach the consumer ref when the handle attaches to a root', async () => {
    const handle = Popover.createHandle();
    const refCalls: (Element | null)[] = [];

    // Port note: upstream passes `{ strict: false }` because Strict Mode replays refs; there's no
    // Strict Mode here.
    await render(() => (
      <>
        <Popover.Trigger
          handle={handle}
          id="trigger"
          ref={(element: HTMLElement | null) => {
            refCalls.push(element);
          }}
        >
          Trigger
        </Popover.Trigger>
        <Popover.Root handle={handle}>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>Content</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </>
    ));

    expect(handle.store.context.triggerElements.getById('trigger')).toBe(
      screen.getByRole('button', { name: 'Trigger' }),
    );
    // Migrating from the fallback store to the root's store must not churn the merged ref, which
    // would hand the consumer a spurious `null` and back.
    expect(refCalls).toEqual([screen.getByRole('button', { name: 'Trigger' })]);
  });

  describe.skipIf(isJSDOM)('handle-backed root ownership', () => {
    type NumberPayload = { payload: number | undefined };

    it('ignores imperative handle calls made before a root is attached', async () => {
      const handle = Popover.createHandle<number>();

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

      const { user } = await render(() => (
        <>
          <Popover.Trigger handle={handle} id="trigger" payload={1}>
            Trigger
          </Popover.Trigger>
          <Popover.Root handle={handle}>
            {(arg: NumberPayload) => (
              <>
                <span data-testid="payload">{arg.payload ?? 'No payload'}</span>
                <Popover.Portal>
                  <Popover.Positioner>
                    <Popover.Popup>Popover Content</Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </>
            )}
          </Popover.Root>
        </>
      ));

      expect(screen.queryByText('Popover Content')).toBe(null);
      expect(screen.getByTestId('payload').textContent).toBe('No payload');

      await user.click(screen.getByRole('button', { name: 'Trigger' }));
      await waitFor(() => {
        expect(screen.getByText('Popover Content')).toBeVisible();
      });
      expect(screen.getByTestId('payload').textContent).toBe('1');
    });

    it('ignores imperative handle calls made after the root is detached', async () => {
      const handle = Popover.createHandle<number>();

      function App() {
        const [mounted, setMounted] = createSignal(true);

        return (
          <>
            <Popover.Trigger handle={handle} id="trigger" payload={1}>
              Trigger
            </Popover.Trigger>
            <Show when={!mounted()}>
              <button type="button" onClick={() => setMounted(true)}>
                Remount root
              </button>
            </Show>
            <Show when={mounted()}>
              <Popover.Root handle={handle}>
                {(arg: NumberPayload) => (
                  <>
                    <span data-testid="payload">{arg.payload ?? 'No payload'}</span>
                    <Popover.Portal>
                      <Popover.Positioner>
                        <Popover.Popup>
                          Popover Content
                          <button type="button" onClick={() => setMounted(false)}>
                            Unmount root
                          </button>
                        </Popover.Popup>
                      </Popover.Positioner>
                    </Popover.Portal>
                  </>
                )}
              </Popover.Root>
            </Show>
          </>
        );
      }

      const { user } = await render(() => <App />);
      const trigger = screen.getByRole('button', { name: 'Trigger' });

      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Popover Content')).toBeVisible();
      });
      expect(screen.getByTestId('payload').textContent).toBe('1');

      await user.click(screen.getByRole('button', { name: 'Unmount root' }));
      await flushMicrotasks();
      expect(handle.isOpen).toBe(false);
      await waitFor(() => {
        expect(screen.queryByText('Popover Content')).toBe(null);
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
      expect(screen.queryByText('Popover Content')).toBe(null);
      expect(screen.getByTestId('payload').textContent).toBe('No payload');

      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Popover Content')).toBeVisible();
      });
      expect(screen.getByTestId('payload').textContent).toBe('1');
    });

    it('registers a detached trigger declared after the root', async () => {
      const handle = Popover.createHandle();

      const { user } = await render(() => (
        <>
          <Popover.Root handle={handle}>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>Popover Content</Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          <Popover.Trigger handle={handle} id="trigger">
            Trigger
          </Popover.Trigger>
        </>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });

      await user.click(trigger);
      await waitFor(() => {
        expect(screen.getByText('Popover Content')).toBeVisible();
      });

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('throws when called with an unregistered trigger id', async () => {
      const handle = Popover.createHandle();

      await render(() => (
        <>
          <Popover.Root handle={handle}>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>Popover Content</Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          <Popover.Trigger handle={handle} id="trigger">
            Trigger
          </Popover.Trigger>
        </>
      ));

      expect(() => handle.open('missing')).toThrow('was called with the trigger id "missing"');
      expect(handle.isOpen).toBe(false);
    });

    describe('multiple roots sharing one handle', () => {
      // Fake timers so the deferred overlap check only runs when ticked, after the handoff settles.
      clock.withFakeTimers();

      it('warns when a handle stays attached to more than one mounted root', async () => {
        const handle = Popover.createHandle();
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await render(() => (
          <>
            <Popover.Root handle={handle}>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup>First</Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <Popover.Root handle={handle}>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup>Second</Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </>
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
        const handle = Popover.createHandle();
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

        function App(props: { phase: 'outgoing' | 'overlap' | 'incoming' }) {
          return (
            <>
              <Popover.Trigger handle={handle} id="trigger">
                Trigger
              </Popover.Trigger>
              <Show when={props.phase === 'outgoing' || props.phase === 'overlap'}>
                <Popover.Root handle={handle}>
                  <Popover.Portal>
                    <Popover.Positioner>
                      <Popover.Popup>Outgoing</Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              </Show>
              <Show when={props.phase === 'overlap' || props.phase === 'incoming'}>
                <Popover.Root handle={handle}>
                  <Popover.Portal>
                    <Popover.Positioner>
                      <Popover.Popup>Incoming</Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
                <OpenOnMount />
              </Show>
            </>
          );
        }

        // The detached trigger settles into the outgoing root's store (it is no longer in the
        // fallback map). The incoming root then attaches while the outgoing one is still mounted,
        // and a layout effect in that same commit opens by trigger id — before the trigger has
        // migrated to the incoming root's store.
        const [phase, setPhase] = createSignal<'outgoing' | 'overlap' | 'incoming'>('outgoing');
        await render(() => <App phase={phase()} />);
        setPhase('overlap');
        await flushMicrotasks();

        expect(openErrors).toHaveLength(0);
        expect(handle.isOpen).toBe(true);
        expect(screen.getByRole('button', { name: 'Trigger' })).toHaveAttribute(
          'aria-expanded',
          'true',
        );

        // Completing the handoff (the outgoing root unmounts) keeps the popup open and associated.
        setPhase('incoming');
        await flushMicrotasks();
        expect(handle.isOpen).toBe(true);
      });
    });
  });

  describe.skipIf(isJSDOM)('multiple triggers within Root', () => {
    type NumberPayload = { payload: number | undefined };

    it('should open the popover with any trigger', async () => {
      const { user } = await render(() => (
        <Popover.Root>
          <Popover.Trigger>Trigger 1</Popover.Trigger>
          <Popover.Trigger>Trigger 2</Popover.Trigger>
          <Popover.Trigger>Trigger 3</Popover.Trigger>

          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>
                Popover Content
                <Popover.Close>Close</Popover.Close>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });

      expect(screen.queryByText('Popover Content')).toBe(null);

      await user.click(trigger1);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).toBe(null);

      await user.click(trigger2);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).toBe(null);

      await user.click(trigger3);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).toBe(null);
    });

    it('should set the payload and render content based on its value', async () => {
      const { user } = await render(() => (
        <Popover.Root>
          {(arg: NumberPayload) => (
            <>
              <Popover.Trigger payload={1}>Trigger 1</Popover.Trigger>
              <Popover.Trigger payload={2}>Trigger 2</Popover.Trigger>

              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup>
                    <span data-testid="content">{arg.payload}</span>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </>
          )}
        </Popover.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      expect(screen.getByTestId('content').textContent).toBe('1');

      await user.click(trigger2);
      expect(screen.getByTestId('content').textContent).toBe('2');
    });

    it('synchronizes ARIA attributes in controlled mode', async () => {
      await render(() => (
        <Popover.Root open triggerId="trigger-2">
          <Popover.Trigger id="trigger-1">Trigger 1</Popover.Trigger>
          <Popover.Trigger id="trigger-2">Trigger 2</Popover.Trigger>

          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>Popover Content</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const popup = await screen.findByRole('dialog');

      expect(trigger1).toHaveAttribute('aria-expanded', 'false');
      expect(trigger1).not.toHaveAttribute('aria-controls');
      expect(trigger2).toHaveAttribute('aria-expanded', 'true');
      expect(trigger2.getAttribute('aria-controls')).toBe(popup.getAttribute('id'));
    });

    it('synchronizes ARIA attributes for a controlled open single trigger without triggerId', async () => {
      await render(() => (
        <Popover.Root open>
          <Popover.Trigger>Trigger</Popover.Trigger>

          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>Popover Content</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      const popup = await screen.findByRole('dialog');

      await waitFor(() => {
        expect(trigger.getAttribute('aria-controls')).toBe(popup.getAttribute('id'));
      });
    });

    it('should reuse the popup and positioner DOM nodes when switching triggers', async () => {
      const { user } = await render(() => (
        <Popover.Root>
          {(arg: NumberPayload) => (
            <>
              <Popover.Trigger payload={1}>Trigger 1</Popover.Trigger>
              <Popover.Trigger payload={2}>Trigger 2</Popover.Trigger>

              <Popover.Portal>
                <Popover.Positioner data-testid="positioner">
                  <Popover.Popup data-testid="popup">
                    <span>{arg.payload}</span>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </>
          )}
        </Popover.Root>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      const popupElement = screen.getByTestId('popup');
      const positionerElement = screen.getByTestId('positioner');

      await user.click(trigger2);
      expect(screen.getByTestId('popup')).toBe(popupElement);
      expect(screen.getByTestId('positioner')).toBe(positionerElement);
    });

    it('should allow controlling the popover state programmatically', async () => {
      function Test() {
        const [open, setOpen] = createSignal(false);
        const [activeTrigger, setActiveTrigger] = createSignal<string | null>(null);

        return (
          <div>
            <Popover.Root
              open={open()}
              triggerId={activeTrigger()}
              onOpenChange={(nextOpen, details) => {
                setActiveTrigger(details.trigger?.id ?? null);
                setOpen(nextOpen);
              }}
            >
              {(arg: NumberPayload) => (
                <>
                  <Popover.Trigger payload={1} id="trigger-1">
                    Trigger 1
                  </Popover.Trigger>
                  <Popover.Trigger payload={2} id="trigger-2">
                    Trigger 2
                  </Popover.Trigger>

                  <Popover.Portal>
                    <Popover.Positioner>
                      <Popover.Popup>
                        <span data-testid="content">{arg.payload as number}</span>
                        <Popover.Close>Close</Popover.Close>
                      </Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </>
              )}
            </Popover.Root>
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
          </div>
        );
      }

      const { user } = await render(() => <Test />);
      await user.click(screen.getByRole('button', { name: 'Open Trigger 1' }));
      await flushMicrotasks();
      expect(screen.getByTestId('content').textContent).toBe('1');
      const openTrigger2Button = screen.getByRole('button', { name: 'Open Trigger 2' });
      await user.click(openTrigger2Button);
      await flushMicrotasks();
      expect(screen.getByTestId('content').textContent).toBe('2');
      await user.click(screen.getByRole('button', { name: 'Close' }));
      await flushMicrotasks();
      expect(screen.queryByTestId('content')).toBe(null);
      expect(openTrigger2Button).toHaveFocus();
    });

    it('returns focus to the active trigger when opening programmatically from body focus', async () => {
      function Test() {
        const [open, setOpen] = createSignal(false);
        const [activeTrigger, setActiveTrigger] = createSignal<string | null>(null);

        return (
          <>
            <Popover.Root
              open={open()}
              triggerId={activeTrigger()}
              onOpenChange={(nextOpen, details) => {
                setActiveTrigger(details.trigger?.id ?? null);
                setOpen(nextOpen);
              }}
            >
              <Popover.Trigger payload={1} id="trigger-1">
                Trigger 1
              </Popover.Trigger>
              <Popover.Trigger payload={2} id="trigger-2">
                Trigger 2
              </Popover.Trigger>

              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup>
                    <span data-testid="content">Content</span>
                    <Popover.Close>Close</Popover.Close>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>

            <button
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setOpen(true);
                setActiveTrigger('trigger-2');
              }}
            >
              Open Trigger 2 without focus
            </button>
          </>
        );
      }

      const { user } = await render(() => <Test />);

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      await user.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(trigger1).toHaveFocus();
      });

      trigger1.blur();
      expect(document.body).toHaveFocus();

      await user.click(screen.getByRole('button', { name: 'Open Trigger 2 without focus' }));
      await waitFor(() => {
        expect(screen.getByTestId('content')).toBeVisible();
      });

      await user.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(trigger2).toHaveFocus();
      });
    });

    it('returns focus to the previous element when the trigger unmounts while open', async () => {
      function Test() {
        const [open, setOpen] = createSignal(false);
        const [showTrigger, setShowTrigger] = createSignal(true);

        return (
          <>
            <button type="button">Focus fallback</button>

            <Popover.Root
              open={open()}
              onOpenChange={(nextOpen) => {
                if (nextOpen) {
                  setShowTrigger(false);
                }
                setOpen(nextOpen);
              }}
            >
              <Show when={showTrigger()}>
                <Popover.Trigger onMouseDown={(event) => event.preventDefault()}>
                  Disappearing trigger
                </Popover.Trigger>
              </Show>

              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup>
                    <span data-testid="content">Content</span>
                    <Popover.Close>Close</Popover.Close>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </>
        );
      }

      const { user } = await render(() => <Test />);

      const fallback = screen.getByRole('button', { name: 'Focus fallback' });
      await user.click(fallback);
      expect(fallback).toHaveFocus();

      await user.click(screen.getByRole('button', { name: 'Disappearing trigger' }));
      await waitFor(() => {
        expect(screen.getByTestId('content')).toBeVisible();
      });

      await user.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByTestId('content')).toBe(null);
      });
      expect(fallback).toHaveFocus();
    });

    it('allows setting an initially open popover', async () => {
      const testPopover = Popover.createHandle<number>();
      await render(() => (
        <Popover.Root handle={testPopover} defaultOpen defaultTriggerId="trigger-2">
          {(arg: NumberPayload) => (
            <>
              <Popover.Trigger handle={testPopover} payload={1} id="trigger-1">
                Trigger 1
              </Popover.Trigger>
              <Popover.Trigger handle={testPopover} payload={2} id="trigger-2">
                Trigger 2
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup data-testid="popup">
                    <span>{arg.payload}</span>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </>
          )}
        </Popover.Root>
      ));

      expect(screen.getByTestId('popup').textContent).toBe('2');
    });
  });

  describe.skipIf(isJSDOM)('multiple detached triggers', () => {
    type NumberPayload = { payload: number | undefined };

    /**
     * Renders two detached hover triggers with a real position transition on the
     * positioner and a real exit transition on the popup, then hands the popover
     * off from trigger 1 to trigger 2 so `instantType` is `trigger-change`.
     *
     * `instantsWhileEnding` records the `instant` state of every closing render,
     * which is the only way to observe a stale value that a later render clears
     * before the DOM can be asserted on.
     */
    async function renderHoverDetachedTriggers({
      popupChildren,
      settleTriggerChange = true,
      switchDuration = 120,
      exitDuration = 250,
    }: {
      // Port note: a function, so the children are created inside the popup (they read its
      // context).
      popupChildren?: (() => JSX.Element) | undefined;
      /**
       * Set to `false` to return while the positioner is still animating to the
       * new trigger, so the delayed `trigger-change` restoration is still pending.
       */
      settleTriggerChange?: boolean | undefined;
      /** How long the positioner takes to move to the new trigger. */
      switchDuration?: number | undefined;
      /** How long the popup takes to fade out. */
      exitDuration?: number | undefined;
    } = {}) {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const testPopover = Popover.createHandle<number>();
      const instantsWhileEnding: (string | undefined)[] = [];

      const utils = await render(() => (
        <div style={{ position: 'relative', width: '400px', height: '200px' }}>
          <style>
            {`
              .positioner {
                transition:
                  top ${switchDuration}ms linear,
                  left ${switchDuration}ms linear,
                  transform ${switchDuration}ms linear;
              }

              .popup {
                opacity: 1;
                transition: opacity ${exitDuration}ms linear;
              }

              .popup[data-ending-style] {
                opacity: 0;
              }

              .positioner[data-instant],
              .popup[data-instant] {
                transition: none;
              }
            `}
          </style>

          <Popover.Trigger
            handle={testPopover}
            payload={1}
            openOnHover
            delay={0}
            style={{ position: 'absolute', top: '20px', left: '20px' }}
          >
            Trigger 1
          </Popover.Trigger>
          <Popover.Trigger
            handle={testPopover}
            payload={2}
            openOnHover
            delay={0}
            style={{ position: 'absolute', top: '20px', left: '220px' }}
          >
            Trigger 2
          </Popover.Trigger>

          <Popover.Root handle={testPopover}>
            {(arg: NumberPayload) => (
              <Popover.Portal>
                <Popover.Positioner data-testid="positioner" class="positioner">
                  <Popover.Popup
                    data-testid="popup"
                    class="popup"
                    render={(props, state) => {
                      useIsoLayoutEffect(
                        ([transitionStatus, instant]) => {
                          if (transitionStatus === 'ending') {
                            instantsWhileEnding.push(instant);
                          }
                        },
                        () => [state.transitionStatus, state.instant] as const,
                      );
                      return <div {...props} />;
                    }}
                  >
                    <span data-testid="content">{arg.payload}</span>
                    {popupChildren?.()}
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            )}
          </Popover.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await utils.user.hover(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });

      await utils.user.hover(trigger2);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('2');
      });

      if (settleTriggerChange) {
        await waitFor(() => {
          expect(screen.getByTestId('popup')).toHaveAttribute('data-instant', 'trigger-change');
        });
      }

      // The handoff itself legitimately renders `trigger-change` while closing
      // the previous trigger's popup. Only the close that follows matters.
      instantsWhileEnding.length = 0;

      return {
        ...utils,
        trigger1,
        trigger2,
        instantsWhileEnding,
        popup: screen.getByTestId('popup'),
      };
    }

    it('does not apply the trigger-change instant to a hover close after switching triggers', async () => {
      const { user, trigger2, popup, instantsWhileEnding } = await renderHoverDetachedTriggers();

      await user.unhover(trigger2);
      await waitFor(() => {
        expect(popup).toHaveAttribute('data-ending-style');
      });

      expect(instantsWhileEnding).not.toContain('trigger-change');
    });

    it('does not apply the trigger-change instant to a non-hover close after switching triggers', async () => {
      const { popup, instantsWhileEnding } = await renderHoverDetachedTriggers({
        popupChildren: () => <Popover.Close>Close</Popover.Close>,
      });

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(popup).toHaveAttribute('data-ending-style');
      });

      expect(instantsWhileEnding).not.toContain('trigger-change');
    });

    it('does not apply the trigger-change instant after switching back to the original trigger', async () => {
      const { user, trigger1, instantsWhileEnding } = await renderHoverDetachedTriggers();

      await user.hover(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });
      await waitFor(() => {
        expect(screen.getByTestId('popup')).toHaveAttribute('data-instant', 'trigger-change');
      });
      instantsWhileEnding.length = 0;

      await user.unhover(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('popup')).toHaveAttribute('data-ending-style');
      });

      expect(instantsWhileEnding).not.toContain('trigger-change');
    });

    it('does not restore the trigger-change instant after a reopen on the same trigger', async () => {
      // Leaving and returning mid-exit keeps the positioner mounted and the
      // trigger unchanged, so nothing re-runs the effect to cancel the pending
      // switch callback. A slow switch keeps it pending across the reopen.
      const { user, trigger2 } = await renderHoverDetachedTriggers({
        settleTriggerChange: false,
        switchDuration: 500,
        exitDuration: 400,
      });

      await user.unhover(trigger2);
      await waitFor(() => {
        expect(screen.getByTestId('popup')).toHaveAttribute('data-ending-style');
      });

      await user.hover(trigger2);
      await waitFor(() => {
        expect(screen.getByTestId('popup')).not.toHaveAttribute('data-ending-style');
      });

      const reopenedPopup = screen.getByTestId('popup');
      await new Promise((resolve) => {
        setTimeout(resolve, 650);
      });
      await flushMicrotasks();

      expect(reopenedPopup).not.toHaveAttribute('data-instant');
    });

    it('does not apply the trigger-change instant to a prop-driven close after a switch', async () => {
      // A controlled consumer can switch triggers and close entirely through
      // props, so neither transition passes through `setOpen`.
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const endingInstants: (string | undefined)[] = [];
      const controls: { setOpen?: (v: boolean) => void; setTriggerId?: (v: string) => void } = {};

      function Test() {
        const [open, setOpen] = createSignal(false);
        const [triggerId, setTriggerId] = createSignal<string | null>(null);
        controls.setOpen = setOpen;
        controls.setTriggerId = setTriggerId;

        return (
          <div style={{ position: 'relative', width: '400px', height: '240px' }}>
            <style>
              {`
                .positioner {
                  transition:
                    top 300ms linear,
                    left 300ms linear,
                    transform 300ms linear;
                }

                .popup {
                  opacity: 1;
                  transition: opacity 400ms linear;
                }

                .popup[data-ending-style] {
                  opacity: 0;
                }

                .positioner[data-instant],
                .popup[data-instant] {
                  transition: none;
                }
              `}
            </style>

            <Popover.Root
              open={open()}
              triggerId={triggerId()}
              onOpenChange={(nextOpen, details) => {
                if (nextOpen) {
                  setTriggerId(details.trigger?.id ?? null);
                }
                setOpen(nextOpen);
              }}
            >
              <Popover.Trigger id="t1" style={{ position: 'absolute', top: '80px', left: '20px' }}>
                Trigger 1
              </Popover.Trigger>
              <Popover.Trigger id="t2" style={{ position: 'absolute', top: '80px', left: '220px' }}>
                Trigger 2
              </Popover.Trigger>

              <Popover.Portal>
                <Popover.Positioner data-testid="positioner" class="positioner">
                  <Popover.Popup
                    data-testid="popup"
                    class="popup"
                    render={(props, state) => {
                      useIsoLayoutEffect(
                        ([transitionStatus, instant]) => {
                          if (transitionStatus === 'ending') {
                            endingInstants.push(instant);
                          }
                        },
                        () => [state.transitionStatus, state.instant] as const,
                      );
                      return <div {...props} />;
                    }}
                  >
                    Content
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        );
      }

      const { user } = await render(() => <Test />);

      await user.click(screen.getByRole('button', { name: 'Trigger 1' }));
      await waitFor(() => {
        expect(screen.queryByTestId('popup')).not.toBe(null);
      });
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      await flushMicrotasks();

      controls.setTriggerId!('t2');
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.getByTestId('popup')).toHaveAttribute('data-instant', 'trigger-change');
      });

      endingInstants.length = 0;
      controls.setOpen!(false);
      await flushMicrotasks();
      await waitFor(
        () => {
          expect(endingInstants.length).toBeGreaterThan(0);
        },
        { timeout: 2000 },
      );

      expect(endingInstants).not.toContain('trigger-change');

      // Reopening on the same trigger, again purely through props, must not
      // inherit the `trigger-change` the earlier switch had stored.
      await waitFor(() => {
        expect(screen.queryByTestId('popup')).toBe(null);
      });

      controls.setOpen!(true);
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByTestId('popup')).not.toBe(null);
      });

      expect(screen.getByTestId('popup')).not.toHaveAttribute('data-instant');
    });

    it('does not restore the trigger-change instant when a controlled close commits late', async () => {
      // A controlled consumer can accept the close but commit `open={false}`
      // later. That commit goes straight through the prop without passing back
      // through `setOpen`, so a `trigger-change` restored in the meantime would
      // never be cleared and would collapse the exit transition.
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const instantsWhileEnding: (string | undefined)[] = [];
      // Renders between the close request and its late commit. The restoration
      // has to land in this window, or the test isn't exercising the race.
      const instantsWhileClosePending: (string | undefined)[] = [];
      const openedTriggerIds: (string | undefined)[] = [];
      let closeRequested = false;
      const switchDuration = 200;
      const commitDelay = 400;

      function Test() {
        const [open, setOpen] = createSignal(false);
        const [activeTrigger, setActiveTrigger] = createSignal<string | null>(null);

        return (
          <div style={{ position: 'relative', width: '400px', height: '200px' }}>
            <style>
              {`
                .positioner {
                  transition:
                    top ${switchDuration}ms linear,
                    left ${switchDuration}ms linear,
                    transform ${switchDuration}ms linear;
                }

                .popup {
                  opacity: 1;
                  transition: opacity 250ms linear;
                }

                .popup[data-ending-style] {
                  opacity: 0;
                }

                .positioner[data-instant],
                .popup[data-instant] {
                  transition: none;
                }
              `}
            </style>

            <Popover.Root
              open={open()}
              triggerId={activeTrigger()}
              onOpenChange={(nextOpen, details) => {
                if (nextOpen) {
                  openedTriggerIds.push(details.trigger?.id);
                  setActiveTrigger(details.trigger?.id ?? null);
                  setOpen(true);
                  return;
                }

                closeRequested = true;
                setTimeout(() => setOpen(false), commitDelay);
              }}
            >
              <Popover.Trigger
                payload={1}
                id="trigger-1"
                openOnHover
                delay={0}
                style={{ position: 'absolute', top: '20px', left: '20px' }}
              >
                Trigger 1
              </Popover.Trigger>
              <Popover.Trigger
                payload={2}
                id="trigger-2"
                openOnHover
                delay={0}
                style={{ position: 'absolute', top: '20px', left: '220px' }}
              >
                Trigger 2
              </Popover.Trigger>

              <Popover.Portal>
                <Popover.Positioner data-testid="positioner" class="positioner">
                  <Popover.Popup
                    data-testid="popup"
                    class="popup"
                    render={(props, state) => {
                      useIsoLayoutEffect(
                        ([transitionStatus, instant]) => {
                          if (transitionStatus === 'ending') {
                            instantsWhileEnding.push(instant);
                          } else if (closeRequested) {
                            instantsWhileClosePending.push(instant);
                          }
                        },
                        () => [state.transitionStatus, state.instant] as const,
                      );
                      return <div {...props} />;
                    }}
                  >
                    Content
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        );
      }

      const { user } = await render(() => <Test />);

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.hover(trigger1);
      await waitFor(() => {
        expect(screen.queryByTestId('popup')).not.toBe(null);
      });

      // Let the first open settle so moving to trigger 2 is a real switch.
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });
      await flushMicrotasks();

      await user.hover(trigger2);
      // Request the close while the switch is still animating.
      await user.unhover(trigger2);

      await waitFor(
        () => {
          expect(instantsWhileEnding.length).toBeGreaterThan(0);
        },
        { timeout: 2000 },
      );

      expect(openedTriggerIds).toEqual(['trigger-1', 'trigger-2']);
      expect(instantsWhileClosePending).toContain('trigger-change');
      expect(instantsWhileEnding).not.toContain('trigger-change');
    });

    it('does not restore the trigger-change instant after a hover close has started', async () => {
      const { user, trigger2, popup } = await renderHoverDetachedTriggers({
        settleTriggerChange: false,
      });

      const positioner = screen.getByTestId('positioner');
      await waitFor(() => {
        expect(positioner.getAnimations().length).toBeGreaterThan(0);
      });
      const switchAnimations = positioner.getAnimations();

      await user.unhover(trigger2);
      await waitFor(() => {
        expect(popup).toHaveAttribute('data-ending-style');
      });

      await Promise.all(switchAnimations.map((animation) => animation.finished));
      await flushMicrotasks();

      // Still mid-exit: the stale callback must not have marked it instant and
      // collapsed the transition.
      expect(screen.getByTestId('popup')).toBe(popup);
      expect(popup).toHaveAttribute('data-ending-style');
      expect(popup).not.toHaveAttribute('data-instant');
    });

    // Port note: React re-creates the trigger when the wrapper structure changes; a `Switch` on
    // `nesting` does the same.
    function TriggerWithNesting(props: {
      handle: ReturnType<typeof Popover.createHandle>;
      nesting: 0 | 1 | 2 | 3;
    }) {
      const trigger = () => (
        <Popover.Trigger handle={props.handle} id="trigger">
          Trigger
        </Popover.Trigger>
      );

      return (
        <Switch
          fallback={
            <div>
              <div>
                <div>{trigger()}</div>
              </div>
            </div>
          }
        >
          <Match when={props.nesting === 0}>{trigger()}</Match>
          <Match when={props.nesting === 1}>
            <div>{trigger()}</div>
          </Match>
          <Match when={props.nesting === 2}>
            <div>
              <div>{trigger()}</div>
            </div>
          </Match>
        </Switch>
      );
    }

    function DetachedTriggerReparentingTest(props: {
      handle: ReturnType<typeof Popover.createHandle>;
      nesting: 0 | 1 | 2 | 3;
    }) {
      return (
        <>
          <TriggerWithNesting handle={props.handle} nesting={props.nesting} />
          <Popover.Root handle={props.handle}>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>
                  Popover Content
                  <Popover.Close>Close</Popover.Close>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </>
      );
    }

    // Port note: upstream's `render(<DetachedTriggerReparentingTest … />)` + `setProps`.
    async function renderReparentingTest(
      initialHandle: ReturnType<typeof Popover.createHandle>,
      initialNesting: 0 | 1 | 2 | 3,
    ) {
      const [handle, setHandle] = createSignal(initialHandle);
      const [nesting, setNesting] = createSignal(initialNesting);
      const utils = await render(() => (
        <DetachedTriggerReparentingTest handle={handle()} nesting={nesting()} />
      ));
      return {
        ...utils,
        async setProps(props: {
          handle?: ReturnType<typeof Popover.createHandle> | undefined;
          nesting?: 0 | 1 | 2 | 3 | undefined;
        }) {
          if (props.handle !== undefined) {
            setHandle(() => props.handle!);
          }
          if (props.nesting !== undefined) {
            setNesting(props.nesting);
          }
          await flushMicrotasks();
        },
      };
    }

    async function openAndClosePopover(user: UserEvent) {
      await user.click(screen.getByRole('button', { name: 'Trigger' }));
      await waitFor(() => {
        expect(screen.getByText('Popover Content')).toBeVisible();
      });
      await user.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByText('Popover Content')).toBe(null);
      });
    }

    it('should open the popover with any trigger', async () => {
      const testPopover = Popover.createHandle();
      const { user } = await render(() => (
        <div>
          <Popover.Trigger handle={testPopover}>Trigger 1</Popover.Trigger>
          <Popover.Trigger handle={testPopover}>Trigger 2</Popover.Trigger>
          <Popover.Trigger handle={testPopover}>Trigger 3</Popover.Trigger>

          <Popover.Root handle={testPopover}>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>
                  Popover Content
                  <Popover.Close>Close</Popover.Close>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });

      expect(screen.queryByText('Popover Content')).toBe(null);

      await user.click(trigger1);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).toBe(null);

      await user.click(trigger2);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).toBe(null);

      await user.click(trigger3);
      expect(screen.getByText('Popover Content')).toBeVisible();
      await user.click(screen.getByText('Close'));
      expect(screen.queryByText('Popover Content')).toBe(null);
    });

    it('should set the payload and render content based on its value', async () => {
      const testPopover = Popover.createHandle<number>();
      const { user } = await render(() => (
        <div>
          <Popover.Trigger handle={testPopover} payload={1}>
            Trigger 1
          </Popover.Trigger>
          <Popover.Trigger handle={testPopover} payload={2}>
            Trigger 2
          </Popover.Trigger>

          <Popover.Root handle={testPopover}>
            {(arg: NumberPayload) => (
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup>
                    <span data-testid="content">{arg.payload}</span>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            )}
          </Popover.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      expect(screen.getByTestId('content').textContent).toBe('1');

      await user.click(trigger2);
      expect(screen.getByTestId('content').textContent).toBe('2');
    });

    it('keeps detached triggers clickable when reparented (remove wrappers)', async () => {
      const testPopover = Popover.createHandle();
      const { user, setProps } = await renderReparentingTest(testPopover, 3);

      await openAndClosePopover(user);

      await setProps({ nesting: 2 });
      await openAndClosePopover(user);

      await setProps({ nesting: 1 });
      await openAndClosePopover(user);

      await setProps({ nesting: 0 });
      await openAndClosePopover(user);
    });

    it('keeps detached triggers clickable when reparented (add wrappers)', async () => {
      const testPopover = Popover.createHandle();
      const { user, setProps } = await renderReparentingTest(testPopover, 0);

      await openAndClosePopover(user);

      await setProps({ nesting: 1 });
      await openAndClosePopover(user);

      await setProps({ nesting: 2 });
      await openAndClosePopover(user);

      await setProps({ nesting: 3 });
      await openAndClosePopover(user);
    });

    it('keeps detached triggers clickable when reparented during Fast Refresh-like handle recreation', async () => {
      const handleA = Popover.createHandle();
      const { user, setProps } = await renderReparentingTest(handleA, 3);

      await openAndClosePopover(user);

      await setProps({ handle: Popover.createHandle(), nesting: 2 });
      await openAndClosePopover(user);

      await setProps({ handle: Popover.createHandle(), nesting: 1 });
      await openAndClosePopover(user);

      await setProps({ handle: Popover.createHandle(), nesting: 0 });
      await openAndClosePopover(user);
    });

    it('should reuse the popup and positioner DOM nodes when switching triggers', async () => {
      const testPopover = Popover.createHandle<number>();
      const { user } = await render(() => (
        <>
          <Popover.Trigger handle={testPopover} payload={1}>
            Trigger 1
          </Popover.Trigger>
          <Popover.Trigger handle={testPopover} payload={2}>
            Trigger 2
          </Popover.Trigger>

          <Popover.Root handle={testPopover}>
            {(arg: NumberPayload) => (
              <Popover.Portal>
                <Popover.Positioner data-testid="positioner">
                  <Popover.Popup data-testid="popup">
                    <span>{arg.payload}</span>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            )}
          </Popover.Root>
        </>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      await user.click(trigger1);
      const popupElement = screen.getByTestId('popup');
      const positionerElement = screen.getByTestId('positioner');

      await user.click(trigger2);
      expect(screen.getByTestId('popup')).toBe(popupElement);
      expect(screen.getByTestId('positioner')).toBe(positionerElement);
    });

    it('should allow controlling the popover state programmatically', async () => {
      const testPopover = Popover.createHandle<number>();
      function Test() {
        const [open, setOpen] = createSignal(false);
        const [activeTrigger, setActiveTrigger] = createSignal<string | null>(null);

        return (
          <div style={{ margin: '50px' }}>
            <Popover.Trigger handle={testPopover} payload={1} id="trigger-1">
              Trigger 1
            </Popover.Trigger>
            <Popover.Trigger handle={testPopover} payload={2} id="trigger-2">
              Trigger 2
            </Popover.Trigger>

            <Popover.Root
              open={open()}
              onOpenChange={(nextOpen, details) => {
                setActiveTrigger(details.trigger?.id ?? null);
                setOpen(nextOpen);
              }}
              triggerId={activeTrigger()}
              handle={testPopover}
            >
              {(arg: NumberPayload) => (
                <Popover.Portal>
                  <Popover.Positioner data-testid="positioner" side="bottom" align="start">
                    <Popover.Popup>
                      <span data-testid="content">{arg.payload}</span>
                      <Popover.Close data-testid="close" id="close-button">
                        Close
                      </Popover.Close>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              )}
            </Popover.Root>
            <span data-testid="active-trigger">{activeTrigger()}</span>

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
      await flushMicrotasks();
      expect(screen.getByTestId('content').textContent).toBe('1');

      await waitFor(() => {
        expect(
          Math.abs(
            screen.getByTestId('positioner').getBoundingClientRect().left -
              trigger1.getBoundingClientRect().left,
          ),
        ).toBeLessThanOrEqual(1);
      });

      await user.click(screen.getByRole('button', { name: 'Open Trigger 2' }));
      await flushMicrotasks();
      expect(screen.getByTestId('content').textContent).toBe('2');
      expect(screen.getByTestId('active-trigger').textContent).toBe('trigger-2');
      await waitFor(() => {
        expect(
          Math.abs(
            screen.getByTestId('positioner').getBoundingClientRect().left -
              trigger2.getBoundingClientRect().left,
          ),
        ).toBeLessThanOrEqual(1);
      });
      expect(trigger2.previousElementSibling).toHaveAttribute('data-base-ui-focus-guard');
      expect(trigger2.nextElementSibling).toHaveAttribute('data-base-ui-focus-guard');

      await user.click(screen.getByTestId('close'));
      await flushMicrotasks();
      expect(screen.queryByTestId('content')).toBe(null);
      expect(screen.getByTestId('active-trigger').textContent).toBe('trigger-2');
      expect(trigger2.previousElementSibling).not.toHaveAttribute('data-base-ui-focus-guard');
      expect(trigger2.nextElementSibling).not.toHaveAttribute('data-base-ui-focus-guard');
    });

    it('allows setting an initially open popover', async () => {
      const testPopover = Popover.createHandle<number>();
      await render(() => (
        <>
          <Popover.Trigger handle={testPopover} payload={1} id="trigger-1">
            Trigger 1
          </Popover.Trigger>
          <Popover.Trigger handle={testPopover} payload={2} id="trigger-2">
            Trigger 2
          </Popover.Trigger>

          <Popover.Root handle={testPopover} defaultOpen defaultTriggerId="trigger-2">
            {(arg: NumberPayload) => (
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup data-testid="popup">
                    <span>{arg.payload}</span>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            )}
          </Popover.Root>
        </>
      ));

      expect(screen.getByTestId('popup').textContent).toBe('2');
    });

    it('should not have inline scale style after switching triggers', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const testPopover = Popover.createHandle<number>();

      function Test() {
        return (
          <>
            <Popover.Trigger handle={testPopover} payload={1}>
              Trigger 1
            </Popover.Trigger>
            <Popover.Trigger handle={testPopover} payload={2}>
              Trigger 2
            </Popover.Trigger>

            <Popover.Root handle={testPopover}>
              {(arg: NumberPayload) => (
                <Popover.Portal>
                  <Popover.Positioner>
                    <Popover.Popup data-testid="popup">
                      <Popover.Viewport>
                        <span data-testid="content">{arg.payload}</span>
                      </Popover.Viewport>
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              )}
            </Popover.Root>
          </>
        );
      }

      const { user } = await render(() => <Test />);

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });

      // Open with Trigger 1
      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });

      // Switch to Trigger 2
      await user.click(trigger2);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('2');
      });

      // The popup should not have an inline scale style that would override CSS transitions
      const popup = screen.getByTestId('popup');
      expect(popup.style.scale).toBe('');
    });

    it('keeps positioning correct when conditional triggers unmount and the tree remounts', async () => {
      const testPopover = Popover.createHandle();

      // Port note: React's `<React.Fragment key={key}>` becomes a keyed `Show`.
      function Test() {
        const [key, setKey] = createSignal(1);
        const [showErrorDemo, setShowErrorDemo] = createSignal(true);

        return (
          <Show when={key()} keyed>
            {(_key) => (
              <>
                <button
                  onClick={() => {
                    setShowErrorDemo((prev) => !prev);
                    setKey((prev) => prev + 1);
                  }}
                >
                  Toggle
                </button>
                <div
                  style={{
                    display: 'flex',
                    'flex-direction': 'column',
                    'align-items': 'flex-start',
                    gap: '48px',
                    margin: '50px',
                  }}
                >
                  <Popover.Trigger handle={testPopover} id="trigger-0">
                    Trigger 0
                  </Popover.Trigger>
                  <Show when={showErrorDemo()}>
                    <Popover.Trigger handle={testPopover} id="trigger-1">
                      Trigger 1
                    </Popover.Trigger>
                  </Show>
                </div>

                <Popover.Root handle={testPopover} triggerId="trigger-0" open>
                  <Popover.Portal>
                    <Popover.Positioner data-testid="positioner" sideOffset={4} align="start">
                      <Popover.Popup>Content</Popover.Popup>
                    </Popover.Positioner>
                  </Popover.Portal>
                </Popover.Root>
              </>
            )}
          </Show>
        );
      }

      const { user } = await render(() => <Test />);

      const trigger0 = screen.getByRole('button', { name: 'Trigger 0' });
      await waitFor(() => {
        expect(
          Math.abs(
            screen.getByTestId('positioner').getBoundingClientRect().left -
              trigger0.getBoundingClientRect().left,
          ),
        ).toBeLessThanOrEqual(1);
      });

      await user.click(screen.getByRole('button', { name: 'Toggle' }));
      await flushMicrotasks();
      const trigger0After = screen.getByRole('button', { name: 'Trigger 0' });
      await waitFor(() => {
        expect(
          Math.abs(
            screen.getByTestId('positioner').getBoundingClientRect().left -
              trigger0After.getBoundingClientRect().left,
          ),
        ).toBeLessThanOrEqual(1);
      });
    });
  });

  describe.skipIf(isJSDOM)('imperative actions on the handle', () => {
    it('opens and closes the dialog', async () => {
      const popover = Popover.createHandle();
      await render(() => (
        <div>
          <Popover.Trigger handle={popover} id="trigger">
            Trigger
          </Popover.Trigger>
          <Popover.Root handle={popover}>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup data-testid="content">Content</Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      expect(screen.queryByRole('dialog')).toBe(null);

      popover.open('trigger');
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBe(null);
      });

      expect(screen.getByTestId('content').textContent).toBe('Content');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      popover.close();
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBe(null);
      });

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('sets the payload assosiated with the trigger', async () => {
      const popover = Popover.createHandle<number>();
      await render(() => (
        <div>
          <Popover.Trigger handle={popover} id="trigger1" payload={1}>
            Trigger 1
          </Popover.Trigger>
          <Popover.Trigger handle={popover} id="trigger2" payload={2}>
            Trigger 2
          </Popover.Trigger>
          <Popover.Root handle={popover}>
            {(arg: { payload: number | undefined }) => (
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup data-testid="content">{arg.payload}</Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            )}
          </Popover.Root>
        </div>
      ));

      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      expect(screen.queryByRole('dialog')).toBe(null);

      popover.open('trigger2');
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBe(null);
      });

      expect(screen.getByTestId('content').textContent).toBe('2');
      expect(trigger2).toHaveAttribute('aria-expanded', 'true');
      expect(trigger1).not.toHaveAttribute('aria-expanded', 'true');

      popover.close();
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBe(null);
      });

      expect(trigger2).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
