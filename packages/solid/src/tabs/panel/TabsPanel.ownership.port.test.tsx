import { createSignal, flush } from 'solid-js';
import { expect, it } from 'vitest';
import { Tabs } from 'base-ui-solid/tabs';
import { fireEvent, flushMicrotasks, render, screen } from '#test-utils';

// Port note: guards the upstream contracts that keep a panel's custom render, ref and
// keepMounted registration aligned with the selected tab and its aria links.
it('forwards custom panel refs, state and aria links while keepMounted panels stay registered', async () => {
  const [value, setValue] = createSignal('one');
  const panelRefs = new Map<string, HTMLElement>();

  await render(() => (
    <Tabs.Root value={value()} onValueChange={(next) => setValue(next as string)}>
      <Tabs.List aria-label="Ownership tabs">
        <Tabs.Tab value="one">One</Tabs.Tab>
        <Tabs.Tab value="two">Two</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel
        value="one"
        keepMounted
        data-testid="panel-one"
        ref={(element) => {
          if (element) {
            panelRefs.set('one', element);
          }
        }}
        render={(props) => <section {...props} data-custom-panel />}
      >
        First panel
      </Tabs.Panel>
      <Tabs.Panel
        value="two"
        keepMounted
        data-testid="panel-two"
        ref={(element) => {
          if (element) {
            panelRefs.set('two', element);
          }
        }}
        render={(props) => <section {...props} data-custom-panel />}
      >
        Second panel
      </Tabs.Panel>
    </Tabs.Root>
  ));

  const panels = () => screen.getAllByRole('tabpanel', { hidden: true });
  const visiblePanels = () => panels().filter((panel) => !panel.hasAttribute('hidden'));

  expect(panels()).toHaveLength(2);
  expect(visiblePanels().map((panel) => panel.textContent)).toEqual(['First panel']);

  const one = screen.getByTestId('panel-one');
  const two = screen.getByTestId('panel-two');
  const tabOne = screen.getByRole('tab', { name: 'One' });
  const tabTwo = screen.getByRole('tab', { name: 'Two' });

  expect(one.tagName).toBe('SECTION');
  expect(two.tagName).toBe('SECTION');
  expect(one).toHaveAttribute('data-custom-panel');
  expect(two).toHaveAttribute('data-custom-panel');
  expect(one).toHaveAttribute('data-orientation', 'horizontal');
  expect(two).toHaveAttribute('data-orientation', 'horizontal');
  expect(one).toHaveTextContent('First panel');
  expect(two).toHaveTextContent('Second panel');
  expect(panelRefs.get('one')).toBe(one);
  expect(panelRefs.get('two')).toBe(two);

  expect(one).not.toHaveAttribute('hidden');
  expect(one).not.toHaveAttribute('inert');
  expect(two).toHaveAttribute('hidden');
  expect(two).toHaveAttribute('inert');
  expect(tabOne).toHaveAttribute('aria-controls', one.id);
  expect(one).toHaveAttribute('aria-labelledby', tabOne.id);
  expect(tabTwo).toHaveAttribute('aria-controls', two.id);
  expect(two).toHaveAttribute('aria-labelledby', tabTwo.id);

  fireEvent.click(tabTwo);
  flush();
  await flushMicrotasks();

  expect(panels()).toHaveLength(2);
  expect(visiblePanels().map((panel) => panel.textContent)).toEqual(['Second panel']);
  expect(one).toHaveAttribute('hidden');
  expect(one).toHaveAttribute('inert');
  expect(two).not.toHaveAttribute('hidden');
  expect(two).not.toHaveAttribute('inert');
  expect(panelRefs.get('one')).toBe(one);
  expect(panelRefs.get('two')).toBe(two);
  expect(tabTwo).toHaveAttribute('aria-controls', two.id);
  expect(two).toHaveAttribute('aria-labelledby', tabTwo.id);
});
