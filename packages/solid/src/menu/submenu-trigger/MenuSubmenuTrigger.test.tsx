import { flush } from 'solid-js';
import type { JSX } from '@solidjs/web';

import { afterEach, beforeEach, vi, expect, describe, it } from 'vitest';
import { fireEvent, flushMicrotasks, waitFor, screen, isJSDOM } from '#test-utils';
import { DirectionProvider } from 'base-ui-solid/direction-provider';
import { Menu } from 'base-ui-solid/menu';
import { describeMenuConformance } from '../../../test/menuConformance';
import { createRenderer, SafeReact } from '../../../test/menuPortHelpers';
import { act } from '../../../test/utils';
import { useMenuRootContext } from '../root/MenuRootContext';
import type { MenuStore } from '../store/MenuStore';

type TextDirection = 'ltr' | 'rtl';

// Port note: production guards use Solid's build flag, not a runtime NODE_ENV check.
const buildMode = vi.hoisted(() => ({ isDev: true }));
vi.mock('@base-ui-solid/utils/isDev', () => ({
  get IS_DEV() {
    return buildMode.isDev;
  },
}));

describe('<Menu.SubmenuTrigger />', () => {
  const { render } = createRenderer();
  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });
  async function waitForAnimationFrame() {
    await act(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        }),
    );
  }
  afterEach(waitForAnimationFrame);
  it.skipIf(isJSDOM).each(['Enter', 'Space'])(
    'keeps a hover-opened submenu open when pressing %s',
    async (key) => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger>Actions</Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup data-testid="parent-menu">
                      <Menu.SubmenuRoot>
                        <Menu.SubmenuTrigger>More</Menu.SubmenuTrigger>
                        <Menu.Portal>
                          <Menu.Positioner>
                            <Menu.Popup data-testid="submenu">
                              <Menu.Item>Alpha</Menu.Item>
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
      await user.click(screen.getByRole('button', { name: 'Actions' }));
      const trigger = await screen.findByRole('menuitem', { name: 'More' });
      await user.hover(trigger);
      await screen.findByTestId('submenu');
      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
      await user.keyboard(`[${key}]`);
      await waitForAnimationFrame();
      expect(screen.getByTestId('submenu')).not.toBe(null);
      expect(screen.getByTestId('parent-menu')).not.toBe(null);
    },
  );
  it.skipIf(isJSDOM)('closes a touch-opened submenu on a second tap', async () => {
    const { user } = await render(
      (testProps: any) => <Menu.Root {...testProps} />,
      () => ({
        defaultOpen: true,
        get children() {
          return (
            <>
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup data-testid="parent-menu">
                    <Menu.SubmenuRoot>
                      <Menu.SubmenuTrigger>More</Menu.SubmenuTrigger>
                      <Menu.Portal>
                        <Menu.Positioner>
                          <Menu.Popup data-testid="submenu">
                            <Menu.Item>Alpha</Menu.Item>
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
    const trigger = screen.getByRole('menuitem', { name: 'More' });
    await user.pointer({ target: trigger, keys: '[TouchA]' });
    await screen.findByTestId('submenu');
    await waitForAnimationFrame();
    await user.pointer({ target: trigger, keys: '[TouchA]' });
    await waitFor(() => {
      expect(screen.queryByTestId('submenu')).toBe(null);
    });
    expect(screen.getByTestId('parent-menu')).not.toBe(null);
  });
  it('keeps a submenu open on direct trigger focus but closes it on guard return', async () => {
    const { user } = await render(
      (testProps: any) => <Menu.Root {...testProps} />,
      () => ({
        get children() {
          return (
            <>
              <Menu.Trigger>Actions</Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup data-testid="parent-menu">
                    <Menu.SubmenuRoot>
                      <Menu.SubmenuTrigger>More</Menu.SubmenuTrigger>
                      <Menu.Portal>
                        <Menu.Positioner>
                          <Menu.Popup data-testid="submenu">
                            <Menu.Item>Alpha</Menu.Item>
                          </Menu.Popup>
                        </Menu.Positioner>
                      </Menu.Portal>
                    </Menu.SubmenuRoot>
                    <Menu.Item>Play Next</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </>
          );
        },
      }),
    );
    await user.keyboard('[Tab][Enter]');
    const trigger = screen.getByRole('menuitem', { name: 'More' });
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
    await user.keyboard('[ArrowRight]');
    const item = screen.getByRole('menuitem', { name: 'Alpha' });
    await waitFor(() => {
      expect(item).toHaveFocus();
    });
    await act(async () => {
      trigger.focus();
    });
    await flushMicrotasks();
    expect(screen.getByTestId('submenu')).not.toBe(null);
    await act(async () => {
      item.focus();
    });
    const submenu = screen.getByTestId('submenu');
    const guard = submenu.parentElement?.querySelector<HTMLElement>(
      '[data-base-ui-focus-guard][data-type="inside"]',
    );
    expect(guard).toBeTruthy();
    await act(async () => {
      guard?.focus();
    });
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
    await waitFor(() => {
      expect(screen.queryByTestId('submenu')).toBe(null);
    });
    expect(screen.getByTestId('parent-menu')).not.toBe(null);
    await user.keyboard('[ArrowDown]');
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Play Next' })).toHaveFocus();
    });
  });
  it.skipIf(isJSDOM)(
    'closes a submenu when its focus guard is in a shadow-root portal',
    async () => {
      const host = document.createElement('div');
      document.body.append(host);
      const shadowRoot = host.attachShadow({ mode: 'open' });
      try {
        const { user } = await render(
          (testProps: any) => <Menu.Root {...testProps} />,
          () => ({
            get children() {
              return (
                <>
                  <Menu.Trigger>Actions</Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup data-testid="parent-menu">
                        <Menu.SubmenuRoot>
                          <Menu.SubmenuTrigger>More</Menu.SubmenuTrigger>
                          <Menu.Portal container={shadowRoot}>
                            <Menu.Positioner>
                              <Menu.Popup data-testid="submenu">
                                <Menu.Item>Alpha</Menu.Item>
                              </Menu.Popup>
                            </Menu.Positioner>
                          </Menu.Portal>
                        </Menu.SubmenuRoot>
                        <Menu.Item>Play Next</Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </>
              );
            },
          }),
        );
        await user.keyboard('[Tab][Enter]');
        const trigger = screen.getByRole('menuitem', { name: 'More' });
        await waitFor(() => {
          expect(trigger).toHaveFocus();
        });
        await user.keyboard('[ArrowRight]');
        await waitFor(() => {
          expect(shadowRoot.activeElement?.textContent).toBe('Alpha');
        });
        const submenu = shadowRoot.querySelector<HTMLElement>('[data-testid="submenu"]');
        const guard = submenu?.parentElement?.querySelector<HTMLElement>(
          '[data-base-ui-focus-guard][data-type="inside"]',
        );
        expect(guard).toBeTruthy();
        const item = shadowRoot.querySelector<HTMLElement>('[role="menuitem"]');
        await act(async () => {
          trigger.focus();
        });
        await flushMicrotasks();
        expect(shadowRoot.querySelector('[data-testid="submenu"]')).not.toBe(null);
        await act(async () => {
          item?.focus();
        });
        await act(async () => {
          guard?.focus();
        });
        await waitFor(() => {
          expect(trigger).toHaveFocus();
        });
        await waitFor(() => {
          expect(shadowRoot.querySelector('[data-testid="submenu"]')).toBe(null);
        });
        expect(screen.getByTestId('parent-menu')).not.toBe(null);
        await user.keyboard('[ArrowDown]');
        await waitFor(() => {
          expect(screen.getByRole('menuitem', { name: 'Play Next' })).toHaveFocus();
        });
      } finally {
        host.remove();
      }
    },
  );
  describeMenuConformance(Menu.SubmenuTrigger, {
    refInstanceof: window.HTMLDivElement,
    render: (node: () => JSX.Element) => {
      return render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.SubmenuRoot>{node()}</Menu.SubmenuRoot>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
    },
  });
  it('follows a submenu trigger id change', async () => {
    const storeRef: {
      current: MenuStore<unknown> | null;
    } = { current: null };
    function StoreProbe() {
      storeRef.current = useMenuRootContext().store;
      return null;
    }
    function App(componentProps1: { id: string }) {
      return (
        <Menu.Root open>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.SubmenuRoot>
                  <StoreProbe />
                  <Menu.SubmenuTrigger id={componentProps1.id}>More</Menu.SubmenuTrigger>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup>
                        <Menu.Item>Monthly</Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.SubmenuRoot>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      );
    }
    const { setProps } = await render(
      (testProps: any) => <App {...testProps} />,
      () => ({
        id: 'first',
      }),
    );
    const submenuTrigger = screen.getByText('More');
    expect(storeRef.current!.context.triggerElements.getById('first')).toBe(submenuTrigger);
    await setProps({ id: 'second' });
    expect(storeRef.current!.context.triggerElements.getById('first')).toBeUndefined();
    expect(storeRef.current!.context.triggerElements.getById('second')).toBe(submenuTrigger);
    expect(storeRef.current!.context.triggerElements.size).toBe(1);
  });
  it('throws when rendered outside Menu.SubmenuRoot', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(
        render(
          (testProps: any) => <Menu.SubmenuTrigger {...testProps} />,
          () => ({}),
        ),
      ).rejects.toThrow('Base UI: <Menu.SubmenuTrigger> must be placed in <Menu.SubmenuRoot>.');
    } finally {
      errorSpy.mockRestore();
    }
  });
  it('throws when Menu.SubmenuRoot is rendered outside a menu', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(
        render(
          (testProps: any) => <Menu.SubmenuRoot {...testProps} />,
          () => ({
            get children() {
              return (
                <>
                  <Menu.SubmenuTrigger>More</Menu.SubmenuTrigger>
                </>
              );
            },
          }),
        ),
      ).rejects.toThrow('Base UI: MenuRootContext is missing.');
    } finally {
      errorSpy.mockRestore();
    }
  });
  function TestComponent(componentProps2: { direction: TextDirection }) {
    return (
      <DirectionProvider direction={componentProps2.direction ?? 'ltr'}>
        <Menu.Root open>
          <Menu.Trigger>Open menu</Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item>1</Menu.Item>
                <Menu.SubmenuRoot>
                  <Menu.SubmenuTrigger>2</Menu.SubmenuTrigger>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup>
                        <Menu.Item>2.1</Menu.Item>
                        <Menu.Item>2.2</Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.SubmenuRoot>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </DirectionProvider>
    );
  }
  const testCases = [
    { direction: 'ltr', openKey: 'ArrowRight', closeKey: 'ArrowLeft' },
    { direction: 'rtl', openKey: 'ArrowLeft', closeKey: 'ArrowRight' },
  ];
  testCases.forEach((componentProps3) => {
    it(`opens the submenu with ${componentProps3.openKey} and highlights a single item in ${componentProps3.direction.toUpperCase()} direction`, async () => {
      await render(
        (testProps: any) => <TestComponent {...testProps} />,
        () => ({
          direction: componentProps3.direction as TextDirection,
        }),
      );
      const submenuTrigger = screen.getByText('2');
      // Port note: native focus dispatch does not move focus or bubble as React onFocus does.
      await act(() => submenuTrigger.focus());
      fireEvent.keyDown(submenuTrigger, { key: componentProps3.openKey });
      // Port note: flush the native event before findAll sees only the parent items.
      flush();
      const submenuItems = await screen.findAllByRole('menuitem');
      const submenuItem1 = submenuItems.find((item) => item.textContent === '2.1');
      await waitFor(() => {
        expect(submenuItem1).toHaveFocus();
      });
      submenuItems.forEach((item) => {
        expect(item.hasAttribute('data-highlighted')).toBe(item === submenuItem1);
      });
      // Check that parent menu items are not active
      const parentMenuItems = screen
        .getAllByRole('menuitem')
        .filter((item) => item.textContent !== '2.1' && item.textContent !== '2.2');
      parentMenuItems.forEach((item) => {
        expect(item).not.toHaveAttribute('data-highlighted');
      });
    });
  });
  it('sets tabIndex to 0 on the submenu trigger after opening the submenu with a keydown event', async () => {
    await render(
      (testProps: any) => <TestComponent {...testProps} />,
      () => ({
        direction: 'ltr',
      }),
    );
    const submenuTrigger = screen.getByText('2');
    await act(() => submenuTrigger.focus());
    fireEvent.keyDown(submenuTrigger, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(submenuTrigger).toHaveAttribute('tabIndex', '0');
    });
  });
  it('uses the label prop for text navigation', async () => {
    const { user } = await render(
      (testProps: any) => <Menu.Root {...testProps} />,
      () => ({
        open: true,
        get children() {
          return (
            <>
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup>
                    <Menu.Item>Alpha</Menu.Item>
                    <Menu.SubmenuRoot>
                      <Menu.SubmenuTrigger data-testid="submenu-trigger" label="Reports">
                        More
                      </Menu.SubmenuTrigger>
                      <Menu.Portal>
                        <Menu.Positioner>
                          <Menu.Popup>
                            <Menu.Item>Monthly</Menu.Item>
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
    // Port note: move real focus before typing through user-event.
    await act(() => screen.getByText('Alpha').focus());
    await user.keyboard('r');
    await waitFor(() => {
      expect(screen.getByTestId('submenu-trigger')).toHaveFocus();
    });
  });
  describe('prop: disabled', () => {
    it('should render with disabled attributes when disabled prop is set', async () => {
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Trigger>Open menu</Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.Item>1</Menu.Item>
                      <Menu.SubmenuRoot>
                        <Menu.SubmenuTrigger disabled>Open submenu</Menu.SubmenuTrigger>
                        <Menu.Portal>
                          <Menu.Positioner>
                            <Menu.Popup data-testid="submenu-popup">
                              <Menu.Item>2.1</Menu.Item>
                              <Menu.Item>2.2</Menu.Item>
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
      const submenuTrigger = screen.getByRole('menuitem', { name: 'Open submenu' });
      expect(submenuTrigger).toHaveAttribute('data-disabled');
      expect(submenuTrigger).toHaveAttribute('aria-disabled', 'true');
    });
    it('does not open on hover when disabled', async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Trigger>Open menu</Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.Item>1</Menu.Item>
                      <Menu.SubmenuRoot>
                        <Menu.SubmenuTrigger disabled delay={0}>
                          Open submenu
                        </Menu.SubmenuTrigger>
                        <Menu.Portal>
                          <Menu.Positioner>
                            <Menu.Popup data-testid="submenu-popup">
                              <Menu.Item>2.1</Menu.Item>
                              <Menu.Item>2.2</Menu.Item>
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
      const submenuTrigger = screen.getByRole('menuitem', { name: 'Open submenu' });
      await user.hover(submenuTrigger);
      expect(screen.queryByTestId('submenu-popup')).toBe(null);
    });
    it('should warn when a disabled element is detected via render prop with JSX element', async () => {
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockName('console.warn')
        .mockImplementation(() => {});
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Trigger>Open menu</Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.Item>1</Menu.Item>
                      <Menu.SubmenuRoot>
                        <Menu.SubmenuTrigger
                          nativeButton
                          render={(renderProps) => (
                            <button {...renderProps} type="button" disabled={true} />
                          )}
                        >
                          Open submenu
                        </Menu.SubmenuTrigger>
                      </Menu.SubmenuRoot>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Base UI: A disabled element was detected on <Menu.SubmenuTrigger>. To properly disable the trigger, use the `disabled` prop on the component instead of setting it on the rendered element.',
        ),
      );
      expect(warnSpy.mock.lastCall?.[0]).not.toContain('undefined');
    });
    // React-only: React owner stack capture has no Solid equivalent.
    it.skip('warns without an owner stack when React cannot provide one', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const ownerStackSpy = vi.spyOn(SafeReact, 'captureOwnerStack').mockReturnValue(null);
      try {
        await render(
          (testProps: any) => <Menu.Root {...testProps} />,
          () => ({
            open: true,
            get children() {
              return (
                <>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup>
                        <Menu.SubmenuRoot>
                          <Menu.SubmenuTrigger
                            nativeButton
                            render={(renderProps) => (
                              <button {...renderProps} type="button" disabled={true} />
                            )}
                          >
                            Open submenu
                          </Menu.SubmenuTrigger>
                        </Menu.SubmenuRoot>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </>
              );
            },
          }),
        );
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy).toHaveBeenCalledWith(
          'Base UI: A disabled element was detected on <Menu.SubmenuTrigger>. To properly disable the trigger, use the `disabled` prop on the component instead of setting it on the rendered element.',
        );
      } finally {
        ownerStackSpy.mockRestore();
        warnSpy.mockRestore();
      }
    });
    it.skipIf(!isJSDOM)('does not inspect rendered disabled elements in production', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      buildMode.isDev = false;
      try {
        await render(
          (testProps: any) => <Menu.Root {...testProps} />,
          () => ({
            open: true,
            get children() {
              return (
                <>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup>
                        <Menu.SubmenuRoot>
                          <Menu.SubmenuTrigger
                            nativeButton
                            render={(renderProps) => (
                              <button {...renderProps} type="button" disabled={true} />
                            )}
                          >
                            Open submenu
                          </Menu.SubmenuTrigger>
                        </Menu.SubmenuRoot>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </>
              );
            },
          }),
        );
        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        buildMode.isDev = true;
      }
    });
  });
});
