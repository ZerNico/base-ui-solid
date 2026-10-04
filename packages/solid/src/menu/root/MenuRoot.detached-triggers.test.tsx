import { createEffect, createSignal, untrack } from 'solid-js';

import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { expect, vi, describe, beforeEach, it } from 'vitest';
import {
  fireEvent,
  screen,
  waitFor,
  waitForPositioned,
  waitSingleFrame,
  isJSDOM,
  wait,
} from '#test-utils';
import { Menu } from 'base-ui-solid/menu';
import { PortFragment, createRenderer, ignoreActWarnings } from '../../../test/menuPortHelpers';
import { act } from '../../../test/utils';

describe('<MenuRoot />', () => {
  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });
  const { render, clock } = createRenderer();
  describe.skipIf(isJSDOM)('handle-backed root ownership', () => {
    type NumberPayload = {
      payload: number | undefined;
    };
    it('ignores imperative handle calls made before a root is attached', async () => {
      const handle = Menu.createHandle<number>();
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
      const { user } = await render(
        (testProps: any) => <PortFragment {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger handle={handle} id="trigger" payload={1}>
                  Trigger
                </Menu.Trigger>
                <Menu.Root handle={handle}>
                  {(componentProps1: NumberPayload) => (
                    <PortFragment>
                      <span data-testid="payload">{componentProps1.payload ?? 'No payload'}</span>
                      <Menu.Portal>
                        <Menu.Positioner>
                          <Menu.Popup>
                            <Menu.Item>Menu Content</Menu.Item>
                          </Menu.Popup>
                        </Menu.Positioner>
                      </Menu.Portal>
                    </PortFragment>
                  )}
                </Menu.Root>
              </>
            );
          },
        }),
      );
      expect(screen.queryByRole('menu')).toBe(null);
      expect(screen.getByTestId('payload').textContent).toBe('No payload');
      await user.click(screen.getByRole('button', { name: 'Trigger' }));
      await screen.findByRole('menu');
      expect(screen.getByTestId('payload').textContent).toBe('1');
    });
    it('ignores imperative handle calls made after the root is detached', async () => {
      const handle = Menu.createHandle<number>();
      function App() {
        const [mounted, setMounted] = createSignal(untrack(() => true));
        return (
          <PortFragment>
            <Menu.Trigger handle={handle} id="trigger" payload={1}>
              Trigger
            </Menu.Trigger>
            {!mounted() && (
              <button type="button" onClick={() => setMounted(true)}>
                Remount root
              </button>
            )}
            {mounted() && (
              <Menu.Root handle={handle}>
                {(componentProps2: NumberPayload) => (
                  <PortFragment>
                    <span data-testid="payload">{componentProps2.payload ?? 'No payload'}</span>
                    <Menu.Portal>
                      <Menu.Positioner>
                        <Menu.Popup>
                          <Menu.Item onClick={() => setMounted(false)}>Unmount root</Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </PortFragment>
                )}
              </Menu.Root>
            )}
          </PortFragment>
        );
      }
      const { user } = await render(
        (testProps: any) => <App {...testProps} />,
        () => ({}),
      );
      const trigger = screen.getByRole('button', { name: 'Trigger' });
      await user.click(trigger);
      await screen.findByRole('menu');
      expect(screen.getByTestId('payload').textContent).toBe('1');
      await user.click(screen.getByRole('menuitem', { name: 'Unmount root' }));
      expect(handle.isOpen).toBe(false);
      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBe(null);
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
      expect(screen.queryByRole('menu')).toBe(null);
      expect(screen.getByTestId('payload').textContent).toBe('No payload');
      await user.click(trigger);
      await screen.findByRole('menu');
      expect(screen.getByTestId('payload').textContent).toBe('1');
    });
    it('registers a detached trigger declared after the root', async () => {
      const handle = Menu.createHandle();
      const { user } = await render(
        (testProps: any) => <PortFragment {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Root handle={handle}>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup>
                        <Menu.Item>Menu Content</Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
                <Menu.Trigger handle={handle} id="trigger">
                  Trigger
                </Menu.Trigger>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button', { name: 'Trigger' });
      await user.click(trigger);
      await screen.findByRole('menu');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });
    it('throws when called with an unregistered trigger id', async () => {
      const handle = Menu.createHandle();
      await render(
        (testProps: any) => <PortFragment {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Root handle={handle}>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup>
                        <Menu.Item>Menu Content</Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
                <Menu.Trigger handle={handle} id="trigger">
                  Trigger
                </Menu.Trigger>
              </>
            );
          },
        }),
      );
      expect(() => handle.open('missing')).toThrow('was called with the trigger id "missing"');
      expect(handle.isOpen).toBe(false);
    });
    describe('multiple roots sharing one handle', () => {
      // Fake timers so the deferred overlap check only runs when ticked, after the handoff settles.
      clock.withFakeTimers();
      it('warns when a handle stays attached to more than one mounted root', async () => {
        const handle = Menu.createHandle();
        const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await render(
          (testProps: any) => <PortFragment {...testProps} />,
          () => ({
            get children() {
              return (
                <>
                  <Menu.Root handle={handle}>
                    <Menu.Portal>
                      <Menu.Positioner>
                        <Menu.Popup>
                          <Menu.Item>First</Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                  <Menu.Root handle={handle}>
                    <Menu.Portal>
                      <Menu.Positioner>
                        <Menu.Popup>
                          <Menu.Item>Second</Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                </>
              );
            },
          }),
        );
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
        const handle = Menu.createHandle();
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
        function App(componentProps3: { phase: 'outgoing' | 'overlap' | 'incoming' }) {
          return (
            <PortFragment>
              <Menu.Trigger handle={handle} id="trigger">
                Trigger
              </Menu.Trigger>
              {(componentProps3.phase === 'outgoing' || componentProps3.phase === 'overlap') && (
                <Menu.Root handle={handle}>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup>
                        <Menu.Item>Outgoing</Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              )}
              {(componentProps3.phase === 'overlap' || componentProps3.phase === 'incoming') && (
                <PortFragment>
                  <Menu.Root handle={handle}>
                    <Menu.Portal>
                      <Menu.Positioner>
                        <Menu.Popup>
                          <Menu.Item>Incoming</Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                  <OpenOnMount />
                </PortFragment>
              )}
            </PortFragment>
          );
        }
        // The detached trigger settles into the outgoing root's store (it is no longer in the
        // fallback map). The incoming root then attaches while the outgoing one is still mounted,
        // and a layout effect in that same commit opens by trigger id — before the trigger has
        // migrated to the incoming root's store.
        const { setProps } = await render(
          (testProps: any) => <App {...testProps} />,
          () => ({
            phase: 'outgoing',
          }),
        );
        await setProps({ phase: 'overlap' });
        expect(openErrors).toHaveLength(0);
        expect(handle.isOpen).toBe(true);
        expect(screen.getByRole('button', { name: 'Trigger' })).toHaveAttribute(
          'aria-expanded',
          'true',
        );
        // Completing the handoff (the outgoing root unmounts) keeps the popup open and associated.
        await setProps({ phase: 'incoming' });
        expect(handle.isOpen).toBe(true);
      });
    });
  });
  describe.skipIf(isJSDOM)('multiple triggers within Root', () => {
    type NumberPayload = {
      payload: number | undefined;
    };
    it('should open the menu with any trigger', async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger>Trigger 1</Menu.Trigger>
                <Menu.Trigger>Trigger 2</Menu.Trigger>
                <Menu.Trigger>Trigger 3</Menu.Trigger>

                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.Item>Close</Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });
      expect(screen.queryByRole('menu')).toBe(null);
      await user.click(trigger1);
      await screen.findByRole('menu');
      await user.click(await screen.findByRole('menuitem', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBe(null);
      });
      await user.click(trigger2);
      await screen.findByRole('menu');
      await user.click(await screen.findByRole('menuitem', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBe(null);
      });
      await user.click(trigger3);
      await screen.findByRole('menu');
      await user.click(await screen.findByRole('menuitem', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBe(null);
      });
    });
    it('should set the payload and render content based on its value', async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                {(componentProps4: NumberPayload) => (
                  <PortFragment>
                    <Menu.Trigger payload={1}>Trigger 1</Menu.Trigger>
                    <Menu.Trigger payload={2}>Trigger 2</Menu.Trigger>

                    <Menu.Portal>
                      <Menu.Positioner>
                        <Menu.Popup>
                          <Menu.Item data-testid="content">{componentProps4.payload}</Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </PortFragment>
                )}
              </>
            );
          },
        }),
      );
      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });
      await user.click(screen.getByTestId('content'));
      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBe(null);
      });
      await user.click(trigger2);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('2');
      });
    });
    it('should reuse the popup and positioner DOM nodes when switching triggers', async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                {(componentProps5: NumberPayload) => (
                  <PortFragment>
                    <Menu.Trigger payload={1}>Trigger 1</Menu.Trigger>
                    <Menu.Trigger payload={2}>Trigger 2</Menu.Trigger>

                    <Menu.Portal>
                      <Menu.Positioner data-testid="positioner">
                        <Menu.Popup data-testid="popup">
                          <span>{componentProps5.payload}</span>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </PortFragment>
                )}
              </>
            );
          },
        }),
      );
      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      await user.click(trigger1);
      await screen.findByRole('menu');
      const popupElement = screen.getByTestId('popup');
      const positionerElement = screen.getByTestId('positioner');
      await user.click(trigger2);
      await screen.findByRole('menu');
      expect(screen.getByTestId('popup')).toBe(popupElement);
      expect(screen.getByTestId('positioner')).toBe(positionerElement);
    });
    it('should allow controlling the menu state programmatically', async () => {
      function Test() {
        const [open, setOpen] = createSignal(untrack(() => false));
        const [activeTrigger, setActiveTrigger] = createSignal<string | null>(untrack(() => null));
        return (
          <div>
            <Menu.Root
              open={open()}
              triggerId={activeTrigger()}
              onOpenChange={(nextOpen, details) => {
                setActiveTrigger(details.trigger?.id ?? null);
                setOpen(nextOpen);
              }}
            >
              {(componentProps6: NumberPayload) => (
                <PortFragment>
                  <Menu.Trigger payload={1} id="trigger-1">
                    Trigger 1
                  </Menu.Trigger>
                  <Menu.Trigger payload={2} id="trigger-2">
                    Trigger 2
                  </Menu.Trigger>

                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup>
                        <Menu.Item data-testid="content">{componentProps6.payload}</Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </PortFragment>
              )}
            </Menu.Root>
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
      const { user } = await render(
        (testProps: any) => <Test {...testProps} />,
        () => ({}),
      );
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
    it('allows setting an initially open menu', async () => {
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          defaultOpen: true,
          defaultTriggerId: 'trigger-2',
          get children() {
            return (
              <>
                {(componentProps7: NumberPayload) => (
                  <PortFragment>
                    <Menu.Trigger payload={1} id="trigger-1">
                      Trigger 1
                    </Menu.Trigger>
                    <Menu.Trigger payload={2} id="trigger-2">
                      Trigger 2
                    </Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Positioner>
                        <Menu.Popup>
                          <Menu.Item data-testid="popup-content">
                            {componentProps7.payload}
                          </Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </PortFragment>
                )}
              </>
            );
          },
        }),
      );
      expect(screen.getByTestId('popup-content').textContent).toBe('2');
    });
    describe('nested menus', () => {
      it('supports keyboard navigation from any trigger', async () => {
        const { user } = await render(
          (testProps: any) => <Menu.Root {...testProps} />,
          () => ({
            get children() {
              return (
                <>
                  <Menu.Trigger>Trigger 1</Menu.Trigger>
                  <Menu.Trigger>Trigger 2</Menu.Trigger>

                  <Menu.Portal>
                    <Menu.Positioner data-testid="menu">
                      <Menu.Popup>
                        <Menu.Item>Standalone</Menu.Item>
                        <Menu.SubmenuRoot>
                          <Menu.SubmenuTrigger data-testid="submenu-trigger">
                            More
                          </Menu.SubmenuTrigger>
                          <Menu.Portal>
                            <Menu.Positioner data-testid="submenu">
                              <Menu.Popup>
                                <Menu.Item data-testid="submenu-item">Nested</Menu.Item>
                              </Menu.Popup>
                            </Menu.Positioner>
                          </Menu.Portal>
                        </Menu.SubmenuRoot>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </>
              );
            },
          }),
        );
        const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
        const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
        await user.click(trigger1);
        const focusedPopupmenu = await screen.findByTestId('menu');
        // Port note: Solid schedules opening focus after positioning.
        await waitFor(() =>
          expect(focusedPopupmenu).toContainElement(document.activeElement as HTMLElement),
        );
        await user.keyboard('[ArrowDown]');
        await user.keyboard('[ArrowDown]');
        const submenuTrigger = await screen.findByTestId('submenu-trigger');
        await waitFor(() => {
          expect(submenuTrigger).toHaveFocus();
        });
        await user.keyboard('[ArrowRight]');
        const submenuItem = await screen.findByTestId('submenu-item');
        await waitFor(() => {
          expect(submenuItem).toHaveFocus();
        });
        await user.keyboard('[ArrowLeft]');
        await waitFor(() => {
          expect(screen.queryByTestId('submenu')).toBe(null);
        });
        expect(submenuTrigger).toHaveFocus();
        await user.keyboard('[Escape]');
        await waitFor(() => {
          expect(screen.queryByTestId('menu')).toBe(null);
        });
        await user.click(trigger2);
        await screen.findByTestId('menu');
      });
      it('opens a submenu with the mouse when hover is disabled', async () => {
        const { user } = await render(
          (testProps: any) => <Menu.Root {...testProps} />,
          () => ({
            get children() {
              return (
                <>
                  <Menu.Trigger>Trigger 1</Menu.Trigger>
                  <Menu.Trigger>Trigger 2</Menu.Trigger>

                  <Menu.Portal>
                    <Menu.Positioner data-testid="menu">
                      <Menu.Popup>
                        <Menu.Item>Standalone</Menu.Item>
                        <Menu.SubmenuRoot>
                          <Menu.SubmenuTrigger data-testid="submenu-trigger" openOnHover={false}>
                            More
                          </Menu.SubmenuTrigger>
                          <Menu.Portal>
                            <Menu.Positioner data-testid="submenu">
                              <Menu.Popup>
                                <Menu.Item data-testid="submenu-item">Nested</Menu.Item>
                              </Menu.Popup>
                            </Menu.Positioner>
                          </Menu.Portal>
                        </Menu.SubmenuRoot>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </>
              );
            },
          }),
        );
        const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
        const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
        await user.click(trigger1);
        await screen.findByTestId('menu');
        expect(screen.queryByTestId('submenu')).toBe(null);
        const submenuTrigger = screen.getByTestId('submenu-trigger');
        await user.click(submenuTrigger);
        const submenuItem = await screen.findByTestId('submenu-item');
        expect(submenuItem.textContent).toBe('Nested');
        await user.click(submenuItem);
        await waitFor(() => {
          expect(screen.queryByTestId('menu')).toBe(null);
        });
        await user.click(trigger2);
        await screen.findByTestId('menu');
        expect(screen.queryByTestId('submenu')).toBe(null);
      });
      it('closes every level when clicking outside the deepest submenu', async () => {
        const { user } = await render(
          (testProps: any) => <div {...testProps} />,
          () => ({
            get children() {
              return (
                <>
                  <Menu.Root>
                    <Menu.Trigger>Trigger 1</Menu.Trigger>
                    <Menu.Trigger>Trigger 2</Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Positioner data-testid="level-1">
                        <Menu.Popup>
                          <Menu.Item>Item 1</Menu.Item>
                          <Menu.SubmenuRoot>
                            <Menu.SubmenuTrigger data-testid="submenu-trigger-1">
                              Level 2
                            </Menu.SubmenuTrigger>
                            <Menu.Portal>
                              <Menu.Positioner data-testid="level-2">
                                <Menu.Popup>
                                  <Menu.Item>Item 2</Menu.Item>
                                  <Menu.SubmenuRoot>
                                    <Menu.SubmenuTrigger data-testid="submenu-trigger-2">
                                      Level 3
                                    </Menu.SubmenuTrigger>
                                    <Menu.Portal>
                                      <Menu.Positioner data-testid="level-3">
                                        <Menu.Popup>
                                          <Menu.Item>Deep Item</Menu.Item>
                                        </Menu.Popup>
                                      </Menu.Positioner>
                                    </Menu.Portal>
                                  </Menu.SubmenuRoot>
                                </Menu.Popup>
                              </Menu.Positioner>
                            </Menu.Portal>
                          </Menu.SubmenuRoot>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                  <button data-testid="outside">Outside</button>
                </>
              );
            },
          }),
        );
        const trigger = screen.getByRole('button', { name: 'Trigger 1' });
        await user.click(trigger);
        const focusedPopuplevel1 = await screen.findByTestId('level-1');
        // Port note: Solid schedules opening focus after positioning.
        await waitFor(() =>
          expect(focusedPopuplevel1).toContainElement(document.activeElement as HTMLElement),
        );
        await user.keyboard('[ArrowDown]');
        await user.keyboard('[ArrowDown]');
        const submenuTrigger1 = await screen.findByTestId('submenu-trigger-1');
        await waitFor(() => {
          expect(submenuTrigger1).toHaveFocus();
        });
        await user.keyboard('[ArrowRight]');
        const focusedPopuplevel2 = await screen.findByTestId('level-2');
        // Port note: Solid schedules opening focus after positioning.
        await waitFor(() =>
          expect(focusedPopuplevel2).toContainElement(document.activeElement as HTMLElement),
        );
        await user.keyboard('[ArrowDown]');
        const submenuTrigger2 = await screen.findByTestId('submenu-trigger-2');
        await waitFor(() => {
          expect(submenuTrigger2).toHaveFocus();
        });
        await user.keyboard('[ArrowRight]');
        await screen.findByTestId('level-3');
        await user.click(screen.getByTestId('outside'));
        await waitFor(() => {
          expect(screen.queryByTestId('level-1')).toBe(null);
          expect(screen.queryByTestId('level-2')).toBe(null);
          expect(screen.queryByTestId('level-3')).toBe(null);
        });
      });
      it('allows selecting nested items via click, drag, release', async () => {
        ignoreActWarnings();
        const clickSpy = vi.fn();
        const { user } = await render(
          (testProps: any) => <Menu.Root {...testProps} />,
          () => ({
            get children() {
              return (
                <>
                  <Menu.Trigger>Trigger 1</Menu.Trigger>
                  <Menu.Trigger>Trigger 2</Menu.Trigger>

                  <Menu.Portal>
                    <Menu.Positioner data-testid="menu">
                      <Menu.Popup>
                        <Menu.Item>Item 1</Menu.Item>
                        <Menu.SubmenuRoot>
                          <Menu.SubmenuTrigger data-testid="submenu-trigger">
                            More
                          </Menu.SubmenuTrigger>
                          <Menu.Portal>
                            <Menu.Positioner data-testid="submenu">
                              <Menu.Popup>
                                <Menu.Item data-testid="submenu-item" onClick={clickSpy}>
                                  Nested Action
                                </Menu.Item>
                              </Menu.Popup>
                            </Menu.Positioner>
                          </Menu.Portal>
                        </Menu.SubmenuRoot>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </>
              );
            },
          }),
        );
        const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
        fireEvent.mouseDown(trigger1);
        await screen.findByTestId('menu');
        const submenuTrigger = await screen.findByTestId('submenu-trigger');
        await user.hover(submenuTrigger);
        await screen.findByTestId('submenu');
        // Wait 200ms to enable mouseup on menu items
        await wait(200);
        const submenuItem = await screen.findByTestId('submenu-item');
        fireEvent.mouseUp(submenuItem);
        await waitFor(() => {
          expect(screen.queryByTestId('menu')).toBe(null);
        });
        expect(clickSpy.mock.calls.length).toBe(1);
        const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
        await user.click(trigger2);
        await screen.findByTestId('menu');
      });
    });
  });
  describe.skipIf(isJSDOM)('multiple detached triggers', () => {
    type NumberPayload = {
      payload: number | undefined;
    };
    /**
     * Mirrors the Popover detached-trigger hover fixture: two detached hover
     * triggers with a real position transition on the positioner and a real exit
     * transition on the popup, handed off from trigger 1 to trigger 2 so
     * `instantType` is `trigger-change`.
     */
    async function renderHoverDetachedTriggers(
      componentProps8: {
        /**
         * Set to `false` to return while the positioner is still animating to the
         * new trigger, so the delayed `trigger-change` restoration is still pending.
         */
        settleTriggerChange?: boolean;
      } = {},
    ) {
      // Port note: keep the pending-switch fixture's animations alive until explicitly finished,
      // preserving the upstream overlap assertion even when the browser runner is busy.
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
      const testMenu = Menu.createHandle<number>();
      const instantsWhileEnding: (string | undefined)[] = [];
      const utils = await render(
        (testProps: any) => <div {...testProps} />,
        () => ({
          style: { position: 'relative', width: 400, height: 200 },
          get children() {
            return (
              <>
                <style>
                  {`
              .positioner {
                transition:
                  top ${componentProps8.settleTriggerChange === false ? 10000 : 120}ms linear,
                  left ${componentProps8.settleTriggerChange === false ? 10000 : 120}ms linear,
                  transform ${componentProps8.settleTriggerChange === false ? 10000 : 120}ms linear;
              }

              .popup {
                opacity: 1;
                transition: opacity ${componentProps8.settleTriggerChange === false ? 20000 : 250}ms linear;
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

                <Menu.Trigger
                  handle={testMenu}
                  payload={1}
                  openOnHover
                  delay={0}
                  style={{ position: 'absolute', top: '20px', left: '20px' }}
                >
                  Trigger 1
                </Menu.Trigger>
                <Menu.Trigger
                  handle={testMenu}
                  payload={2}
                  openOnHover
                  delay={0}
                  style={{ position: 'absolute', top: '20px', left: '220px' }}
                >
                  Trigger 2
                </Menu.Trigger>

                <Menu.Root handle={testMenu}>
                  {(componentProps9: NumberPayload) => (
                    <Menu.Portal>
                      <Menu.Positioner data-testid="positioner" class="positioner">
                        <Menu.Popup
                          data-testid="popup"
                          class="popup"
                          render={(props, state) => {
                            // Port note: Solid renders once; observe reactive transition state.
                            createEffect(
                              () => [state.transitionStatus, state.instant] as const,
                              ([status, instant]) => {
                                if (status === 'ending') {
                                  instantsWhileEnding.push(instant);
                                }
                              },
                            );
                            return <div {...props} />;
                          }}
                        >
                          <Menu.Item data-testid="content">{componentProps9.payload}</Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  )}
                </Menu.Root>
              </>
            );
          },
        }),
      );
      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      await utils.user.hover(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });
      // Port note: commit the first measured position before starting its CSS handoff.
      await waitForPositioned(screen.getByTestId('positioner'));
      await waitSingleFrame();
      await utils.user.hover(trigger2);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('2');
      });
      if (componentProps8.settleTriggerChange ?? true) {
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
        const [open, setOpen] = createSignal(untrack(() => false));
        const [activeTrigger, setActiveTrigger] = createSignal<string | null>(untrack(() => null));
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

            <Menu.Root
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
              <Menu.Trigger
                id="trigger-1"
                openOnHover
                delay={0}
                style={{ position: 'absolute', top: '20px', left: '20px' }}
              >
                Trigger 1
              </Menu.Trigger>
              <Menu.Trigger
                id="trigger-2"
                openOnHover
                delay={0}
                style={{ position: 'absolute', top: '20px', left: '220px' }}
              >
                Trigger 2
              </Menu.Trigger>

              <Menu.Portal>
                <Menu.Positioner data-testid="positioner" class="positioner">
                  <Menu.Popup
                    data-testid="popup"
                    class="popup"
                    render={(props, state) => {
                      // Port note: Solid calls render once; observe each reactive state update.
                      createEffect(
                        () => [state.transitionStatus, state.instant] as const,
                        ([status, instant]) => {
                          if (status === 'ending') {
                            instantsWhileEnding.push(instant);
                          } else if (closeRequested) {
                            instantsWhileClosePending.push(instant);
                          }
                        },
                      );
                      return <div {...props} />;
                    }}
                  >
                    <Menu.Item>Item</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>
        );
      }
      const { user } = await render(
        (testProps: any) => <Test {...testProps} />,
        () => ({}),
      );
      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      await user.hover(trigger1);
      await waitFor(() => {
        expect(screen.queryByTestId('popup')).not.toBe(null);
      });
      // Let the first open settle so moving to trigger 2 is a real switch.
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 100);
        });
      });
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
      await act(async () => {
        // Port note: complete the measured handoff while leaving the exit transition active.
        switchAnimations.forEach((animation) => animation.finish());
        await Promise.all(switchAnimations.map((animation) => animation.finished));
      });
      // Still mid-exit: the stale callback must not have marked it instant and
      // collapsed the transition.
      expect(screen.getByTestId('popup')).toBe(popup);
      expect(popup).toHaveAttribute('data-ending-style');
      expect(popup).not.toHaveAttribute('data-instant');
    });
    it('should open the menu with any trigger', async () => {
      const testMenu = Menu.createHandle();
      const { user } = await render(
        (testProps: any) => <div {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger handle={testMenu}>Trigger 1</Menu.Trigger>
                <Menu.Trigger handle={testMenu}>Trigger 2</Menu.Trigger>
                <Menu.Trigger handle={testMenu}>Trigger 3</Menu.Trigger>

                <Menu.Root handle={testMenu}>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup>
                        <Menu.Item>Close</Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </>
            );
          },
        }),
      );
      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      const trigger3 = screen.getByRole('button', { name: 'Trigger 3' });
      expect(screen.queryByRole('menu')).toBe(null);
      await user.click(trigger1);
      await screen.findByRole('menu');
      await user.click(await screen.findByRole('menuitem', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBe(null);
      });
      await user.click(trigger2);
      await screen.findByRole('menu');
      await user.click(await screen.findByRole('menuitem', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBe(null);
      });
      await user.click(trigger3);
      await screen.findByRole('menu');
      await user.click(await screen.findByRole('menuitem', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBe(null);
      });
    });
    it('should set the payload and render content based on its value', async () => {
      const testMenu = Menu.createHandle<number>();
      const { user } = await render(
        (testProps: any) => <div {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger handle={testMenu} payload={1}>
                  Trigger 1
                </Menu.Trigger>
                <Menu.Trigger handle={testMenu} payload={2}>
                  Trigger 2
                </Menu.Trigger>

                <Menu.Root handle={testMenu}>
                  {(componentProps10: NumberPayload) => (
                    <Menu.Portal>
                      <Menu.Positioner>
                        <Menu.Popup>
                          <Menu.Item data-testid="content">{componentProps10.payload}</Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  )}
                </Menu.Root>
              </>
            );
          },
        }),
      );
      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });
      await user.click(screen.getByTestId('content'));
      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBe(null);
      });
      await user.click(trigger2);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('2');
      });
    });
    it('should reuse the popup and positioner DOM nodes when switching triggers', async () => {
      const testMenu = Menu.createHandle<number>();
      const { user } = await render(
        (testProps: any) => <PortFragment {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger handle={testMenu} payload={1}>
                  Trigger 1
                </Menu.Trigger>
                <Menu.Trigger handle={testMenu} payload={2}>
                  Trigger 2
                </Menu.Trigger>

                <Menu.Root handle={testMenu}>
                  {(componentProps11: NumberPayload) => (
                    <Menu.Portal>
                      <Menu.Positioner data-testid="positioner">
                        <Menu.Popup data-testid="popup">
                          <span>{componentProps11.payload}</span>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  )}
                </Menu.Root>
              </>
            );
          },
        }),
      );
      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      await user.click(trigger1);
      await screen.findByRole('menu');
      const popupElement = screen.getByTestId('popup');
      const positionerElement = screen.getByTestId('positioner');
      await user.click(trigger2);
      await screen.findByRole('menu');
      expect(screen.getByTestId('popup')).toBe(popupElement);
      expect(screen.getByTestId('positioner')).toBe(positionerElement);
    });
    it('should allow controlling the menu state programmatically', async () => {
      const testMenu = Menu.createHandle<number>();
      function Test() {
        const [open, setOpen] = createSignal(untrack(() => false));
        const [activeTrigger, setActiveTrigger] = createSignal<string | null>(untrack(() => null));
        return (
          <div style={{ margin: '50px' }}>
            <Menu.Trigger handle={testMenu} payload={1} id="trigger-1">
              Trigger 1
            </Menu.Trigger>
            <Menu.Trigger handle={testMenu} payload={2} id="trigger-2">
              Trigger 2
            </Menu.Trigger>

            <Menu.Root
              open={open()}
              onOpenChange={(nextOpen, details) => {
                setActiveTrigger(details.trigger?.id ?? null);
                setOpen(nextOpen);
              }}
              triggerId={activeTrigger()}
              handle={testMenu}
            >
              {(componentProps12: NumberPayload) => (
                <Menu.Portal>
                  <Menu.Positioner data-testid="positioner" side="bottom" align="start">
                    <Menu.Popup>
                      <Menu.Item data-testid="content">{componentProps12.payload}</Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              )}
            </Menu.Root>

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
      const { user } = await render(
        (testProps: any) => <Test {...testProps} />,
        () => ({}),
      );
      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      await user.click(screen.getByRole('button', { name: 'Open Trigger 1' }));
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });
      await waitFor(() => {
        const positionerLeft = screen.getByTestId('positioner').getBoundingClientRect().left;
        expect(
          Math.abs(positionerLeft - trigger1.getBoundingClientRect().left),
        ).toBeLessThanOrEqual(1);
      });
      await user.click(screen.getByRole('button', { name: 'Open Trigger 2' }));
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('2');
      });
      await waitFor(() => {
        const positionerLeft = screen.getByTestId('positioner').getBoundingClientRect().left;
        expect(
          Math.abs(positionerLeft - trigger2.getBoundingClientRect().left),
        ).toBeLessThanOrEqual(1);
      });
      await user.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByTestId('content')).toBe(null);
      });
    });
    it('allows setting an initially open menu', async () => {
      const testMenu = Menu.createHandle<number>();
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          handle: testMenu,
          defaultOpen: true,
          defaultTriggerId: 'trigger-2',
          get children() {
            return (
              <>
                {(componentProps13: NumberPayload) => (
                  <PortFragment>
                    <Menu.Trigger handle={testMenu} payload={1} id="trigger-1">
                      Trigger 1
                    </Menu.Trigger>
                    <Menu.Trigger handle={testMenu} payload={2} id="trigger-2">
                      Trigger 2
                    </Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Positioner>
                        <Menu.Popup>
                          <Menu.Item data-testid="popup-content">
                            {componentProps13.payload}
                          </Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </PortFragment>
                )}
              </>
            );
          },
        }),
      );
      expect(screen.getByTestId('popup-content').textContent).toBe('2');
    });
    it('should not have inline scale style after switching triggers', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
      const testMenu = Menu.createHandle<number>();
      function Test() {
        return (
          <PortFragment>
            <Menu.Trigger handle={testMenu} payload={1}>
              Trigger 1
            </Menu.Trigger>
            <Menu.Trigger handle={testMenu} payload={2}>
              Trigger 2
            </Menu.Trigger>

            <Menu.Root handle={testMenu}>
              {(componentProps14: NumberPayload) => (
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup data-testid="popup">
                      <Menu.Viewport>
                        <Menu.Item data-testid="content">{componentProps14.payload}</Menu.Item>
                      </Menu.Viewport>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              )}
            </Menu.Root>
          </PortFragment>
        );
      }
      const { user } = await render(
        (testProps: any) => <Test {...testProps} />,
        () => ({}),
      );
      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      await user.click(trigger1);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('1');
      });
      await user.click(trigger2);
      await waitFor(() => {
        expect(screen.getByTestId('content').textContent).toBe('2');
      });
      const popup = screen.getByTestId('popup');
      expect(popup.style.scale).toBe('');
    });
    describe('nested menus', () => {
      it('supports keyboard navigation regardless of which trigger opened the menu', async () => {
        const testMenu = Menu.createHandle();
        const { user } = await render(
          (testProps: any) => <div {...testProps} />,
          () => ({
            get children() {
              return (
                <>
                  <Menu.Trigger handle={testMenu}>Trigger 1</Menu.Trigger>
                  <Menu.Trigger handle={testMenu}>Trigger 2</Menu.Trigger>

                  <Menu.Root handle={testMenu}>
                    <Menu.Portal>
                      <Menu.Positioner data-testid="menu">
                        <Menu.Popup>
                          <Menu.Item>Standalone</Menu.Item>
                          <Menu.SubmenuRoot>
                            <Menu.SubmenuTrigger data-testid="submenu-trigger">
                              More
                            </Menu.SubmenuTrigger>
                            <Menu.Portal>
                              <Menu.Positioner data-testid="submenu">
                                <Menu.Popup>
                                  <Menu.Item data-testid="submenu-item">Nested</Menu.Item>
                                </Menu.Popup>
                              </Menu.Positioner>
                            </Menu.Portal>
                          </Menu.SubmenuRoot>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                </>
              );
            },
          }),
        );
        const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
        const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
        await user.click(trigger1);
        const focusedPopupmenu = await screen.findByTestId('menu');
        // Port note: Solid schedules opening focus after positioning.
        await waitFor(() =>
          expect(focusedPopupmenu).toContainElement(document.activeElement as HTMLElement),
        );
        await user.keyboard('[ArrowDown]');
        await user.keyboard('[ArrowDown]');
        const submenuTrigger = await screen.findByTestId('submenu-trigger');
        await waitFor(() => {
          expect(submenuTrigger).toHaveFocus();
        });
        await user.keyboard('[ArrowRight]');
        const submenuItem = await screen.findByTestId('submenu-item');
        await waitFor(() => expect(submenuItem).toHaveFocus());
        await user.keyboard('[ArrowLeft]');
        await waitFor(() => {
          expect(screen.queryByTestId('submenu')).toBe(null);
        });
        expect(submenuTrigger).toHaveFocus();
        await user.keyboard('[Escape]');
        await waitFor(() => {
          expect(screen.queryByTestId('menu')).toBe(null);
        });
        await user.click(trigger2);
        await screen.findByTestId('menu');
      });
      it('opens submenus on click when hover is disabled', async () => {
        const testMenu = Menu.createHandle();
        const { user } = await render(
          (testProps: any) => <div {...testProps} />,
          () => ({
            get children() {
              return (
                <>
                  <Menu.Trigger handle={testMenu}>Trigger 1</Menu.Trigger>
                  <Menu.Trigger handle={testMenu}>Trigger 2</Menu.Trigger>

                  <Menu.Root handle={testMenu}>
                    <Menu.Portal>
                      <Menu.Positioner data-testid="menu">
                        <Menu.Popup>
                          <Menu.Item>Standalone</Menu.Item>
                          <Menu.SubmenuRoot>
                            <Menu.SubmenuTrigger data-testid="submenu-trigger" openOnHover={false}>
                              More
                            </Menu.SubmenuTrigger>
                            <Menu.Portal>
                              <Menu.Positioner data-testid="submenu">
                                <Menu.Popup>
                                  <Menu.Item data-testid="submenu-item">Nested</Menu.Item>
                                </Menu.Popup>
                              </Menu.Positioner>
                            </Menu.Portal>
                          </Menu.SubmenuRoot>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                </>
              );
            },
          }),
        );
        const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
        const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
        await user.click(trigger1);
        await screen.findByTestId('menu');
        expect(screen.queryByTestId('submenu')).toBe(null);
        const submenuTrigger = screen.getByTestId('submenu-trigger');
        await user.click(submenuTrigger);
        const submenuItem = await screen.findByTestId('submenu-item');
        expect(submenuItem.textContent).toBe('Nested');
        await user.click(submenuItem);
        await waitFor(() => {
          expect(screen.queryByTestId('menu')).toBe(null);
        });
        await user.click(trigger2);
        await screen.findByTestId('menu');
        expect(screen.queryByTestId('submenu')).toBe(null);
      });
      it('closes the nested tree on outside click', async () => {
        const testMenu = Menu.createHandle();
        const { user } = await render(
          (testProps: any) => <div {...testProps} />,
          () => ({
            get children() {
              return (
                <>
                  <Menu.Trigger handle={testMenu}>Trigger 1</Menu.Trigger>
                  <Menu.Trigger handle={testMenu}>Trigger 2</Menu.Trigger>

                  <Menu.Root handle={testMenu}>
                    <Menu.Portal>
                      <Menu.Positioner data-testid="level-1">
                        <Menu.Popup>
                          <Menu.Item>Item 1</Menu.Item>
                          <Menu.SubmenuRoot>
                            <Menu.SubmenuTrigger data-testid="submenu-trigger-1">
                              Level 2
                            </Menu.SubmenuTrigger>
                            <Menu.Portal>
                              <Menu.Positioner data-testid="level-2">
                                <Menu.Popup>
                                  <Menu.Item>Item 2</Menu.Item>
                                  <Menu.SubmenuRoot>
                                    <Menu.SubmenuTrigger data-testid="submenu-trigger-2">
                                      Level 3
                                    </Menu.SubmenuTrigger>
                                    <Menu.Portal>
                                      <Menu.Positioner data-testid="level-3">
                                        <Menu.Popup>
                                          <Menu.Item>Deep Item</Menu.Item>
                                        </Menu.Popup>
                                      </Menu.Positioner>
                                    </Menu.Portal>
                                  </Menu.SubmenuRoot>
                                </Menu.Popup>
                              </Menu.Positioner>
                            </Menu.Portal>
                          </Menu.SubmenuRoot>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                  <button data-testid="outside">Outside</button>
                </>
              );
            },
          }),
        );
        const trigger = screen.getByRole('button', { name: 'Trigger 1' });
        await user.click(trigger);
        const focusedPopuplevel1 = await screen.findByTestId('level-1');
        // Port note: Solid schedules opening focus after positioning.
        await waitFor(() =>
          expect(focusedPopuplevel1).toContainElement(document.activeElement as HTMLElement),
        );
        await user.keyboard('[ArrowDown]');
        await user.keyboard('[ArrowDown]');
        const submenuTrigger1 = await screen.findByTestId('submenu-trigger-1');
        await waitFor(() => expect(submenuTrigger1).toHaveFocus());
        await user.keyboard('[ArrowRight]');
        const focusedPopuplevel2 = await screen.findByTestId('level-2');
        // Port note: Solid schedules opening focus after positioning.
        await waitFor(() =>
          expect(focusedPopuplevel2).toContainElement(document.activeElement as HTMLElement),
        );
        await user.keyboard('[ArrowDown]');
        const submenuTrigger2 = await screen.findByTestId('submenu-trigger-2');
        await waitFor(() => expect(submenuTrigger2).toHaveFocus());
        await user.keyboard('[ArrowRight]');
        await screen.findByTestId('level-3');
        await user.click(screen.getByTestId('outside'));
        await waitFor(() => {
          expect(screen.queryByTestId('level-1')).toBe(null);
          expect(screen.queryByTestId('level-2')).toBe(null);
          expect(screen.queryByTestId('level-3')).toBe(null);
        });
      });
      it('selects nested items with click, drag, release', async () => {
        ignoreActWarnings();
        const testMenu = Menu.createHandle();
        const clickSpy = vi.fn();
        const { user } = await render(
          (testProps: any) => <div {...testProps} />,
          () => ({
            get children() {
              return (
                <>
                  <Menu.Trigger handle={testMenu}>Trigger 1</Menu.Trigger>
                  <Menu.Trigger handle={testMenu}>Trigger 2</Menu.Trigger>

                  <Menu.Root handle={testMenu}>
                    <Menu.Portal>
                      <Menu.Positioner data-testid="menu">
                        <Menu.Popup>
                          <Menu.Item>Item 1</Menu.Item>
                          <Menu.SubmenuRoot>
                            <Menu.SubmenuTrigger data-testid="submenu-trigger">
                              More
                            </Menu.SubmenuTrigger>
                            <Menu.Portal>
                              <Menu.Positioner data-testid="submenu">
                                <Menu.Popup>
                                  <Menu.Item data-testid="submenu-item" onClick={clickSpy}>
                                    Nested Action
                                  </Menu.Item>
                                </Menu.Popup>
                              </Menu.Positioner>
                            </Menu.Portal>
                          </Menu.SubmenuRoot>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                </>
              );
            },
          }),
        );
        const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
        fireEvent.mouseDown(trigger1);
        await screen.findByTestId('menu');
        const submenuTrigger = await screen.findByTestId('submenu-trigger');
        await user.hover(submenuTrigger);
        await screen.findByTestId('submenu');
        // Wait 200ms to enable mouseup on menu items
        await wait(200);
        const submenuItem = await screen.findByTestId('submenu-item');
        fireEvent.mouseUp(submenuItem);
        await waitFor(() => {
          expect(screen.queryByTestId('menu')).toBe(null);
        });
        expect(clickSpy.mock.calls.length).toBe(1);
        const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
        await user.click(trigger2);
        await screen.findByTestId('menu');
      });
    });
  });
  describe.skipIf(isJSDOM)('imperative actions on the handle', () => {
    type NumberPayload = {
      payload: number | undefined;
    };
    it('opens and closes the menu', async () => {
      const menuHandle = Menu.createHandle();
      await render(
        (testProps: any) => <div {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger handle={menuHandle} id="trigger">
                  Trigger
                </Menu.Trigger>
                <Menu.Root handle={menuHandle}>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup data-testid="content">
                        <Menu.Item>Content</Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button', { name: 'Trigger' });
      expect(screen.queryByRole('menu')).toBe(null);
      await act(async () => {
        menuHandle.open('trigger');
      });
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBe(null);
      });
      expect(screen.getByTestId('content').textContent).toBe('Content');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await act(async () => {
        menuHandle.close();
      });
      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBe(null);
      });
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
    it('sets the payload associated with the trigger', async () => {
      const menuHandle = Menu.createHandle<number>();
      await render(
        (testProps: any) => <div {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger handle={menuHandle} id="trigger1" payload={1}>
                  Trigger 1
                </Menu.Trigger>
                <Menu.Trigger handle={menuHandle} id="trigger2" payload={2}>
                  Trigger 2
                </Menu.Trigger>
                <Menu.Root handle={menuHandle}>
                  {(componentProps15: NumberPayload) => (
                    <Menu.Portal>
                      <Menu.Positioner>
                        <Menu.Popup>
                          <Menu.Item data-testid="content">{componentProps15.payload}</Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  )}
                </Menu.Root>
              </>
            );
          },
        }),
      );
      const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
      const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
      expect(screen.queryByRole('menu')).toBe(null);
      await act(async () => {
        menuHandle.open('trigger2');
      });
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBe(null);
      });
      expect(screen.getByTestId('content').textContent).toBe('2');
      expect(trigger2).toHaveAttribute('aria-expanded', 'true');
      expect(trigger1).not.toHaveAttribute('aria-expanded', 'true');
      await act(async () => {
        menuHandle.close();
      });
      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBe(null);
      });
      expect(trigger2).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
