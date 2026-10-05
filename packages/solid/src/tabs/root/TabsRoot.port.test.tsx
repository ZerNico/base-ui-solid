import { createSignal, flush } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { Tabs } from 'base-ui-solid/tabs';
import { createRenderer, flushMicrotasks, isJSDOM, screen, waitFor } from '#test-utils';

// Port note: guards the settled DOM after a controlled value change.
describe('<Tabs.Root /> (port)', () => {
  const { render } = createRenderer();

  const tabStyle = { display: 'inline-block', width: '50px', padding: '0', border: '0' };

  function renderTabs(value: () => string, setValue: (value: string) => void) {
    return render(() => (
      <Tabs.Root value={value()} onValueChange={setValue}>
        <Tabs.List style={{ display: 'flex', position: 'relative' }}>
          <Tabs.Tab value="one" style={tabStyle}>
            One
          </Tabs.Tab>
          <Tabs.Tab value="two" style={tabStyle}>
            Two
          </Tabs.Tab>
          <Tabs.Indicator data-testid="indicator" />
        </Tabs.List>
        <Tabs.Panel value="one" data-testid="panel-one">
          Panel one
        </Tabs.Panel>
        <Tabs.Panel value="two" data-testid="panel-two">
          Panel two
        </Tabs.Panel>
      </Tabs.Root>
    ));
  }

  it('moves the panel when the controlled value changes', async () => {
    const [value, setValue] = createSignal('one');
    await renderTabs(value, setValue);

    const tabOne = screen.getByRole('tab', { name: 'One' });
    const tabTwo = screen.getByRole('tab', { name: 'Two' });

    await waitFor(() => expect(screen.getByTestId('panel-one')).not.toHaveAttribute('hidden'));
    expect(tabOne).toHaveAttribute('aria-selected', 'true');

    setValue('two');
    flush();
    await flushMicrotasks();

    expect(tabTwo).toHaveAttribute('aria-selected', 'true');
    expect(tabTwo).toHaveAttribute('data-active');
    expect(tabOne).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('panel-two')).not.toHaveAttribute('hidden');
    expect(screen.queryByTestId('panel-one')).toBe(null);
    expect(screen.getByTestId('panel-two')).toHaveAttribute('aria-labelledby', tabTwo.id);
  });

  it.skipIf(isJSDOM)('moves the indicator when the controlled value changes', async () => {
    const [value, setValue] = createSignal('one');
    await renderTabs(value, setValue);

    await waitFor(() => {
      const style = getComputedStyle(screen.getByTestId('indicator'));
      expect(parseFloat(style.getPropertyValue('--active-tab-left'))).toBe(0);
    });

    setValue('two');
    flush();
    await waitFor(() => {
      const style = getComputedStyle(screen.getByTestId('indicator'));
      expect(parseFloat(style.getPropertyValue('--active-tab-left'))).toBe(50);
      expect(parseFloat(style.getPropertyValue('--active-tab-width'))).toBe(50);
    });

    setValue('one');
    flush();
    await waitFor(() => {
      const style = getComputedStyle(screen.getByTestId('indicator'));
      expect(parseFloat(style.getPropertyValue('--active-tab-left'))).toBe(0);
    });
  });
});
