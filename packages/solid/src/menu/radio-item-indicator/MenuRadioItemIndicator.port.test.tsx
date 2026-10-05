import { createSignal, flush } from 'solid-js';
import { describe, expect, it, beforeEach } from 'vitest';
import { Menu } from 'base-ui-solid/menu';
import { render, screen, flushMicrotasks, fireEvent, waitFor } from '#test-utils';

// Port note: regressions absent upstream. Mounting a part inside a menu item's children (the
// radio indicator) used to dispose that part and every other child of the item, leaving stale
// elements in the DOM.
function describeIndicator(indicator: HTMLElement | null) {
  return (
    indicator && {
      checked: indicator.hasAttribute('data-checked'),
      unchecked: indicator.hasAttribute('data-unchecked'),
      highlighted: indicator.hasAttribute('data-highlighted'),
      starting: indicator.hasAttribute('data-starting-style'),
      ending: indicator.hasAttribute('data-ending-style'),
    }
  );
}

describe('<Menu.RadioItemIndicator /> toggling', () => {
  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  it.each([
    ['unmounted when unchecked', false],
    ['keepMounted', true],
  ])('follows the selected item across changes (%s)', async (_name, keepMounted) => {
    await render(() => (
      <Menu.Root open modal={false}>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.RadioGroup defaultValue="a">
                <Menu.RadioItem value="a" data-testid="item-a">
                  <Menu.RadioItemIndicator data-testid="indicator-a" keepMounted={keepMounted}>
                    •
                  </Menu.RadioItemIndicator>
                  A
                </Menu.RadioItem>
                <Menu.RadioItem value="b" data-testid="item-b">
                  <Menu.RadioItemIndicator data-testid="indicator-b" keepMounted={keepMounted}>
                    •
                  </Menu.RadioItemIndicator>
                  B
                </Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    async function expectSelected(value: 'a' | 'b') {
      await waitFor(() => {
        for (const id of ['a', 'b']) {
          const item = screen.getByTestId(`item-${id}`);
          const checked = id === value;
          const highlighted = item.hasAttribute('data-highlighted');
          expect({
            ariaChecked: item.getAttribute('aria-checked'),
            indicator: describeIndicator(screen.queryByTestId(`indicator-${id}`)),
          }).toEqual({
            ariaChecked: String(checked),
            indicator:
              !checked && !keepMounted
                ? null
                : { checked, unchecked: !checked, highlighted, starting: false, ending: false },
          });
        }
      });
    }

    await expectSelected('a');
    for (const value of ['b', 'a', 'b', 'a'] as const) {
      const item = screen.getByTestId(`item-${value}`);
      fireEvent.mouseMove(item);
      fireEvent.click(item);
      // eslint-disable-next-line no-await-in-loop
      await flushMicrotasks();
      // eslint-disable-next-line no-await-in-loop
      await expectSelected(value);
    }
  });

  it('keeps reactive children of a menu item updating after a sibling part mounts', async () => {
    const [count, setCount] = createSignal(0);
    await render(() => (
      <Menu.Root open modal={false}>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.RadioGroup defaultValue="b">
                <Menu.RadioItem value="a" data-testid="item-a">
                  <Menu.RadioItemIndicator data-testid="indicator-a" />
                  <span data-testid="count">{count()}</span>
                </Menu.RadioItem>
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    fireEvent.click(screen.getByTestId('item-a'));
    await flushMicrotasks();
    expect(screen.queryByTestId('indicator-a')).not.toBe(null);

    setCount(1);
    flush();
    await flushMicrotasks();
    expect(screen.getByTestId('count').textContent).toBe('1');
  });
});
