import { createSignal, For, Show, untrack } from 'solid-js';
import type { Accessor, Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { expect, vi, describe, it } from 'vitest';
import type { UserEvent } from '@testing-library/user-event';
import { isJSDOM } from '@base-ui-solid/utils/testUtils';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { act, fireEvent, flushMicrotasks, screen, waitFor } from './utils';
import type { createRenderer } from './createRenderer';

/**
 * Behavior shared by every popup that supports multiple triggers and detached triggers
 * (`handle` + `createHandle()`).
 *
 * Each multi-trigger scenario runs in two modes:
 * - `contained`: the triggers are children of the Root and no handle is involved, so they register
 *   through the Root's context.
 * - `detached`: the triggers are rendered outside the Root and connected to it with a handle, so they
 *   register through the handle's store.
 *
 * Handle-only behavior (imperative methods, root ownership, reparenting) runs in `detached` mode
 * only. The handle's store bookkeeping is unit tested in `popupHandle.test.ts`; the cases here are
 * the ones that depend on React rendering.
 *
 * Port notes:
 * - `fireEvent` doesn't flush Solid, so the hover helpers flush after dispatching.
 * - `setProps` and `React.useState` wrappers are signal writes. The fixture's props are read
 *   lazily, so changing `nesting` or `triggerCount` recreates the triggers (React remounts them when
 *   the wrapper structure changes) while a new `handle` is passed to the mounted parts.
 */
export function detachedTriggersConformanceTests(config: DetachedTriggersTestConfig) {
  const {
    render,
    createHandle,
    Root,
    Trigger,
    Portal,
    Positioner,
    Popup,
    Viewport,
    Close,
    triggerProps,
    openInteractions,
    ariaExpanded,
    throwOnMissingTrigger,
  } = config;

  const primaryInteraction = openInteractions[0];
  // Switching the active trigger must keep the popup mounted. Hover-opened popups close on
  // `mouseleave` before the next trigger is entered, so they switch with focus instead.
  const switchInteraction: OpenInteraction = openInteractions.includes('focus')
    ? 'focus'
    : primaryInteraction;

  function Fixture(props: FixtureProps) {
    // The mode, the viewport and the positioner props are fixed for a fixture.
    const detached = untrack(() => props.mode) === 'detached';
    const withViewport = untrack(() => props.withViewport) ?? false;
    // Port note: so are the trigger count and nesting, so a `setProps` call keeps the trigger
    // elements, like React reconciling them.
    const triggerCount = untrack(() => props.triggerCount) ?? 2;
    const nesting = untrack(() => props.nesting) ?? 0;

    const renderTriggers = () => {
      let triggers: JSX.Element = Array.from({ length: triggerCount }, (_, index) => {
        const number = index + 1;
        return (
          <Trigger
            {...triggerProps}
            {...props.triggerProps}
            handle={detached ? props.handle : undefined}
            id={`trigger-${number}`}
            data-testid={`trigger-${number}`}
            payload={number}
          >
            {`Trigger ${number}`}
          </Trigger>
        );
      });

      for (let level = 0; level < nesting; level += 1) {
        triggers = <div>{triggers}</div>;
      }

      return triggers;
    };

    // Port note: Solid creates JSX eagerly, so the parts are built in functions called from their
    // parent's children (React elements are rendered under their parent lazily).
    function renderPopup(payload: Accessor<unknown>) {
      const content = () => {
        const span = () => <span data-testid="content">{String(payload())}</span>;
        return withViewport && Viewport ? <Viewport>{span()}</Viewport> : span();
      };

      const popup = () => (
        <Popup data-testid="popup">
          {content()}
          {Close && <Close>Close popup</Close>}
        </Popup>
      );

      return (
        <Portal>
          {Positioner ? (
            <Positioner data-testid="positioner" {...props.positionerProps}>
              {popup()}
            </Positioner>
          ) : (
            popup()
          )}
        </Portal>
      );
    }

    // Port note: the Root's render function receives `payload` as an accessor.
    const root = () => (
      <Show when={props.rootMounted ?? true}>
        <Root handle={detached ? props.handle : undefined} {...props.rootProps}>
          {({ payload }: { payload: Accessor<unknown> }) => (
            <>
              {!detached && renderTriggers()}
              <span data-testid="root-payload">
                {payload() === undefined ? 'No payload' : String(payload())}
              </span>
              {renderPopup(payload)}
            </>
          )}
        </Root>
      </Show>
    );

    // Detached triggers are rendered next to the Root, before it unless `rootFirst` is set.
    const rootFirst = untrack(() => props.rootFirst) ?? false;

    return (
      <>
        {detached && !rootFirst && renderTriggers()}
        {root()}
        {detached && rootFirst && renderTriggers()}
      </>
    );
  }

  // Port note: counterpart of upstream's `render(<Fixture … />)`. `setProps` updates the props.
  function renderFixture(props: FixtureProps) {
    return render((overrides) => <Fixture {...props} {...overrides()} />);
  }

  function getTrigger(number: number) {
    return screen.getByTestId(`trigger-${number}`);
  }

  async function openWith(interaction: OpenInteraction, user: UserEvent, trigger: HTMLElement) {
    if (interaction === 'click') {
      await user.click(trigger);
    } else if (interaction === 'hover') {
      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);
      await flushMicrotasks();
    } else {
      await act(async () => trigger.focus());
    }
  }

  async function closeWith(interaction: OpenInteraction, user: UserEvent, trigger: HTMLElement) {
    if (interaction === 'click') {
      if (Close) {
        await user.click(screen.getByText('Close popup'));
      } else {
        await user.keyboard('{Escape}');
      }
    } else if (interaction === 'hover') {
      fireEvent.mouseLeave(trigger);
      await flushMicrotasks();
    } else {
      await act(async () => trigger.blur());
    }
  }

  async function switchTrigger(
    interaction: OpenInteraction,
    user: UserEvent,
    from: HTMLElement,
    to: HTMLElement,
  ) {
    if (interaction === 'hover') {
      fireEvent.mouseLeave(from);
      fireEvent.mouseEnter(to);
      fireEvent.mouseMove(to);
      await flushMicrotasks();
    } else {
      await openWith(interaction, user, to);
    }
  }

  async function waitForPopupOpen() {
    await waitFor(() => {
      expect(screen.getByTestId('popup')).toBeVisible();
    });
  }

  async function waitForPopupClosed() {
    await waitFor(() => {
      expect(screen.queryByTestId('popup')).toBe(null);
    });
  }

  async function waitForContent(text: string) {
    await waitFor(() => {
      expect(screen.getByTestId('content').textContent).toBe(text);
    });
  }

  /**
   * Asserts that only the trigger with the given number is marked as the popup's active trigger
   * (or that none is, when `activeNumber` is `null`).
   */
  function expectActiveTrigger(activeNumber: number | null, triggerCount = 2) {
    const popupId = activeNumber === null ? null : screen.getByTestId('popup').id;

    for (let number = 1; number <= triggerCount; number += 1) {
      const trigger = getTrigger(number);
      const active = number === activeNumber;

      if (active) {
        expect(trigger).toHaveAttribute('data-popup-open');
      } else {
        expect(trigger).not.toHaveAttribute('data-popup-open');
      }

      if (ariaExpanded) {
        expect(trigger).toHaveAttribute('aria-expanded', String(active));
        if (active) {
          expect(popupId).not.toBe('');
          expect(trigger).toHaveAttribute('aria-controls', popupId);
        } else if (popupId !== null) {
          expect(trigger).not.toHaveAttribute('aria-controls');
        }
      }
    }
  }

  function countWarnings(consoleWarn: { mock: { calls: unknown[][] } }, text: string) {
    return consoleWarn.mock.calls.filter(
      ([message]) => typeof message === 'string' && message.includes(text),
    ).length;
  }

  describe('detached triggers conformance', () => {
    describe.each([{ mode: 'contained' as const }, { mode: 'detached' as const }])(
      '$mode triggers',
      ({ mode }) => {
        // In `contained` mode the handle is never passed to the parts.
        const getHandle = () => (mode === 'detached' ? createHandle() : undefined);

        describe.skipIf(isJSDOM)('multiple triggers', () => {
          it.each(openInteractions.map((interaction) => ({ interaction })))(
            'opens with any trigger on $interaction and marks only that trigger as active',
            async ({ interaction }) => {
              const { user } = await renderFixture({
                mode,
                handle: getHandle(),
                triggerCount: 3,
              });

              expect(screen.queryByTestId('popup')).toBe(null);
              expectActiveTrigger(null, 3);

              for (const number of [1, 2, 3]) {
                const trigger = getTrigger(number);

                // eslint-disable-next-line no-await-in-loop
                await openWith(interaction, user, trigger);
                // eslint-disable-next-line no-await-in-loop
                await waitForPopupOpen();
                expectActiveTrigger(number, 3);

                // eslint-disable-next-line no-await-in-loop
                await closeWith(interaction, user, trigger);
                // eslint-disable-next-line no-await-in-loop
                await waitForPopupClosed();
                expectActiveTrigger(null, 3);
              }
            },
          );

          it('sets the payload of the active trigger and renders content based on it', async () => {
            const { user } = await renderFixture({ mode, handle: getHandle() });

            await openWith(primaryInteraction, user, getTrigger(1));
            await waitForContent('1');
            expect(screen.getByTestId('root-payload').textContent).toBe('1');

            await switchTrigger(primaryInteraction, user, getTrigger(1), getTrigger(2));
            await waitForContent('2');
            expect(screen.getByTestId('root-payload').textContent).toBe('2');
            expectActiveTrigger(2);
          });

          it('reuses the popup DOM nodes when switching triggers', async () => {
            const { user } = await renderFixture({ mode, handle: getHandle() });

            await openWith(switchInteraction, user, getTrigger(1));
            await waitForContent('1');
            const popupElement = screen.getByTestId('popup');
            const positionerElement = screen.queryByTestId('positioner');

            await switchTrigger(switchInteraction, user, getTrigger(1), getTrigger(2));
            await waitForContent('2');
            expect(screen.getByTestId('popup')).toBe(popupElement);
            expect(screen.queryByTestId('positioner')).toBe(positionerElement);
          });

          it('marks the trigger matching a controlled `triggerId` as active', async () => {
            await renderFixture({
              mode,
              handle: getHandle(),
              rootProps: { open: true, triggerId: 'trigger-2' },
            });

            await waitForPopupOpen();
            expect(screen.getByTestId('content').textContent).toBe('2');
            expectActiveTrigger(2);
          });

          it('opens initially with the payload of a non-first `defaultTriggerId`', async () => {
            await renderFixture({
              mode,
              handle: getHandle(),
              triggerCount: 3,
              rootProps: { defaultOpen: true, defaultTriggerId: 'trigger-2' },
            });

            await waitForContent('2');
            expectActiveTrigger(2, 3);
          });

          it('allows controlling the open state and active trigger programmatically', async () => {
            const handle = getHandle();

            function Controlled() {
              const [open, setOpen] = createSignal(false);
              const [triggerId, setTriggerId] = createSignal<string | null>(null);

              return (
                <div style={{ margin: '50px' }}>
                  <Fixture
                    mode={mode}
                    handle={handle}
                    rootProps={{
                      get open() {
                        return open();
                      },
                      get triggerId() {
                        return triggerId();
                      },
                      onOpenChange: (
                        nextOpen: boolean,
                        details: { trigger: Element | undefined },
                      ) => {
                        setTriggerId(details.trigger?.id ?? null);
                        setOpen(nextOpen);
                      },
                    }}
                    positionerProps={{ side: 'bottom', align: 'start' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(true);
                      setTriggerId('trigger-1');
                    }}
                  >
                    Open Trigger 1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(true);
                      setTriggerId('trigger-2');
                    }}
                  >
                    Open Trigger 2
                  </button>
                  <button type="button" onClick={() => setOpen(false)}>
                    Close externally
                  </button>
                </div>
              );
            }

            const { user } = await render(() => <Controlled />);

            // Queried up front: a modal popup hides the rest of the page from the accessibility tree.
            const openTrigger1 = screen.getByRole('button', { name: 'Open Trigger 1' });
            const openTrigger2 = screen.getByRole('button', { name: 'Open Trigger 2' });
            const closeExternally = screen.getByRole('button', { name: 'Close externally' });

            await user.click(openTrigger1);
            await waitForContent('1');
            expectActiveTrigger(1);
            await expectPositionerAlignedWith(getTrigger(1));

            await user.click(openTrigger2);
            await waitForContent('2');
            expectActiveTrigger(2);
            await expectPositionerAlignedWith(getTrigger(2));

            if (Close) {
              await user.click(screen.getByText('Close popup'));
              await waitForPopupClosed();
              // Focus returns to the element that opened the popup.
              await waitFor(() => {
                // eslint-disable-next-line vitest/no-conditional-expect -- only popups with a Close part can be closed from inside
                expect(openTrigger2).toHaveFocus();
              });
            } else {
              await user.click(closeExternally);
              await waitForPopupClosed();
            }
            expectActiveTrigger(null);
          });

          if (Viewport) {
            it('does not leave an inline scale style on the popup after switching triggers', async () => {
              globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

              try {
                const onOpenChange = vi.fn();
                const { user } = await renderFixture({
                  mode,
                  handle: getHandle(),
                  rootProps: { onOpenChange },
                  withViewport: true,
                });

                await openWith(switchInteraction, user, getTrigger(1));
                await waitForContent('1');

                await switchTrigger(switchInteraction, user, getTrigger(1), getTrigger(2));
                await waitForContent('2');

                // The trigger changed while the popup stayed open, rather than closing and reopening.
                expect(onOpenChange).toHaveBeenCalled();
                expect(onOpenChange.mock.calls.map(([open]) => open)).not.toContain(false);
                // An inline scale would override CSS transitions on the popup.
                expect(screen.getByTestId('popup').style.scale).toBe('');
              } finally {
                globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
              }
            });
          }
        });
      },
    );

    describe('detached triggers', () => {
      describe('imperative actions on the handle', () => {
        it('opens by trigger id with its payload and closes', async () => {
          const handle = createHandle();
          await renderFixture({ mode: 'detached', handle });

          expect(screen.queryByTestId('popup')).toBe(null);
          expect(handle.isOpen).toBe(false);

          await act(async () => handle.open('trigger-2'));
          await waitForContent('2');
          expect(handle.isOpen).toBe(true);
          expectActiveTrigger(2);

          await act(async () => handle.close());
          await waitForPopupClosed();
          expect(handle.isOpen).toBe(false);
          expectActiveTrigger(null);
        });

        if (throwOnMissingTrigger) {
          it('throws when opened with an unregistered trigger id', async () => {
            const handle = createHandle();
            await renderFixture({ mode: 'detached', handle });

            expect(() => handle.open('missing')).toThrow(
              'was called with the trigger id "missing", but no matching trigger is registered',
            );
            expect(handle.isOpen).toBe(false);
          });
        } else {
          it('opens unassociated with a warning when opened with an unregistered trigger id', async () => {
            const handle = createHandle();
            await renderFixture({ mode: 'detached', handle });

            const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            try {
              await act(async () => handle.open('missing'));
              expect(countWarnings(consoleWarn, 'No trigger found with id "missing"')).toBe(1);
            } finally {
              consoleWarn.mockRestore();
            }

            await waitForPopupOpen();
            expect(handle.isOpen).toBe(true);
            expectActiveTrigger(null);
          });
        }
      });

      describe('root ownership', () => {
        it('ignores imperative calls while no root is attached and follows the root across remounts', async () => {
          const handle = createHandle();
          const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

          try {
            handle.open('trigger-1');
            handle.close();
            expect(handle.isOpen).toBe(false);
            expect(countWarnings(consoleWarn, 'no root using this handle is mounted')).toBe(2);

            const { setProps } = await renderFixture({
              mode: 'detached',
              handle,
              rootMounted: true,
            });
            expect(screen.queryByTestId('popup')).toBe(null);
            expect(screen.getByTestId('root-payload').textContent).toBe('No payload');

            await act(async () => handle.open('trigger-1'));
            await waitForContent('1');
            expect(handle.isOpen).toBe(true);

            // Unmounting the root while open detaches it from the handle.
            await setProps({ rootMounted: false });
            expect(handle.isOpen).toBe(false);
            expect(screen.queryByTestId('popup')).toBe(null);

            consoleWarn.mockClear();
            handle.open('trigger-1');
            handle.close();
            expect(handle.isOpen).toBe(false);
            expect(countWarnings(consoleWarn, 'no root using this handle is mounted')).toBe(2);

            // A remounted root starts closed, without the previous payload, and is controllable.
            await setProps({ rootMounted: true });
            expect(screen.queryByTestId('popup')).toBe(null);
            expect(screen.getByTestId('root-payload').textContent).toBe('No payload');

            await act(async () => handle.open('trigger-2'));
            await waitForContent('2');
            expect(handle.isOpen).toBe(true);
          } finally {
            consoleWarn.mockRestore();
          }
        });

        it.skipIf(!openInteractions.includes('hover'))(
          'drops a hover open pending when the root mounts and opens on the next hover',
          async () => {
            const delay = 50;
            const { setProps } = await renderFixture({
              mode: 'detached',
              handle: createHandle(),
              rootMounted: false,
              triggerProps: { delay },
            });
            const trigger = getTrigger(1);

            fireEvent.mouseEnter(trigger);
            fireEvent.mouseMove(trigger);
            await setProps({ rootMounted: true });

            await act(async () => {
              await new Promise((resolve) => {
                setTimeout(resolve, delay * 2);
              });
            });
            expect(screen.queryByTestId('popup')).toBe(null);

            fireEvent.mouseLeave(trigger);
            fireEvent.mouseEnter(trigger);
            fireEvent.mouseMove(trigger);
            await waitForContent('1');
            expectActiveTrigger(1);
          },
        );

        it('registers a detached trigger declared after the root', async () => {
          const { user } = await renderFixture({
            mode: 'detached',
            handle: createHandle(),
            rootFirst: true,
          });

          await openWith(primaryInteraction, user, getTrigger(2));
          await waitForContent('2');
          expectActiveTrigger(2);
        });

        it('resolves a trigger still registered to the previous root during a transient overlap', async () => {
          const handle = createHandle();
          const openErrors: unknown[] = [];
          const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

          function OpenOnMount() {
            useIsoLayoutEffect(
              () => {
                try {
                  handle.open('trigger-2');
                } catch (error) {
                  openErrors.push(error);
                }
              },
              () => [],
            );
            return null;
          }

          // Port note: upstream remounts each Root with a `key`. Here each one is its own `Show`.
          function renderRoot(key: string) {
            return (
              <Root handle={handle}>
                <Portal>
                  {Positioner ? (
                    <Positioner>
                      <Popup>{key}</Popup>
                    </Positioner>
                  ) : (
                    <Popup>{key}</Popup>
                  )}
                </Portal>
              </Root>
            );
          }

          function App(props: { phase: 'outgoing' | 'overlap' | 'incoming' }) {
            return (
              <>
                <For each={[1, 2]}>
                  {(number) => (
                    <Trigger
                      {...triggerProps}
                      handle={handle}
                      id={`trigger-${number}`}
                      data-testid={`trigger-${number}`}
                    >
                      {`Trigger ${number}`}
                    </Trigger>
                  )}
                </For>
                <Show when={props.phase === 'outgoing' || props.phase === 'overlap'}>
                  {renderRoot('outgoing')}
                </Show>
                <Show when={props.phase === 'overlap' || props.phase === 'incoming'}>
                  {renderRoot('incoming')}
                  <OpenOnMount />
                </Show>
              </>
            );
          }

          try {
            // The detached trigger settles into the outgoing root's store (it is no longer in the
            // fallback map). The incoming root then attaches while the outgoing one is still
            // mounted, and a layout effect in that same commit opens by trigger id, before the
            // trigger has migrated to the incoming root's store.
            const { setProps } = await render((overrides) => (
              <App phase="outgoing" {...overrides()} />
            ));
            await setProps({ phase: 'overlap' });

            expect(openErrors).toEqual([]);
            expect(countWarnings(consoleWarn, 'No trigger found')).toBe(0);
            expect(handle.isOpen).toBe(true);
            expect(getTrigger(2)).toHaveAttribute('data-popup-open');
            expect(getTrigger(1)).not.toHaveAttribute('data-popup-open');

            // Completing the handoff (the outgoing root unmounts) keeps the popup open and
            // associated.
            await setProps({ phase: 'incoming' });
            expect(handle.isOpen).toBe(true);
            expect(getTrigger(2)).toHaveAttribute('data-popup-open');
            expect(getTrigger(1)).not.toHaveAttribute('data-popup-open');
          } finally {
            consoleWarn.mockRestore();
          }
        });
      });

      describe.skipIf(isJSDOM)('reparenting', () => {
        async function expectOpensAndCloses(user: UserEvent) {
          await openWith(primaryInteraction, user, getTrigger(1));
          await waitForPopupOpen();
          expectActiveTrigger(1, 1);
          await closeWith(primaryInteraction, user, getTrigger(1));
          await waitForPopupClosed();
        }

        it.each([
          { name: 'when wrappers are removed', nestings: [3, 2, 1, 0], recreateHandle: false },
          { name: 'when wrappers are added', nestings: [0, 1, 2, 3], recreateHandle: false },
          {
            name: 'during Fast Refresh-like handle recreation',
            nestings: [1, 1, 1],
            recreateHandle: true,
          },
          {
            name: 'when reparented during Fast Refresh-like handle recreation',
            nestings: [3, 2, 1, 0],
            recreateHandle: true,
          },
        ])('keeps a detached trigger working $name', async ({ nestings, recreateHandle }) => {
          const [initialNesting, ...nextNestings] = nestings;
          const { user, setProps } = await renderFixture({
            mode: 'detached',
            handle: createHandle(),
            triggerCount: 1,
            nesting: initialNesting,
          });

          await expectOpensAndCloses(user);

          for (const nesting of nextNestings) {
            // eslint-disable-next-line no-await-in-loop
            await setProps(recreateHandle ? { nesting, handle: createHandle() } : { nesting });
            // eslint-disable-next-line no-await-in-loop
            await expectOpensAndCloses(user);
          }
        });
      });
    });
  });

  async function expectPositionerAlignedWith(trigger: HTMLElement) {
    if (!Positioner) {
      return;
    }

    await waitFor(() => {
      expect(
        Math.abs(
          screen.getByTestId('positioner').getBoundingClientRect().left -
            trigger.getBoundingClientRect().left,
        ),
      ).toBeLessThanOrEqual(1);
    });
  }
}

