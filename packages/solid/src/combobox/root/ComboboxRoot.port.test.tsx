import { createSignal, flush } from 'solid-js';
import type { Accessor } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { createRenderer, flushMicrotasks, screen, waitFor } from '#test-utils';

const items = ['apple', 'banana', 'cherry'];

// Port note: controlled props reach the store one update after the prop (see PORTING.md, "Stores
// and popups"). These tests guard the settled DOM after controlled changes.
describe('<Combobox.Root /> (port)', () => {
  const { render } = createRenderer();

  it('filters the open list when the controlled input value changes', async () => {
    const [inputValue, setInputValue] = createSignal('');

    await render(() => (
      <Combobox.Root
        items={items}
        inputValue={inputValue()}
        onInputValueChange={setInputValue}
        defaultOpen
      >
        <Combobox.Input data-testid="input" />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List>
                {(item: Accessor<string>) => <Combobox.Item value={item()}>{item()}</Combobox.Item>}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));
    await waitFor(() => expect(screen.getByRole('listbox')).toBeVisible());

    setInputValue('ban');
    flush();
    await flushMicrotasks();

    expect(screen.getByTestId('input')).toHaveValue('ban');
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
    expect(screen.getByRole('option', { name: 'banana' })).toBeVisible();

    setInputValue('');
    flush();
    await flushMicrotasks();

    expect(screen.getByTestId('input')).toHaveValue('');
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));
  });

  it('marks the item of a controlled value change while open as selected', async () => {
    const [value, setValue] = createSignal<string | null>('apple');

    const { user } = await render(() => (
      <Combobox.Root items={items} value={value()} onValueChange={setValue}>
        <Combobox.Input data-testid="input" />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List>
                {(item: Accessor<string>) => <Combobox.Item value={item()}>{item()}</Combobox.Item>}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));

    const input = screen.getByTestId('input');
    expect(input).toHaveValue('apple');

    await user.click(input);
    await waitFor(() => expect(screen.getByRole('listbox')).toBeVisible());
    expect(screen.getByRole('option', { name: 'apple' })).toHaveAttribute('aria-selected', 'true');

    setValue('cherry');
    flush();
    await flushMicrotasks();

    const cherry = screen.getByRole('option', { name: 'cherry' });
    expect(cherry).toHaveAttribute('aria-selected', 'true');
    expect(cherry).toHaveAttribute('data-selected');
    expect(screen.getByRole('option', { name: 'apple' })).not.toHaveAttribute('data-selected');
  });
});
