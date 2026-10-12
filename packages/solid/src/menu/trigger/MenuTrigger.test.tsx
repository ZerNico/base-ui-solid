import { createSignal, flush, untrack } from 'solid-js';

import { expect, vi, describe, it } from 'vitest';
import {
  describeConformance,
  fireEvent,
  flushMicrotasks,
  screen,
  waitFor,
  isJSDOM,
} from '#test-utils';
import { Menu } from 'base-ui-solid/menu';
import { Popover } from 'base-ui-solid/popover';
import { PortFragment, createRenderer, ignoreActWarnings } from '../../../test/menuPortHelpers';
import { act } from '../../../test/utils';
import { PATIENT_CLICK_THRESHOLD } from '../../internals/constants';

describe('<Menu.Trigger />', () => {
  const { render } = createRenderer();
  describeConformance(Menu.Trigger, {
    refInstanceof: window.HTMLButtonElement,
    testRenderPropWith: 'button',
    button: true,
    wrap: (node) => <Menu.Root open>{node()}</Menu.Root>,
  });
  it('throws without Menu.Root or a handle', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(
        render(
          (testProps: any) => <Menu.Trigger {...testProps} />,
          () => ({}),
        ),
      ).rejects.toThrow(
        'Base UI: <Menu.Trigger> must be either used within a <Menu.Root> component or provided with a handle.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
  describe.skipIf(isJSDOM)('tabbing backward from the open trigger', () => {
    it.each([true, false])('focuses the preceding element when modal=%s', async (modal) => {
      ignoreActWarnings();
      const { userEvent: nativeUser } = await import('vitest/browser');
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
      await render(
        (testProps: any) => <div {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <button>Before</button>
                <Menu.Root modal={modal}>
                  <Menu.Trigger>Toggle</Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup>
                        <Menu.Item>Item</Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button', { name: 'Toggle' });
      await nativeUser.click(trigger);
      await waitFor(() => {
        expect(screen.getByRole('menu')).toHaveFocus();
      });
      // Menu normally closes on Shift+Tab from its content. Focus the trigger while it stays open.
      await act(async () => trigger.focus());
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await nativeUser.tab({ shift: true });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus();
      });
      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBe(null);
      });
    });
  });
  describe('prop: disabled', () => {
    it('should render a disabled button', async () => {
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger disabled />
              </>
            );
          },
        }),
      );
      const button = screen.getByRole('button');
      expect(button).toHaveProperty('disabled', true);
    });
    it('should not open the menu when clicked', async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger disabled />
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup />
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const button = screen.getByRole('button');
      await user.click(button);
      expect(screen.queryByRole('menu', { hidden: false })).toBe(null);
    });
  });
  it('removes the hover mouseup listener when unmounted before mouseup', async () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    try {
      const { user, unmount } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger delay={0} openOnHover>
                  Open
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup />
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button', { name: 'Open' });
      addEventListenerSpy.mockClear();
      await user.hover(trigger);
      await screen.findByRole('menu', { hidden: false });
      const mouseUpListener = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'mouseup',
      )?.[1];
      expect(mouseUpListener).toBeTypeOf('function');
      unmount();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', mouseUpListener);
    } finally {
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    }
  });
  describe('keyboard navigation', () => {
    const cases = [
      { buttonType: 'native', key: 'ArrowUp' },
      { buttonType: 'native', key: 'ArrowDown' },
      { buttonType: 'non-native', key: 'ArrowUp' },
      { buttonType: 'non-native', key: 'ArrowDown' },
      { buttonType: 'non-native', key: 'Enter' },
      { buttonType: 'non-native', key: 'Space' },
    ] as const;

    it.each(cases)(
      'opens the menu when pressing $key on a $buttonType button',
      async ({ buttonType, key }) => {
        const { user } = await render(() => (
          <Menu.Root>
            {buttonType === 'native' ? (
              <Menu.Trigger>Open</Menu.Trigger>
            ) : (
              <Menu.Trigger
                render={(renderProps) => <span {...renderProps} />}
                nativeButton={false}
              >
                Open
              </Menu.Trigger>
            )}
            <Menu.Portal>
              <Menu.Positioner>
                <Menu.Popup>
                  <Menu.Item>1</Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        ));

        const button = screen.getByRole('button', { name: 'Open' });
        expect(button.tagName).toBe(buttonType === 'native' ? 'BUTTON' : 'SPAN');
        await act(async () => {
          button.focus();
        });

        await user.keyboard(`[${key}]`);

        expect(screen.getByRole('menu', { hidden: false })).toBeInTheDocument();
      },
    );
  });
  describe('style hooks', () => {
    it('should have the data-popup-open and data-pressed attributes when open', async () => {
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger />
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button');
      await act(async () => {
        trigger.click();
      });
      expect(trigger).toHaveAttribute('data-popup-open');
      expect(trigger).toHaveAttribute('data-pressed');
    });
    it('keeps the data-popup-open attribute and handle.isOpen when a controlled close is vetoed', async () => {
      const handle = Menu.createHandle();
      function TestCase() {
        const [open, setOpen] = createSignal(untrack(() => false));
        return (
          <PortFragment>
            <Menu.Root
              handle={handle}
              open={open()}
              onOpenChange={(nextOpen) => {
                if (nextOpen) {
                  setOpen(true);
                }
              }}
            >
              <Menu.Trigger>Actions</Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup>
                    <Menu.Item>Item</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            <button type="button">Outside</button>
          </PortFragment>
        );
      }
      const { user } = await render(
        (testProps: any) => <TestCase {...testProps} />,
        () => ({}),
      );
      const trigger = screen.getByRole('button', { name: 'Actions' });
      await user.click(trigger);
      await screen.findByRole('menu');
      expect(trigger).toHaveAttribute('data-popup-open');
      expect(handle.isOpen).toBe(true);
      await user.click(screen.getByRole('button', { name: 'Outside' }));
      expect(screen.getByRole('menu')).toHaveAttribute('data-open');
      expect(trigger).toHaveAttribute('data-popup-open');
      expect(handle.isOpen).toBe(true);
    });
  });
  describe('impatient clicks with `openOnHover=true`', () => {
    const { clock, render: renderFakeTimers } = createRenderer();
    clock.withFakeTimers();
    // Port note: flush after native events and timer advances, matching React act boundaries.
    it('does not close the menu if the user clicks too quickly', async () => {
      await renderFakeTimers(() => (
        <Menu.Root>
          <Menu.Trigger delay={0} openOnHover />
        </Menu.Root>
      ));
      const trigger = screen.getByRole('button');
      fireEvent.mouseMove(trigger);
      flush();
      clock.tick(PATIENT_CLICK_THRESHOLD - 1);
      flush();
      fireEvent.click(trigger);
      flush();
      expect(trigger).toHaveAttribute('data-popup-open');
    });
    it('closes the menu if the user clicks patiently', async () => {
      await renderFakeTimers(() => (
        <Menu.Root>
          <Menu.Trigger delay={0} openOnHover />
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup />
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));
      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);
      flush();
      clock.tick(PATIENT_CLICK_THRESHOLD);
      flush();
      fireEvent.click(trigger);
      flush();
      expect(trigger).not.toHaveAttribute('data-popup-open');

      // Leaving the trigger afterwards doesn't reopen it.
      fireEvent.mouseLeave(trigger);
      flush();

      expect(trigger).not.toHaveAttribute('data-popup-open');
    });
    it('sticks if the user clicks impatiently', async () => {
      await renderFakeTimers(() => (
        <Menu.Root>
          <Menu.Trigger delay={0} openOnHover />
        </Menu.Root>
      ));
      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);
      flush();
      clock.tick(PATIENT_CLICK_THRESHOLD - 1);
      flush();
      fireEvent.click(trigger);
      flush();
      fireEvent.mouseLeave(trigger);
      flush();
      expect(trigger).toHaveAttribute('data-popup-open');
      clock.tick(1);
      flush();
      expect(trigger).toHaveAttribute('data-popup-open');
    });
    it('sticks when clicked before the hover delay completes', async () => {
      await renderFakeTimers(() => (
        <Menu.Root>
          <Menu.Trigger openOnHover delay={300}>
            Open
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>Content</Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));
      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);
      flush();
      fireEvent.mouseMove(trigger);
      flush();
      clock.tick(100);
      flush();
      // User clicks impatiently to open
      fireEvent.click(trigger);
      flush();
      expect(trigger).toHaveAttribute('data-popup-open');
      fireEvent.mouseLeave(trigger);
      flush();
      expect(trigger).toHaveAttribute('data-popup-open');
    });
    it('should keep the menu open when re-hovered and clicked within the patient threshold', async () => {
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger openOnHover delay={100}>
                  Open
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>Content</Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);
      flush();
      fireEvent.mouseMove(trigger);
      flush();
      clock.tick(100);
      flush();
      await flushMicrotasks();
      expect(screen.getByText('Content')).not.toBe(null);
      clock.tick(PATIENT_CLICK_THRESHOLD);
      flush();
      fireEvent.mouseLeave(trigger);
      flush();
      fireEvent.mouseEnter(trigger);
      flush();
      fireEvent.mouseMove(trigger);
      flush();
      fireEvent.click(trigger);
      flush();
      expect(screen.getByText('Content')).not.toBe(null);
    });
  });
  it.skipIf(isJSDOM)(
    'keeps a hover-opened menu open when mouseup lands outside the trigger DOM but within its bounds',
    async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger
                  openOnHover
                  delay={0}
                  style={{ width: '120px', height: '40px', display: 'block' }}
                >
                  Open
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup />
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.hover(trigger);
      expect(screen.queryByRole('menu')).not.toBe(null);
      const rect = trigger.getBoundingClientRect();
      fireEvent.mouseUp(document.body, {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      });
      expect(screen.queryByRole('menu')).not.toBe(null);
    },
  );
  describe('preventBaseUIHandler', () => {
    it('prevents opening the menu with a mouse when `preventBaseUIHandler` is called in onMouseDown', async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger onMouseDown={(event) => event.preventBaseUIHandler()} />
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup />
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const button = screen.getByRole('button');
      await user.click(button);
      expect(screen.queryByRole('menu', { hidden: false })).toBe(null);
    });
    it('prevents opening the menu with keyboard when `preventBaseUIHandler` is called in onClick', async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger onClick={(event) => event.preventBaseUIHandler()} />
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup />
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const button = screen.getByRole('button');
      await act(async () => {
        button.focus();
      });
      await user.keyboard('[Enter]');
      expect(screen.queryByRole('menu', { hidden: false })).toBe(null);
    });
  });
  it('does not have role prop inside a Popover', async () => {
    await render(
      (testProps: any) => <Popover.Root {...testProps} />,
      () => ({
        open: true,
        get children() {
          return (
            <>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup>
                    <Menu.Root>
                      <Menu.Trigger data-testid="menu-trigger" />
                    </Menu.Root>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </>
          );
        },
      }),
    );
    const button = screen.getByTestId('menu-trigger');
    expect(button).not.toHaveAttribute('role');
  });
  it('has a role prop inside a Popover when not a native button', async () => {
    await render(
      (testProps: any) => <Popover.Root {...testProps} />,
      () => ({
        open: true,
        get children() {
          return (
            <>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup>
                    <Menu.Root>
                      <Menu.Trigger
                        data-testid="menu-trigger"
                        render={(renderProps) => <span {...renderProps} />}
                        nativeButton={false}
                      />
                    </Menu.Root>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </>
          );
        },
      }),
    );
    const button = screen.getByTestId('menu-trigger');
    expect(button).toHaveAttribute('role', 'button');
  });
});
