import { createSignal, flush } from 'solid-js';
import type { Accessor } from 'solid-js';
import { expect, describe, it } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { createRenderer, screen, waitFor } from '#test-utils';

// Port note: regressions for reactive Solid props, absent upstream.
describe('<Combobox.List /> (port)', () => {
  const { render } = createRenderer();

  it('switches the list structure when `virtualized` changes', async () => {
    const [virtualized, setVirtualized] = createSignal(false);
    const { user } = await render(() => (
      <Combobox.Root items={['apple', 'banana', 'cherry']} virtualized={virtualized()} defaultOpen>
        <Combobox.Input data-testid="input" />
        <Combobox.List data-testid="list">
          {(item: Accessor<string>, index: Accessor<number>) => (
            <Combobox.Item value={item()} index={index()}>
              {item()}
            </Combobox.Item>
          )}
        </Combobox.List>
      </Combobox.Root>
    ));
    const initialList = screen.getByTestId('list');

    setVirtualized(true);
    flush();

    // Like upstream, the list element is recreated when it moves out of the composite list.
    const virtualizedList = screen.getByTestId('list');
    expect(virtualizedList).not.toBe(initialList);
    expect(virtualizedList.isConnected).toBe(true);

    const input = screen.getByTestId('input');
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'apple' })).toHaveAttribute('data-highlighted');
    });
    expect(input).toHaveAttribute('aria-controls', virtualizedList.id);

    setVirtualized(false);
    flush();

    const list = screen.getByTestId('list');
    expect(list).not.toBe(virtualizedList);
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(
        screen.getAllByRole('option').some((option) => option.hasAttribute('data-highlighted')),
      ).toBe(true);
    });
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(input).not.toHaveValue('');
    });
  });
});
