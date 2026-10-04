import { createSignal, flush } from 'solid-js';

import { describe, it, expect } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { createRenderer, describeConformance, screen, waitFor } from '#test-utils';

describe('<Combobox.ItemIndicator />', () => {
  const { render } = createRenderer();
  function TestComponent(props: { value: string; keepMounted?: boolean }) {
    return (
      <Combobox.Root value={props.value} open>
        <Combobox.Input />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List>
                <Combobox.Item value="a">
                  a
                  <Combobox.ItemIndicator keepMounted={props.keepMounted} data-testid="indicator" />
                </Combobox.Item>
                <Combobox.Item value="b">b</Combobox.Item>
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    );
  }
  describeConformance((props) => <Combobox.ItemIndicator keepMounted {...props} />, {
    refInstanceof: window.HTMLSpanElement,
    wrap(node) {
      return (
        <Combobox.Root>
          <Combobox.Item>{node()}</Combobox.Item>
        </Combobox.Root>
      );
    },
  });
  it('updates a mounted indicator when its item becomes unselected', async () => {
    const { user } = await render(() => (
      <Combobox.Root defaultOpen defaultValue="apple">
        <Combobox.Input />
        <Combobox.Portal keepMounted>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List>
                <Combobox.Item value="apple">
                  apple
                  <Combobox.ItemIndicator keepMounted data-testid="apple-indicator" />
                </Combobox.Item>
                <Combobox.Item value="banana">banana</Combobox.Item>
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));
    expect(screen.getByTestId('apple-indicator')).toHaveAttribute('data-selected');
    await user.click(screen.getByRole('option', { name: 'banana' }));
    expect(screen.getByTestId('apple-indicator')).not.toHaveAttribute('data-selected');
  });
  it('mounts only while selected when keepMounted is false', async () => {
    const [value, setValue] = createSignal('b');
    await render(() => <TestComponent value={value()} />);
    expect(screen.queryByTestId('indicator')).toBe(null);
    setValue('a');
    flush();
    const indicator = screen.getByTestId('indicator');
    expect(indicator).toHaveAttribute('data-selected');
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
    expect(indicator).not.toHaveAttribute('selected');
    setValue('b');
    flush();
    expect(screen.queryByTestId('indicator')).toBe(null);
    setValue('a');
    flush();
    expect(screen.getByTestId('indicator')).toHaveAttribute('data-selected');
  });
  it('preserves the kept-mounted element across selection changes', async () => {
    const [value, setValue] = createSignal('b');
    await render(() => <TestComponent value={value()} keepMounted />);
    const indicator = screen.getByTestId('indicator');
    expect(indicator).not.toHaveAttribute('data-selected');
    setValue('a');
    flush();
    expect(screen.getByTestId('indicator')).toBe(indicator);
    expect(indicator).toHaveAttribute('data-selected');
    setValue('b');
    flush();
    expect(screen.getByTestId('indicator')).toBe(indicator);
    expect(indicator).not.toHaveAttribute('data-selected');
    await waitFor(() => {
      expect(indicator).not.toHaveAttribute('data-ending-style');
    });
    setValue('a');
    flush();
    expect(screen.getByTestId('indicator')).toBe(indicator);
    expect(indicator).toHaveAttribute('data-selected');
  });
});
