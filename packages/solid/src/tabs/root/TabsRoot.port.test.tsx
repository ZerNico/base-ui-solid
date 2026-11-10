import { createSignal, flush } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { Tabs } from 'base-ui-solid/tabs';
import { Portal } from '@solidjs/web';
import { createRenderer, fireEvent, flushMicrotasks, isJSDOM, screen, waitFor } from '#test-utils';

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
    });
    await waitFor(() => {
      const style = getComputedStyle(screen.getByTestId('indicator'));
      expect(parseFloat(style.getPropertyValue('--active-tab-width'))).toBe(50);
    });

    setValue('one');
    flush();
    await waitFor(() => {
      const style = getComputedStyle(screen.getByTestId('indicator'));
      expect(parseFloat(style.getPropertyValue('--active-tab-left'))).toBe(0);
    });
  });

  // Upstream covers this outside a shadow root. Focus is read through `activeElement`.
  it('keeps a shadow-root tab stop through an external selection change', async () => {
    const host = document.createElement('div');
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    shadowRoot.appendChild(container);
    document.body.appendChild(host);

    const [value, setValue] = createSignal('one');

    try {
      await render(() => (
        <Portal mount={container}>
          <Tabs.Root value={value()} onValueChange={setValue}>
            <Tabs.List>
              <Tabs.Tab value="one">One</Tabs.Tab>
              <Tabs.Tab value="two">Two</Tabs.Tab>
              <Tabs.Tab value="three">Three</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="one">Panel one</Tabs.Panel>
            <Tabs.Panel value="two">Panel two</Tabs.Panel>
            <Tabs.Panel value="three">Panel three</Tabs.Panel>
          </Tabs.Root>
        </Portal>
      ));

      const [one, two, three] = container.querySelectorAll<HTMLElement>('[role="tab"]');

      one.focus();
      await flushMicrotasks();
      expect(shadowRoot.activeElement).toBe(one);

      // An external selection change keeps focus and the tab stop on the focused tab.
      setValue('three');
      flush();
      await flushMicrotasks();
      expect(shadowRoot.activeElement).toBe(one);
      expect(three).toHaveAttribute('aria-selected', 'true');
      expect([one.tabIndex, two.tabIndex, three.tabIndex]).toEqual([0, -1, -1]);

      // Keyboard navigation continues from the focused tab, not the selected one.
      fireEvent.keyDown(one, { key: 'ArrowRight' });
      await flushMicrotasks();
      expect(shadowRoot.activeElement).toBe(two);
      expect([one.tabIndex, two.tabIndex, three.tabIndex]).toEqual([-1, 0, -1]);
    } finally {
      host.remove();
    }
  });
});
