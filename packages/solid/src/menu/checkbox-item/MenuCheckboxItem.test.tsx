import { createEffect, omit } from 'solid-js';

import { expect, vi, describe, it } from 'vitest';
import { fireEvent, waitFor, screen, isJSDOM } from '#test-utils';
import { Menu } from 'base-ui-solid/menu';
import { portForwardRef, createRenderer } from '../../../test/menuPortHelpers';
import { act } from '../../../test/utils';
import { describeMenuConformance } from '../../../test/menuConformance';

type Ref<T> = (element: T) => void;
describe('<Menu.CheckboxItem />', () => {
  const { render, clock } = createRenderer({
    clockOptions: {
      shouldAdvanceTime: true,
    },
  });
  clock.withFakeTimers();
  describeMenuConformance(Menu.CheckboxItem, {
    refInstanceof: window.HTMLDivElement,
    render: (node) => render(() => <Menu.Root open>{node()}</Menu.Root>),
  });
  it('perf: does not rerender menu items unnecessarily', async ({ skip }) => {
    if (isJSDOM) {
      skip();
    }
    const renderItem1Spy = vi.fn();
    const renderItem2Spy = vi.fn();
    const renderItem3Spy = vi.fn();
    const renderItem4Spy = vi.fn();
    const LoggingRoot = portForwardRef(function LoggingRoot(
      props: any & {
        renderSpy: () => void;
      },
      ref: Ref<HTMLLIElement>,
    ) {
      // Port note: Solid mounts once; count reactive prop updates instead of React StrictMode renders.
      createEffect(
        () => ({ ...omit(props, 'renderSpy', 'state') }),
        () => props.renderSpy(),
      );
      return <li {...omit(props, 'renderSpy', 'state')} ref={ref} />;
    });
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
                    <Menu.CheckboxItem
                      render={(renderProps) => (
                        <LoggingRoot {...renderProps} renderSpy={renderItem1Spy} />
                      )}
                      id="item-1"
                    >
                      1
                    </Menu.CheckboxItem>
                    <Menu.CheckboxItem
                      render={(renderProps) => (
                        <LoggingRoot {...renderProps} renderSpy={renderItem2Spy} />
                      )}
                      id="item-2"
                    >
                      2
                    </Menu.CheckboxItem>
                    <Menu.CheckboxItem
                      render={(renderProps) => (
                        <LoggingRoot {...renderProps} renderSpy={renderItem3Spy} />
                      )}
                      id="item-3"
                    >
                      3
                    </Menu.CheckboxItem>
                    <Menu.CheckboxItem
                      render={(renderProps) => (
                        <LoggingRoot {...renderProps} renderSpy={renderItem4Spy} />
                      )}
                      id="item-4"
                    >
                      4
                    </Menu.CheckboxItem>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </>
          );
        },
      }),
    );
    const menuItems = screen.getAllByRole('menuitemcheckbox');
    await act(async () => {
      menuItems[0].focus();
    });
    renderItem1Spy.mockClear();
    renderItem2Spy.mockClear();
    renderItem3Spy.mockClear();
    renderItem4Spy.mockClear();
    expect(renderItem1Spy.mock.calls.length).toBe(0);
    fireEvent.keyDown(menuItems[0], { key: 'ArrowDown' }); // highlights '2'
    // Port note: each changed item updates once; Solid has no StrictMode double render.
    await waitFor(
      () => {
        expect(renderItem1Spy.mock.calls.length).toBe(1); // '1' rerenders as it loses highlight
      },
      { timeout: 1000 },
    );
    await waitFor(
      () => {
        expect(renderItem2Spy.mock.calls.length).toBe(1); // '2' rerenders as it receives highlight
      },
      { timeout: 1000 },
    );
    // neither the highlighted nor the selected state of these options changed,
    // so they don't need to rerender:
    expect(renderItem3Spy.mock.calls.length).toBe(0);
    expect(renderItem4Spy.mock.calls.length).toBe(0);
  });
  describe('state management', () => {
    (
      [
        [true, 'true', 'checked'],
        [false, 'false', 'unchecked'],
      ] as const
    ).forEach(([checked, ariaChecked, dataState]) =>
      it('adds the state and ARIA attributes when checked', async () => {
        const { user } = await render(
          (testProps: any) => <Menu.Root {...testProps} />,
          () => ({
            get children() {
              return (
                <>
                  <Menu.Trigger>Open</Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup>
                        <Menu.CheckboxItem checked={checked}>Item</Menu.CheckboxItem>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </>
              );
            },
          }),
        );
        const trigger = screen.getByRole('button', { name: 'Open' });
        await user.click(trigger);
        const item = screen.getByRole('menuitemcheckbox');
        expect(item).toHaveAttribute('aria-checked', ariaChecked);
        expect(item).toHaveAttribute(`data-${dataState}`, '');
      }),
    );
    it('toggles the checked state when clicked', async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger>Open</Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.CheckboxItem>Item</Menu.CheckboxItem>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);
      const item = screen.getByRole('menuitemcheckbox');
      await user.click(item);
      expect(item).toHaveAttribute('aria-checked', 'true');
      expect(item).toHaveAttribute('data-checked', '');
      await user.click(item);
      expect(item).toHaveAttribute('aria-checked', 'false');
      expect(item).toHaveAttribute('data-unchecked', '');
    });
    it(`toggles the checked state when Space is pressed`, async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger>Open</Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.CheckboxItem>Item</Menu.CheckboxItem>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button', { name: 'Open' });
      await act(async () => {
        trigger.focus();
      });
      await user.keyboard('[ArrowDown]');
      const item = screen.getByRole('menuitemcheckbox');
      await waitFor(() => {
        expect(item).toHaveFocus();
      });
      await user.keyboard(`[Space]`);
      expect(item).toHaveAttribute('data-checked', '');
      await user.keyboard(`[Space]`);
      expect(item).toHaveAttribute('data-unchecked', '');
    });
    it('toggles with Space after closing during typeahead and reopening', async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger>Open</Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.CheckboxItem>Settings</Menu.CheckboxItem>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button', { name: 'Open' });
      await act(async () => {
        trigger.focus();
      });
      await user.keyboard('[Enter]');
      await waitFor(() => {
        expect(screen.getByRole('menuitemcheckbox')).toHaveFocus();
      });
      await user.keyboard('s[Escape]');
      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
      await user.keyboard('[Enter]');
      const item = screen.getByRole('menuitemcheckbox');
      await waitFor(() => {
        expect(item).toHaveFocus();
      });
      expect(item).toHaveAttribute('aria-checked', 'false');
      await user.keyboard('[Space]');
      expect(item).toHaveAttribute('aria-checked', 'true');
    });
    it.skipIf(isJSDOM)(
      'does not toggle when Space is pressed during an active typeahead session',
      async () => {
        const onCheckedChange = vi.fn();
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
                        <Menu.CheckboxItem onCheckedChange={onCheckedChange}>
                          Item One
                        </Menu.CheckboxItem>
                        <Menu.CheckboxItem onCheckedChange={onCheckedChange}>
                          Item Two
                        </Menu.CheckboxItem>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </>
              );
            },
          }),
        );
        const [itemOne, itemTwo] = screen.getAllByRole('menuitemcheckbox');
        await act(async () => {
          itemOne.focus();
        });
        await user.keyboard('Item T');
        await waitFor(() => {
          expect(itemTwo).toHaveFocus();
        });
        await user.keyboard('[Space]');
        await user.keyboard('[Space]');
        expect(onCheckedChange.mock.calls.length > 0).toBe(false);
        expect(itemTwo).toHaveAttribute('aria-checked', 'false');
      },
    );
    it(`toggles the checked state when Enter is pressed`, async ({ skip }) => {
      if (isJSDOM) {
        skip();
      }
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger>Open</Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.CheckboxItem>Item</Menu.CheckboxItem>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button', { name: 'Open' });
      await act(async () => {
        trigger.focus();
      });
      await user.keyboard('[ArrowDown]');
      const item = screen.getByRole('menuitemcheckbox');
      await waitFor(() => {
        expect(item).toHaveFocus();
      });
      await user.keyboard(`[Enter]`);
      expect(item).toHaveAttribute('data-checked', '');
    });
    it('calls `onCheckedChange` when the item is clicked', async () => {
      const onCheckedChange = vi.fn();
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger>Open</Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.CheckboxItem onCheckedChange={onCheckedChange}>Item</Menu.CheckboxItem>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);
      const item = screen.getByRole('menuitemcheckbox');
      await user.click(item);
      expect(onCheckedChange.mock.calls.length).toBe(1);
      expect(onCheckedChange.mock.lastCall?.[0]).toBe(true);
      await user.click(item);
      expect(onCheckedChange.mock.calls.length).toBe(2);
      expect(onCheckedChange.mock.lastCall?.[0]).toBe(false);
    });
    it('does not toggle when `onCheckedChange` cancels the event', async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger>Open</Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.CheckboxItem
                        onCheckedChange={(_, eventDetails) => {
                          eventDetails.cancel();
                        }}
                      >
                        Item
                      </Menu.CheckboxItem>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);
      const item = screen.getByRole('menuitemcheckbox');
      await user.click(item);
      expect(item).toHaveAttribute('aria-checked', 'false');
      expect(item).not.toHaveAttribute('data-checked');
    });
    it('keeps the state when closed and reopened', async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          modal: false,
          get children() {
            return (
              <>
                <Menu.Trigger>Open</Menu.Trigger>
                <Menu.Portal keepMounted>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.CheckboxItem>Item</Menu.CheckboxItem>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button', { name: 'Open' });
      await act(() => {
        trigger.focus();
      });
      await user.keyboard('{Enter}');
      const item = screen.getByRole('menuitemcheckbox');
      await user.click(item);
      await user.keyboard('{Enter}');
      await user.keyboard('{Enter}');
      const itemAfterReopen = screen.getByRole('menuitemcheckbox');
      expect(itemAfterReopen).toHaveAttribute('aria-checked', 'true');
      expect(itemAfterReopen).toHaveAttribute('data-checked');
    });
  });
  describe('prop: closeOnClick', () => {
    it('when `closeOnClick=true`, closes the menu when the item is clicked', async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger>Open</Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.CheckboxItem closeOnClick>Item</Menu.CheckboxItem>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);
      const item = screen.getByRole('menuitemcheckbox');
      await user.click(item);
      expect(screen.queryByRole('menu')).toBe(null);
    });
    it('does not close the menu when the item is clicked by default', async () => {
      const { user } = await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Trigger>Open</Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.CheckboxItem>Item</Menu.CheckboxItem>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);
      const item = screen.getByRole('menuitemcheckbox');
      await user.click(item);
      expect(screen.queryByRole('menu')).not.toBe(null);
    });
  });
  describe('prop: focusableWhenDisabled', () => {
    it('can be focused but not interacted with when disabled', async () => {
      const handleCheckedChange = vi.fn();
      const handleClick = vi.fn();
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
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
                      <Menu.CheckboxItem
                        disabled
                        onCheckedChange={handleCheckedChange}
                        onClick={handleClick}
                        onKeyDown={handleKeyDown}
                        onKeyUp={handleKeyUp}
                      >
                        Item
                      </Menu.CheckboxItem>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const item = screen.getByRole('menuitemcheckbox');
      await act(() => item.focus());
      expect(item).toHaveFocus();
      fireEvent.keyDown(item, { key: 'Enter' });
      expect(handleKeyDown.mock.calls.length).toBe(0);
      expect(handleClick.mock.calls.length).toBe(0);
      expect(handleCheckedChange.mock.calls.length).toBe(0);
      fireEvent.keyUp(item, { key: 'Space' });
      expect(handleKeyUp.mock.calls.length).toBe(0);
      expect(handleClick.mock.calls.length).toBe(0);
      expect(handleCheckedChange.mock.calls.length).toBe(0);
      fireEvent.click(item);
      expect(handleKeyDown.mock.calls.length).toBe(0);
      expect(handleKeyUp.mock.calls.length).toBe(0);
      expect(handleClick.mock.calls.length).toBe(0);
      expect(handleCheckedChange.mock.calls.length).toBe(0);
    });
  });
});
