import { createMemo, createSignal, flush } from 'solid-js';
import type { Accessor } from 'solid-js';
import { expect, describe, it, vi } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { Autocomplete } from 'base-ui-solid/autocomplete';
import { createRenderer, screen } from '#test-utils';

// Port note: regressions for the Solid renderer contract, absent upstream. Renderers are called
// once per item with the item and its index as accessors, and rows are keyed by logical identity.
describe('<Combobox.Collection /> (port)', () => {
  const { render } = createRenderer();

  function optionTexts() {
    return screen.getAllByRole('option').map((option) => option.textContent);
  }

  it('calls the renderer once per item and updates the index accessor on reorder and filter', async () => {
    const [items, setItems] = createSignal(['apple', 'pear', 'plum']);
    const [filteredItems, setFilteredItems] = createSignal<string[] | undefined>();
    const renderer = vi.fn((item: Accessor<string>, index: Accessor<number>) => (
      <Combobox.Item value={item()} index={index()}>
        {item()}:{index()}
      </Combobox.Item>
    ));
    await render(() => (
      <Combobox.Root items={items()} filteredItems={filteredItems()} defaultOpen>
        <Combobox.Input />
        <Combobox.List>
          <Combobox.Collection>{renderer}</Combobox.Collection>
        </Combobox.List>
      </Combobox.Root>
    ));
    expect(renderer).toHaveBeenCalledTimes(3);
    const pear = screen.getByRole('option', { name: 'pear:1' });

    setItems(['pear', 'apple', 'plum']);
    flush();
    expect(optionTexts()).toEqual(['pear:0', 'apple:1', 'plum:2']);
    setFilteredItems(['pear', 'plum']);
    flush();
    expect(optionTexts()).toEqual(['pear:0', 'plum:1']);
    setFilteredItems(undefined);
    flush();
    expect(optionTexts()).toEqual(['pear:0', 'apple:1', 'plum:2']);

    // `apple` was filtered out and back in, so it's the only row created twice.
    expect(renderer).toHaveBeenCalledTimes(4);
    expect(screen.getByRole('option', { name: 'pear:0' })).toBe(pear);
  });

  it('keeps rows mounted when a memo rebuilds object items with the same values', async () => {
    const [suffix, setSuffix] = createSignal('');
    const renderer = vi.fn((item: Accessor<{ value: string; label: string }>) => (
      <Combobox.Item value={item()}>{item().label}</Combobox.Item>
    ));
    function App() {
      const items = createMemo(() =>
        ['a', 'b'].map((value) => ({ value, label: `${value.toUpperCase()}${suffix()}` })),
      );
      return (
        <Combobox.Root items={items()} defaultOpen>
          <Combobox.Input />
          <Combobox.List>{renderer}</Combobox.List>
        </Combobox.Root>
      );
    }
    await render(() => <App />);
    const first = screen.getByRole('option', { name: 'A' });
    expect(renderer).toHaveBeenCalledTimes(2);

    setSuffix('!');
    flush();

    expect(optionTexts()).toEqual(['A!', 'B!']);
    expect(screen.getByRole('option', { name: 'A!' })).toBe(first);
    expect(renderer).toHaveBeenCalledTimes(2);
  });

  it('keys object items by itemToStringValue when provided', async () => {
    const [version, setVersion] = createSignal(1);
    const renderer = vi.fn((item: Accessor<{ id: string; name: string }>) => (
      <Combobox.Item value={item()}>{item().name}</Combobox.Item>
    ));
    function App() {
      const items = createMemo(() => [
        { id: 'x', name: `X${version()}` },
        { id: 'y', name: `Y${version()}` },
      ]);
      return (
        <Combobox.Root
          items={items()}
          itemToStringValue={(item: { id: string; name: string }) => item.id}
          itemToStringLabel={(item: { id: string; name: string }) => item.name}
          defaultOpen
        >
          <Combobox.Input />
          <Combobox.List>{renderer}</Combobox.List>
        </Combobox.Root>
      );
    }
    await render(() => <App />);
    const first = screen.getByRole('option', { name: 'X1' });

    setVersion(2);
    flush();

    expect(optionTexts()).toEqual(['X2', 'Y2']);
    expect(screen.getByRole('option', { name: 'X2' })).toBe(first);
    expect(renderer).toHaveBeenCalledTimes(2);
  });

  it('keeps grouped rows mounted when a memo rebuilds the groups', async () => {
    const [suffix, setSuffix] = createSignal('');
    const itemRenderer = vi.fn((item: Accessor<{ value: string; label: string }>) => (
      <Combobox.Item value={item()}>{item().label}</Combobox.Item>
    ));
    function App() {
      const groups = createMemo(() => [
        {
          value: 'fruits',
          items: ['apple', 'pear'].map((value) => ({ value, label: `${value}${suffix()}` })),
        },
      ]);
      return (
        <Combobox.Root items={groups()} defaultOpen>
          <Combobox.Input />
          <Combobox.List>
            {(group: Accessor<{ value: string; items: { value: string; label: string }[] }>) => (
              <Combobox.Group items={group().items}>
                <Combobox.GroupLabel>{group().value}</Combobox.GroupLabel>
                <Combobox.Collection>{itemRenderer}</Combobox.Collection>
              </Combobox.Group>
            )}
          </Combobox.List>
        </Combobox.Root>
      );
    }
    await render(() => <App />);
    const apple = screen.getByRole('option', { name: 'apple' });

    setSuffix('?');
    flush();

    expect(optionTexts()).toEqual(['apple?', 'pear?']);
    expect(screen.getByRole('option', { name: 'apple?' })).toBe(apple);
    expect(itemRenderer).toHaveBeenCalledTimes(2);
  });

  it('does not remount items while typing filters the list', async () => {
    const renderer = vi.fn((item: Accessor<string>) => (
      <Autocomplete.Item value={item()}>{item()}</Autocomplete.Item>
    ));
    const { user } = await render(() => (
      <Autocomplete.Root items={['alpha', 'alpine', 'beta']} defaultOpen>
        <Autocomplete.Input data-testid="input" />
        <Autocomplete.List>{renderer}</Autocomplete.List>
      </Autocomplete.Root>
    ));
    const alpha = screen.getByRole('option', { name: 'alpha' });

    await user.type(screen.getByTestId('input'), 'alp');
    expect(optionTexts()).toEqual(['alpha', 'alpine']);
    await user.clear(screen.getByTestId('input'));
    expect(optionTexts()).toEqual(['alpha', 'alpine', 'beta']);

    expect(screen.getByRole('option', { name: 'alpha' })).toBe(alpha);
    // `beta` is filtered out and back in, so it's the only row created twice.
    expect(renderer).toHaveBeenCalledTimes(4);
  });
});
