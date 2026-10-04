import { createSignal, flush } from 'solid-js';

import { expect, describe, it } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { createRenderer, describeConformance, screen } from '#test-utils';
import { INITIAL_LIVE_REGION_TEXT_MUTATION_RESET_DELAY } from '../../internals/useInitialLiveRegionTextMutation';

describe('<Combobox.Empty />', () => {
  const { render } = createRenderer();
  describeConformance((props) => <Combobox.Empty {...props} />, {
    refInstanceof: window.HTMLDivElement,
    wrap(node) {
      return (
        <Combobox.Root defaultOpen>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                {node()}
                <Combobox.List />
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      );
    },
  });
  it('renders when there are no filtered items', async () => {
    await render(() => (
      <Combobox.Root items={[]} defaultOpen>
        <Combobox.Input />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.Empty data-testid="empty">No results</Combobox.Empty>
              <Combobox.List>
                {(item) => <Combobox.Item value={item}>{item}</Combobox.Item>}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));
    expect(screen.getByTestId('empty')).toHaveTextContent('No results');
    expect(screen.getByTestId('empty')).toHaveAttribute('role', 'status');
  });
  it('does not render when there are items', async () => {
    await render(() => (
      <Combobox.Root items={['a']} defaultOpen>
        <Combobox.Input />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.Empty>No results</Combobox.Empty>
              <Combobox.List>
                {(item) => <Combobox.Item value={item}>{item}</Combobox.Item>}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));
    expect(screen.queryByText(/No results/)).toBe(null);
  });
  it('renders when the search query matches no items', async () => {
    await render(() => (
      <Combobox.Root items={['a', 'b', 'c']} defaultInputValue="d" defaultOpen>
        <Combobox.Input />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.Empty data-testid="empty">No results</Combobox.Empty>
              <Combobox.List>
                {(item) => <Combobox.Item value={item}>{item}</Combobox.Item>}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));
    expect(screen.getByTestId('empty')).toHaveTextContent('No results');
  });
  it('does not render when the search query matches an item', async () => {
    await render(() => (
      <Combobox.Root items={['a', 'b', 'c']} defaultInputValue="c" defaultOpen>
        <Combobox.Input />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.Empty data-testid="empty">No results</Combobox.Empty>
              <Combobox.List>
                {(item) => <Combobox.Item value={item}>{item}</Combobox.Item>}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));
    expect(screen.queryByText(/No results/)).toBe(null);
  });
  describe('a11y', () => {
    const { render: renderFakeTimers, clock } = createRenderer();
    clock.withFakeTimers();
    it('removes the initial text mutation after the reset delay', async () => {
      await renderFakeTimers(() => (
        <Combobox.Root items={[]} defaultOpen>
          <Combobox.Input />
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.Empty data-testid="empty">No results</Combobox.Empty>
                <Combobox.List />
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      expect(screen.getByRole('status')).toBe(screen.getByTestId('empty'));
      expect(screen.getByTestId('empty').textContent).toBe('No results\u2060');
      clock.tick(INITIAL_LIVE_REGION_TEXT_MUTATION_RESET_DELAY);
      expect(screen.getByTestId('empty').textContent).toBe('No results');
    });
    it('updates the live region immediately when the empty content appears after mount', async () => {
      const [items, setItems] = createSignal<string[]>(['a']);
      await renderFakeTimers(() => (
        <Combobox.Root items={items()} defaultOpen>
          <Combobox.Input />
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.Empty data-testid="empty">No results</Combobox.Empty>
                <Combobox.List />
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      expect(screen.getByTestId('empty')).toHaveTextContent('');
      expect(screen.getByRole('status')).toBe(screen.getByTestId('empty'));
      setItems([]);
      flush();
      expect(screen.getByTestId('empty')).toHaveTextContent('No results');
    });
    it('preserves a custom render prop on the visible element', async () => {
      await renderFakeTimers(() => (
        <Combobox.Root items={[]} defaultOpen>
          <Combobox.Input />
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.Empty render={(props) => <p data-testid="custom-empty" {...props} />}>
                  No results
                </Combobox.Empty>
                <Combobox.List />
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      expect(screen.getByTestId('custom-empty').tagName).toBe('P');
      expect(screen.getByRole('status')).toBe(screen.getByTestId('custom-empty'));
      expect(screen.getByTestId('custom-empty').textContent).toBe('No results\u2060');
      clock.tick(INITIAL_LIVE_REGION_TEXT_MUTATION_RESET_DELAY);
      expect(screen.getByTestId('custom-empty').textContent).toBe('No results');
    });
  });
});
