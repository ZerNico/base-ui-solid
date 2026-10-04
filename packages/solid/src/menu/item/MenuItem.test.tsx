import { Errored } from 'solid-js';
import { expect, vi, describe, it } from 'vitest';
import type { JSX } from '@solidjs/web';
import { Menu } from 'base-ui-solid/menu';
import {
  describeConformance,
  createRenderer,
  isJSDOM,
  fireEvent,
  flushMicrotasks,
  screen,
  waitFor,
} from '#test-utils';

// Port note: `act(async () => { … })` runs its body and then awaits `flushMicrotasks()`.
// `render={<el />}` becomes a render function or a tag name (React elements can't be cloned).

describe('<Menu.Item />', () => {
  const { render, clock } = createRenderer({
    clockOptions: {
      shouldAdvanceTime: true,
    },
  });

  clock.withFakeTimers();

  describeConformance(Menu.Item, {
    refInstanceof: window.HTMLDivElement,
    // Port note: Solid conformance has no React button option; native interaction is tested below.
    wrap: (node) => <Menu.Root open>{node()}</Menu.Root>,
  });

  it('throws when rendered outside Menu.Root', async () => {
    // Port note: contain the intentional render error so it cannot halt Solid's reactive graph.
    // React's renderer rejects this error; Solid's boundary exposes the same error for assertion.
    let caughtError: unknown;
    await render(() => (
      <Errored
        fallback={(error) => {
          caughtError = error();
          return null;
        }}
      >
        <Menu.Item />
      </Errored>
    ));
    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe(
      'Base UI: MenuRootContext is missing. Menu parts must be placed within <Menu.Root>.',
    );
  });

  it('calls the onClick handler when clicked', async () => {
    const onClick = vi.fn();
    const { user } = await render(() => (
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Item onClick={onClick} id="item">
                Item
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    const item = screen.getByRole('menuitem');
    await user.click(item);

    expect(onClick.mock.calls.length).toBe(1);
  });

  it('does not close the menu when onClick prevents Base UI handler', async () => {
    const onClick = vi.fn((event) => event.preventBaseUIHandler());
    const { user } = await render(() => (
      <Menu.Root>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Item onClick={onClick}>Item</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);

    const item = screen.getByRole('menuitem');
    await user.click(item);

    expect(onClick.mock.calls.length).toBe(1);
    expect(screen.queryByRole('menu')).not.toBe(null);
  });

  it('allows onMouseDown to call preventBaseUIHandler', async () => {
    await render(() => (
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Item onMouseDown={(event) => event.preventBaseUIHandler()}>Item</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    const item = screen.getByRole('menuitem');

    expect(() => fireEvent.mouseDown(item)).not.toThrow();
  });

  it('perf: does not rerender menu items unnecessarily', async ({ skip }) => {
    if (isJSDOM) {
      skip();
    }

    const renderItem1Spy = vi.fn();
    const renderItem2Spy = vi.fn();
    const renderItem3Spy = vi.fn();
    const renderItem4Spy = vi.fn();

    // Port note: upstream renders a `LoggingRoot` React element that counts its renders. Solid
    // calls the render function once, so the spy is called whenever the item's props or state
    // update instead (the Solid counterpart of a re-render).
    function loggingRoot(renderSpy: (props: JSX.HTMLAttributes<HTMLLIElement>) => void) {
      return (props: JSX.HTMLAttributes<HTMLLIElement>) => (
        <>
          {(renderSpy({ ...props }), null)}
          <li {...props} />
        </>
      );
    }

    const { user } = await render(() => (
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.Item render={loggingRoot(renderItem1Spy)} id="item-1">
                1
              </Menu.Item>
              <Menu.Item render={loggingRoot(renderItem2Spy)} id="item-2">
                2
              </Menu.Item>
              <Menu.Item render={loggingRoot(renderItem3Spy)} id="item-3">
                3
              </Menu.Item>
              <Menu.Item render={loggingRoot(renderItem4Spy)} id="item-4">
                4
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    const menuItems = screen.getAllByRole('menuitem');
    menuItems[0].focus();
    await flushMicrotasks();

    renderItem1Spy.mockClear();
    renderItem2Spy.mockClear();
    renderItem3Spy.mockClear();
    renderItem4Spy.mockClear();

    expect(renderItem1Spy.mock.calls.length).toBe(0);

    await user.keyboard('{ArrowDown}'); // highlights '2'

    // React renders twice in strict mode, so we expect twice the number of spy calls
    // Port note: Solid has no strict mode, so each item updates once.

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

  describe('prop: closeOnClick', () => {
    it('closes the menu when the item is clicked by default', async () => {
      const { user } = await render(() => (
        <Menu.Root>
          <Menu.Trigger>Open</Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item>Item</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);

      const item = screen.getByRole('menuitem');
      await user.click(item);

      expect(screen.queryByRole('menu')).toBe(null);
    });

    it('when `closeOnClick=false` does not close the menu when the item is clicked', async () => {
      const { user } = await render(() => (
        <Menu.Root>
          <Menu.Trigger>Open</Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item closeOnClick={false}>Item</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Open' });
      await user.click(trigger);

      const item = screen.getByRole('menuitem');
      await user.click(item);

      expect(screen.queryByRole('menu')).not.toBe(null);
    });
  });

  describe('disabled state', () => {
    it('can be focused but not interacted with when disabled', async () => {
      const handleClick = vi.fn();
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();

      await render(() => (
        <Menu.Root open>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item
                  disabled
                  onClick={handleClick}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                >
                  Item
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      const item = screen.getByRole('menuitem');
      item.focus();
      await flushMicrotasks();
      expect(item).toHaveFocus();

      fireEvent.keyDown(item, { key: 'Enter' });
      expect(handleKeyDown.mock.calls.length).toBe(0);
      expect(handleClick.mock.calls.length).toBe(0);

      fireEvent.keyUp(item, { key: 'Space' });
      expect(handleKeyUp.mock.calls.length).toBe(0);
      expect(handleClick.mock.calls.length).toBe(0);

      fireEvent.click(item);
      expect(handleKeyDown.mock.calls.length).toBe(0);
      expect(handleKeyUp.mock.calls.length).toBe(0);
      expect(handleClick.mock.calls.length).toBe(0);
    });

    it('skips a natively disabled item during keyboard navigation', async () => {
      const { user } = await render(() => (
        <Menu.Root open>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item>1</Menu.Item>
                <Menu.Item
                  nativeButton
                  render={(props) => <button type="button" disabled {...props} />}
                >
                  2
                </Menu.Item>
                <Menu.Item>3</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));

      // Port note: preserve upstream's skipped middle (natively disabled) item.
      const [firstItem, , lastItem] = screen.getAllByRole('menuitem');
      firstItem.focus();
      await flushMicrotasks();

      await user.keyboard('{ArrowDown}');
      await waitFor(() => {
        expect(lastItem).toHaveFocus();
      });

      await user.keyboard('{ArrowUp}');
      await waitFor(() => {
        expect(firstItem).toHaveFocus();
      });
    });
  });
});
