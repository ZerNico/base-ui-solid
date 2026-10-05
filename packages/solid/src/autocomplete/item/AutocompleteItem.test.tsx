import type { Accessor } from 'solid-js';
import { expect, vi, describe, it } from 'vitest';
import { screen, waitFor, createRenderer } from '#test-utils';
import { Autocomplete } from 'base-ui-solid/autocomplete';

// Port note: `Combobox.List`/`Combobox.Collection` (and `Autocomplete.*`) render functions receive
// the item and its index as accessors, and `*.Value` render functions receive accessors.

describe('<Autocomplete.Item />', () => {
  const { render } = createRenderer();

  describe('prop: onClick', () => {
    it('calls onClick when clicked with a pointer', async () => {
      const handleClick = vi.fn();
      const { user } = await render((overrides) => (
        <Autocomplete.Root items={['apple', 'banana']} openOnInputClick {...overrides()}>
          <Autocomplete.Input data-testid="input" />
          <Autocomplete.Portal>
            <Autocomplete.Positioner>
              <Autocomplete.Popup>
                <Autocomplete.List>
                  {(item: Accessor<string>) => (
                    <Autocomplete.Item value={item()} onClick={handleClick}>
                      {item()}
                    </Autocomplete.Item>
                  )}
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete.Root>
      ));

      const input = screen.getByTestId('input');
      await user.click(input);

      const option = screen.getByRole('option', { name: 'banana' });
      await user.click(option);

      expect(handleClick.mock.calls.length).toBe(1);
    });

    it('calls onClick when selected with Enter key (via root interaction)', async () => {
      const handleClick = vi.fn();
      const { user } = await render((overrides) => (
        <Autocomplete.Root items={['one', 'two']} openOnInputClick {...overrides()}>
          <Autocomplete.Input data-testid="input" />
          <Autocomplete.Portal>
            <Autocomplete.Positioner>
              <Autocomplete.Popup>
                <Autocomplete.List>
                  {(item: Accessor<string>) => (
                    <Autocomplete.Item value={item()} onClick={handleClick}>
                      {item()}
                    </Autocomplete.Item>
                  )}
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete.Root>
      ));

      const input = screen.getByTestId('input');
      await user.click(input);
      await waitFor(() => expect(screen.getByRole('listbox')).not.toBe(null));

      // Move highlight to an option then press Enter to select it
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(handleClick.mock.calls.length).toBe(1);
    });
  });

  it('does not expose data-selected when reopening after a value is chosen', async () => {
    const { user } = await render((overrides) => (
      <Autocomplete.Root openOnInputClick {...overrides()}>
        <Autocomplete.Input data-testid="input" />
        <Autocomplete.Portal>
          <Autocomplete.Positioner>
            <Autocomplete.Popup>
              <Autocomplete.List>
                <Autocomplete.Item value="apple">apple</Autocomplete.Item>
                <Autocomplete.Item value="banana">banana</Autocomplete.Item>
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>
    ));

    const input = screen.getByTestId('input');

    await user.click(input);
    await user.click(screen.getByRole('option', { name: 'banana' }));
    await user.click(input);

    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'banana' })).not.toHaveAttribute('data-selected'),
    );
  });
});