type OpenInteraction = 'click' | 'hover' | 'focus';

// Parts of different components have unrelated prop types; the suite only passes props that every
// tested component accepts.
type AnyComponent = Component<any>;

export interface DetachedTriggersTestHandle {
  open(triggerId: string): void;
  close(): void;
  readonly isOpen: boolean;
}

export interface DetachedTriggersTestConfig {
  /**
   * Render function returned from `createRenderer`.
   */
  render: ReturnType<typeof createRenderer>['render'];
  /**
   * Creates a new handle for the tested component, e.g. `Popover.createHandle`.
   */
  createHandle: () => DetachedTriggersTestHandle;
  Root: AnyComponent;
  Trigger: AnyComponent;
  Portal: AnyComponent;
  /**
   * Omit for popups that are not anchored to their trigger.
   */
  Positioner?: AnyComponent;
  Popup: AnyComponent;
  /**
   * Enables the inline scale check after switching triggers.
   */
  Viewport?: AnyComponent;
  /**
   * When provided, click-opened popups are closed with it, and the programmatic test checks that
   * focus returns to the element that opened the popup.
   */
  Close?: AnyComponent;
  /**
   * Props applied to every trigger, e.g. `{ href: '#', delay: 0 }`.
   *
   * Port note: Solid props (kebab-case `style` keys, `class`).
   */
  triggerProps?: Record<string, unknown>;
  /**
   * Interactions that open the popup from a trigger. The first one is the primary interaction.
   */
  openInteractions: readonly [OpenInteraction, ...OpenInteraction[]];
  /**
   * Whether triggers expose `aria-expanded` and `aria-controls`.
   */
  ariaExpanded: boolean;
  /**
   * Whether `handle.open()` throws for an unregistered trigger id (anchored popups) instead of
   * opening unassociated with a warning (Dialog).
   */
  throwOnMissingTrigger: boolean;
}

interface FixtureProps {
  mode: 'contained' | 'detached';
  handle?: DetachedTriggersTestHandle | undefined;
  triggerCount?: number;
  /**
   * Port note: read lazily, so pass getters for values that change.
   */
  rootProps?: Record<string, unknown>;
  rootMounted?: boolean;
  /**
   * Renders the detached triggers after the Root.
   */
  rootFirst?: boolean;
  /**
   * Number of wrapper elements around the triggers.
   */
  nesting?: number;
  positionerProps?: Record<string, unknown>;
  withViewport?: boolean;
  /**
   * Props applied to every trigger, over the config's `triggerProps`.
   */
  triggerProps?: Record<string, unknown>;
}
