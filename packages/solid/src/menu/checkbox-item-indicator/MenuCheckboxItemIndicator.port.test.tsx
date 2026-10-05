import { describe, expect, it, beforeEach } from 'vitest';
import { Menu } from 'base-ui-solid/menu';
import { render, screen, flushMicrotasks, fireEvent, waitFor } from '#test-utils';

// Port note: regression absent upstream. The indicator used to stop following the item after the
// first toggle: mounting it re-ran the item's children insert, which disposed the indicator and
// left its element in the DOM with `data-starting-style` and stale attributes.
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

describe('<Menu.CheckboxItemIndicator /> toggling', () => {
  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  it.each([
    ['unmounted when unchecked', false],
    ['keepMounted', true],
  ])('follows the item across toggles (%s)', async (_name, keepMounted) => {
    await render(() => (
      <Menu.Root open modal={false}>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>
              <Menu.CheckboxItem data-testid="item">
                <Menu.CheckboxItemIndicator data-testid="indicator" keepMounted={keepMounted}>
                  ✓
                </Menu.CheckboxItemIndicator>
                Check
              </Menu.CheckboxItem>
              <Menu.Item data-testid="other">Other</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    const item = screen.getByTestId('item');
    const other = screen.getByTestId('other');

    async function expectIndicator(checked: boolean, highlighted: boolean) {
      await waitFor(() => {
        expect(describeIndicator(screen.queryByTestId('indicator'))).toEqual(
          !checked && !keepMounted
            ? null
            : { checked, unchecked: !checked, highlighted, starting: false, ending: false },
        );
      });
    }

    await expectIndicator(false, false);
    for (const checked of [true, false, true, false, true]) {
      fireEvent.mouseMove(item);
      fireEvent.click(item);
      // eslint-disable-next-line no-await-in-loop
      await flushMicrotasks();
      expect(item.getAttribute('aria-checked')).toBe(String(checked));
      // eslint-disable-next-line no-await-in-loop
      await expectIndicator(checked, item.hasAttribute('data-highlighted'));

      fireEvent.mouseMove(other);
      // eslint-disable-next-line no-await-in-loop
      await flushMicrotasks();
      // eslint-disable-next-line no-await-in-loop
      await expectIndicator(checked, item.hasAttribute('data-highlighted'));
    }
  });
});
