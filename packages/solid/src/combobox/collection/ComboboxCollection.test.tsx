import { createSignal, flush } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { expect, describe, it } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { createRenderer, screen } from '#test-utils';

describe('<Combobox.Collection />', () => {
  const { render } = createRenderer();

  // Port note: port-specific coverage: function arity cannot detect numeric-index usage.
  it.each(['defaulted', 'rest'] as const)(
    'updates %s renderer indices after reordering and filtering (port regression)',
    async (kind) => {
      const [items, setItems] = createSignal(['apple', 'pear', 'plum']);
      const [filteredItems, setFilteredItems] = createSignal<string[] | undefined>();
      const renderItem = (item: string, index: number) => (
        <Combobox.Item value={item} index={index}>
          {item}:{index}
        </Combobox.Item>
      );
      const renderer: (item: string, index: number) => JSX.Element =
        kind === 'defaulted'
          ? (item, index = 0) => renderItem(item, index)
          : (...args: [string, number]) => renderItem(...args);
      await render(() => (
        <Combobox.Root items={items()} filteredItems={filteredItems()} defaultOpen>
          <Combobox.Input />
          <Combobox.List>
            <Combobox.Collection>{renderer}</Combobox.Collection>
          </Combobox.List>
        </Combobox.Root>
      ));
      setItems(['pear', 'apple', 'plum']);
      flush();
      expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
        'pear:0',
        'apple:1',
        'plum:2',
      ]);
      setFilteredItems(['pear', 'plum']);
      flush();
      expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
        'pear:0',
        'plum:1',
      ]);
      setFilteredItems(undefined);
      flush();
      setItems(['apple', 'plum']);
      flush();
      expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
        'apple:0',
        'plum:1',
      ]);
    },
  );

  it('renders filtered items', async () => {
    await render(() => (
      <Combobox.Root items={['alpha', 'beta', 'alpine']} defaultOpen>
        <Combobox.Input />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List>
                <Combobox.Collection>
                  {(item) => (
                    <Combobox.Item value={item} data-testid={`item-${item}`}>
                      {item}
                    </Combobox.Item>
                  )}
                </Combobox.Collection>
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));

    expect(screen.getByTestId('item-alpha')).not.toBe(null);
    expect(screen.getByTestId('item-beta')).not.toBe(null);
    expect(screen.getByTestId('item-alpine')).not.toBe(null);
  });

  it('renders nothing when a nested group does not provide items', async () => {
    await render(() => (
      <Combobox.Root defaultOpen>
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List>
                <Combobox.Group data-testid="group">
                  <Combobox.Collection>{(item) => <span>{item}</span>}</Combobox.Collection>
                </Combobox.Group>
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));

    expect(screen.getByTestId('group')).toBeEmptyDOMElement();
  });
});
