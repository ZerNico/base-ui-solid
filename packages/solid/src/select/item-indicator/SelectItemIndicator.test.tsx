import { expect, describe, it } from 'vitest';
import { createSignal, flush } from 'solid-js';
import { Select } from 'base-ui-solid/select';
import { describeConformance, render, screen, waitFor } from '#test-utils';

describe('<Select.ItemIndicator />', () => {
  // Port note: upstream re-renders `TestComponent` through `setProps`; the props are signals here.
  async function renderTestComponent(initialProps: { value: string; keepMounted?: boolean }) {
    const [value, setValue] = createSignal(initialProps.value);
    const view = await render(() => (
      <Select.Root value={value()} open>
        <Select.Trigger />
        <Select.Positioner>
          <Select.Popup>
            <Select.Item value="a">
              a
              <Select.ItemIndicator
                keepMounted={initialProps.keepMounted}
                data-testid="indicator"
              />
            </Select.Item>
            <Select.Item value="b">b</Select.Item>
          </Select.Popup>
        </Select.Positioner>
      </Select.Root>
    ));

    return {
      ...view,
      async setProps(props: { value: string }) {
        setValue(props.value);
        flush();
      },
    };
  }

  describeConformance(Select.ItemIndicator, {
    refInstanceof: window.HTMLSpanElement,
    wrap: (node) => (
      <Select.Root open>
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Positioner>
          <Select.Item>{node()}</Select.Item>
        </Select.Positioner>
      </Select.Root>
    ),
  });

  it('settles out of its transition state after the item is deselected', async () => {
    const { user } = await render(() => (
      <Select.Root multiple defaultOpen defaultValue={['a']}>
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner>
            <Select.Popup>
              <Select.Item value="a">
                a
                <Select.ItemIndicator keepMounted data-testid="indicator" />
              </Select.Item>
              <Select.Item value="b">b</Select.Item>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    ));

    const indicator = screen.getByTestId('indicator');
    expect(indicator).toHaveAttribute('data-selected');

    await user.click(screen.getByRole('option', { name: 'a' }));

    await waitFor(() => {
      expect(indicator).not.toHaveAttribute('data-selected');
    });

    // A kept-mounted indicator must not be left advertising an exit transition once the
    // deselection has finished, or `[data-ending-style]` CSS would stick permanently.
    await waitFor(() => {
      expect(indicator).not.toHaveAttribute('data-ending-style');
    });
  });

  it('mounts only while selected when keepMounted is false', async () => {
    const { setProps } = await renderTestComponent({ value: 'b' });

    expect(screen.queryByTestId('indicator')).toBe(null);

    await setProps({ value: 'a' });

    const indicator = screen.getByTestId('indicator');
    expect(indicator).toHaveAttribute('data-selected');
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
    expect(indicator).not.toHaveAttribute('selected');

    await setProps({ value: 'b' });

    expect(screen.queryByTestId('indicator')).toBe(null);

    await setProps({ value: 'a' });

    expect(screen.getByTestId('indicator')).toHaveAttribute('data-selected');
  });

  it('preserves the kept-mounted element across selection changes', async () => {
    const { setProps } = await renderTestComponent({ value: 'b', keepMounted: true });
    const indicator = screen.getByTestId('indicator');

    expect(indicator).not.toHaveAttribute('data-selected');

    await setProps({ value: 'a' });

    expect(screen.getByTestId('indicator')).toBe(indicator);
    expect(indicator).toHaveAttribute('data-selected');

    await setProps({ value: 'b' });

    expect(screen.getByTestId('indicator')).toBe(indicator);
    expect(indicator).not.toHaveAttribute('data-selected');
    await waitFor(() => {
      expect(indicator).not.toHaveAttribute('data-ending-style');
    });

    await setProps({ value: 'a' });

    expect(screen.getByTestId('indicator')).toBe(indicator);
    expect(indicator).toHaveAttribute('data-selected');
  });
});
