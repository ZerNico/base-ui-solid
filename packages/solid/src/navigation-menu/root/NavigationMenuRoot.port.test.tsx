import { createSignal, flush, Show } from 'solid-js';
import { it, expect } from 'vitest';
import { render, flushMicrotasks } from '#test-utils';
import { NavigationMenu } from '..';

// Port note: regressions for reactive Solid props and owner lifecycle, absent upstream.
it('detaches actionsRef on replacement and disposal', async () => {
  const first = { current: null as NavigationMenu.Root.Actions | null };
  const second = { current: null as NavigationMenu.Root.Actions | null };
  const [ref, setRef] = createSignal(first);
  const [visible, setVisible] = createSignal(true);
  await render(() => (
    <Show when={visible()}>
      <NavigationMenu.Root actionsRef={ref()} />
    </Show>
  ));
  const handle = first.current;
  expect(handle).not.toBeNull();
  setRef(second);
  flush();
  await flushMicrotasks();
  expect(first.current).toBeNull();
  expect(second.current).toBe(handle);
  setVisible(false);
  flush();
  await flushMicrotasks();
  expect(second.current).toBeNull();
});
