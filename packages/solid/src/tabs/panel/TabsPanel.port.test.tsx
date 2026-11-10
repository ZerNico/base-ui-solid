import { createSignal, flush } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { Tabs } from 'base-ui-solid/tabs';
import { createRenderer, fireEvent, screen } from '#test-utils';

// Port note: guards the hidden/inert switch and aria links of `keepMounted` panels.
describe('<Tabs.Panel /> (port)', () => {
  const { render } = createRenderer();

  it('hides the inactive keepMounted panel and keeps both linked to their tabs', async () => {
    const [value, setValue] = createSignal('one');

    await render(() => (
      <Tabs.Root value={value()} onValueChange={setValue}>
        <Tabs.List>
          <Tabs.Tab value="one">One</Tabs.Tab>
          <Tabs.Tab value="two">Two</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one" keepMounted data-testid="panel-one">
          Panel one
        </Tabs.Panel>
        <Tabs.Panel value="two" keepMounted data-testid="panel-two">
          Panel two
        </Tabs.Panel>
      </Tabs.Root>
    ));

    const one = screen.getByTestId('panel-one');
    const two = screen.getByTestId('panel-two');
    const tabOne = screen.getByRole('tab', { name: 'One' });
    const tabTwo = screen.getByRole('tab', { name: 'Two' });

    expect(one).not.toHaveAttribute('hidden');
    expect(one).not.toHaveAttribute('inert');
    expect(two).toHaveAttribute('hidden');
    expect(two).toHaveAttribute('inert');
    expect(tabOne).toHaveAttribute('aria-controls', one.id);
    expect(tabTwo).toHaveAttribute('aria-controls', two.id);

    fireEvent.click(tabTwo);
    flush();

    expect(screen.getByTestId('panel-one')).toBe(one);
    expect(screen.getByTestId('panel-two')).toBe(two);
    expect(one).toHaveAttribute('hidden');
    expect(one).toHaveAttribute('inert');
    expect(two).not.toHaveAttribute('hidden');
    expect(two).not.toHaveAttribute('inert');
    expect(two).toHaveAttribute('aria-labelledby', tabTwo.id);
  });
});
