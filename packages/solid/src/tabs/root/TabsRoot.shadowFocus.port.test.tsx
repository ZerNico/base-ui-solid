import { describe, expect, it } from 'vitest';
import { createSignal, flush } from 'solid-js';
import { Portal } from '@solidjs/web';
import { fireEvent, flushMicrotasks, render } from '#test-utils';
import { Tabs } from '..';

function visiblePanels(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('[role="tabpanel"]')].filter(
    (panel) => !panel.hasAttribute('hidden'),
  );
}

describe('<Tabs.Root /> focus ownership (port)', () => {
  it('keeps a shadow-root tab stop through external selection and continues keyboard navigation', async () => {
    const host = document.createElement('div');
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    shadowRoot.appendChild(container);
    document.body.appendChild(host);

    const [value, setValue] = createSignal('one');

    const { unmount } = await render(() => (
      <Portal mount={container}>
        <Tabs.Root value={value()} onValueChange={(next) => setValue(next as string)}>
          <Tabs.List aria-label="Shadow tabs">
            <Tabs.Tab value="one" data-testid="tab-one">
              One
            </Tabs.Tab>
            <Tabs.Tab value="two" data-testid="tab-two">
              Two
            </Tabs.Tab>
            <Tabs.Tab value="three" data-testid="tab-three">
              Three
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="one">one panel</Tabs.Panel>
          <Tabs.Panel value="two">two panel</Tabs.Panel>
          <Tabs.Panel value="three">three panel</Tabs.Panel>
        </Tabs.Root>
      </Portal>
    ));

    try {
      const one = container.querySelector<HTMLElement>('[data-testid="tab-one"]')!;
      const two = container.querySelector<HTMLElement>('[data-testid="tab-two"]')!;
      const three = container.querySelector<HTMLElement>('[data-testid="tab-three"]')!;

      one.focus();
      await flushMicrotasks();
      expect(shadowRoot.activeElement).toBe(one);
      expect(document.activeElement).toBe(host);
      expect([one.tabIndex, two.tabIndex, three.tabIndex]).toEqual([0, -1, -1]);

      // External selection must not steal focus or the roving stop from the shadow tree.
      setValue('three');
      flush();
      await flushMicrotasks();
      expect(shadowRoot.activeElement).toBe(one);
      expect(document.activeElement).toBe(host);
      expect(three).toHaveAttribute('aria-selected', 'true');
      expect([one.tabIndex, two.tabIndex, three.tabIndex]).toEqual([0, -1, -1]);
      expect(visiblePanels(container).map((panel) => panel.textContent)).toEqual(['three panel']);

      // Keyboard navigation continues from the focused tab, not the selected one.
      fireEvent.keyDown(one, { key: 'ArrowRight' });
      await flushMicrotasks();
      expect(shadowRoot.activeElement).toBe(two);
      expect([one.tabIndex, two.tabIndex, three.tabIndex]).toEqual([-1, 0, -1]);

      fireEvent.keyDown(two, { key: 'ArrowRight' });
      await flushMicrotasks();
      expect(shadowRoot.activeElement).toBe(three);
      expect([one.tabIndex, two.tabIndex, three.tabIndex]).toEqual([-1, -1, 0]);
    } finally {
      unmount();
      host.remove();
    }
  });

  it('leaves exactly one visible, linked panel after repeated visits', async () => {
    const [value, setValue] = createSignal('one');

    const { unmount } = await render(() => (
      <Tabs.Root value={value()} onValueChange={(next) => setValue(next as string)}>
        <Tabs.List aria-label="Repeated tabs">
          <Tabs.Tab value="one" data-testid="tab-one">
            One
          </Tabs.Tab>
          <Tabs.Tab value="two" data-testid="tab-two">
            Two
          </Tabs.Tab>
          <Tabs.Tab value="three" data-testid="tab-three">
            Three
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">one panel</Tabs.Panel>
        <Tabs.Panel value="two">two panel</Tabs.Panel>
        <Tabs.Panel value="three">three panel</Tabs.Panel>
      </Tabs.Root>
    ));

    try {
      for (const next of ['two', 'three', 'one', 'two', 'one'] as const) {
        setValue(next);
        flush();

        expect(visiblePanels(document)).toHaveLength(1);

        const [visible] = visiblePanels(document);
        expect(visible.textContent).toBe(`${next} panel`);

        const activeTab = document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')!;
        expect(activeTab).toHaveAttribute('aria-controls', visible.id);
        expect(visible).toHaveAttribute('aria-labelledby', activeTab.id);
        expect(activeTab.tabIndex).toBe(0);
      }
    } finally {
      unmount();
    }
  });
});
