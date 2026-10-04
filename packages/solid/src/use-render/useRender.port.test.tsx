import { createSignal, flush } from 'solid-js';
import { it, expect, vi } from 'vitest';
import { render, screen, flushMicrotasks } from '#test-utils';
import { useRender } from './useRender';

// Port note: regressions for reactive Solid props and owner lifecycle, absent upstream.
it('reconciles replacement parameter refs without recreating the element', async () => {
  const first = vi.fn();
  const second = vi.fn();
  const [ref, setRef] = createSignal({ callback: first });
  function App() {
    return useRender({
      get ref() {
        return ref().callback;
      },
      props: { 'data-testid': 'node' },
    });
  }
  const { unmount } = await render(() => <App />);
  const node = screen.getByTestId('node');
  expect(first).toHaveBeenCalledWith(node);
  setRef({ callback: second });
  flush();
  await flushMicrotasks();
  expect(first).toHaveBeenLastCalledWith(null);
  expect(second).toHaveBeenLastCalledWith(node);
  expect(screen.getByTestId('node')).toBe(node);
  unmount();
  expect(second).toHaveBeenLastCalledWith(null);
});
