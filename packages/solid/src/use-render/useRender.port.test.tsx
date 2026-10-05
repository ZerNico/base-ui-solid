import { createSignal, flush } from 'solid-js';
import { it, expect, vi } from 'vitest';
import { render, screen, flushMicrotasks } from '#test-utils';
import { Button } from 'base-ui-solid/button';
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

it('reports a clear error in development when `render` receives an element', async () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    function App() {
      return useRender({
        // Solid creates the element right away, so it can't be cloned like upstream's.
        render: (<a href="#a" data-testid="anchor" />) as any,
        props: { 'data-testid': 'node' },
      });
    }
    function Part() {
      return <Button render={(<a href="#b" />) as any} data-testid="button" />;
    }
    await render(() => (
      <div>
        <App />
        <Part />
      </div>
    ));
    expect(screen.queryByTestId('node')).toBe(null);
    expect(screen.queryByTestId('button')).toBe(null);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Pass a render function that spreads the props instead'),
    );
  } finally {
    spy.mockRestore();
  }
});
