import { createSignal, flush, For } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { Select } from 'base-ui-solid/select';
import { createRenderer, flushMicrotasks, screen, waitFor } from '#test-utils';

// Port note: controlled props reach the store one update after the prop (see PORTING.md, "Stores
// and popups"). These tests guard the settled DOM after controlled changes.
describe('Select.Root (port)', () => {
  const { render } = createRenderer();

  it('follows a controlled value change while open and highlights it on reopen', async () => {
    const [value, setValue] = createSignal('a');
    const [open, setOpen] = createSignal(true);

    await render(() => (
      <Select.Root value={value()} onValueChange={setValue} open={open()} onOpenChange={setOpen}>
        <Select.Trigger data-testid="trigger">
          <Select.Value data-testid="value" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner>
            <Select.Popup>
              <For each={['a', 'b', 'c']}>
                {(item) => (
                  <Select.Item value={item}>
                    <Select.ItemText>{item}</Select.ItemText>
                  </Select.Item>
                )}
              </For>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    ));

    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'a' })).toHaveAttribute('data-highlighted'),
    );

    setValue('c');
    flush();
    await flushMicrotasks();

    const optionA = screen.getByRole('option', { name: 'a' });
    const optionC = screen.getByRole('option', { name: 'c' });
    expect(optionC).toHaveAttribute('aria-selected', 'true');
    expect(optionC).toHaveAttribute('data-selected');
    expect(optionA).not.toHaveAttribute('data-selected');
    expect(screen.getByTestId('value')).toHaveTextContent('c');

    setOpen(false);
    flush();
    await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null));

    setOpen(true);
    flush();
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'c' })).toHaveAttribute('data-highlighted'),
    );
    await waitFor(() => expect(screen.getByRole('option', { name: 'c' })).toHaveFocus());
    expect(screen.getByRole('option', { name: 'a' })).not.toHaveAttribute('data-highlighted');
  });

  it('applies a disabled change to an item while the popup is open', async () => {
    const [disabled, setDisabled] = createSignal(false);
    const [value, setValue] = createSignal<string | null>(null);

    const { user } = await render(() => (
      <Select.Root value={value()} onValueChange={setValue} defaultOpen>
        <Select.Trigger data-testid="trigger">
          <Select.Value data-testid="value" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner>
            <Select.Popup>
              <Select.Item value="a">a</Select.Item>
              <Select.Item value="b" disabled={disabled()}>
                b
              </Select.Item>
              <Select.Item value="c">c</Select.Item>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    ));

    const optionB = await screen.findByRole('option', { name: 'b' });
    expect(optionB).not.toHaveAttribute('data-disabled');

    setDisabled(true);
    flush();
    await flushMicrotasks();
    expect(optionB).toHaveAttribute('data-disabled');
    expect(optionB).toHaveAttribute('aria-disabled', 'true');

    await user.click(optionB);
    flush();
    await flushMicrotasks();
    expect(value()).toBe(null);
    expect(screen.getByRole('listbox')).toBeVisible();

    setDisabled(false);
    flush();
    await flushMicrotasks();
    expect(optionB).not.toHaveAttribute('data-disabled');

    await user.click(optionB);
    flush();
    await flushMicrotasks();
    expect(value()).toBe('b');
  });
});
