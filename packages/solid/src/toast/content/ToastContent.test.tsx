import { createSignal, flush, For } from 'solid-js';
import { expect, describe, it } from 'vitest';
import { Toast } from 'base-ui-solid/toast';
import { createRenderer, describeConformance, fireEvent, screen } from '#test-utils';

const toast = {
  id: 'test',
  title: 'Toast title',
};

describe('<Toast.Content />', () => {
  const { render } = createRenderer();

  describeConformance(Toast.Content, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Toast.Provider>
        <Toast.Viewport>
          <Toast.Root toast={toast}>{node()}</Toast.Root>
        </Toast.Viewport>
      </Toast.Provider>
    ),
  });

  function App() {
    const toastManager = Toast.useToastManager();
    const [count, setCount] = createSignal(0);
    return (
      <>
        <button
          type="button"
          onClick={() => {
            const next = count() + 1;
            setCount(next);
            toastManager.add({ title: `toast-${next}` });
          }}
        >
          add
        </button>
        <Toast.Viewport data-testid="viewport">
          <For each={toastManager.toasts} keyed={(toastItem) => toastItem.id}>
            {(toastItem) => (
              <Toast.Root toast={toastItem()}>
                <Toast.Content data-testid={`content-${toastItem().title}`}>
                  <Toast.Title />
                </Toast.Content>
              </Toast.Root>
            )}
          </For>
        </Toast.Viewport>
      </>
    );
  }

  it('marks content behind the frontmost toast with data-behind', async () => {
    await render(() => (
      <Toast.Provider>
        <App />
      </Toast.Provider>
    ));

    // Port note: `fireEvent` doesn't flush Solid, so flush after each click (React re-renders
    // between the events).
    const addButton = screen.getByRole('button', { name: 'add' });
    fireEvent.click(addButton);
    flush();
    fireEvent.click(addButton);
    flush();

    // The newest toast is at the front; the older one sits behind it.
    expect(screen.getByTestId('content-toast-2')).not.toHaveAttribute('data-behind');
    expect(screen.getByTestId('content-toast-1')).toHaveAttribute('data-behind');
  });

  it('reflects the expanded state when the viewport is hovered', async () => {
    await render(() => (
      <Toast.Provider>
        <App />
      </Toast.Provider>
    ));

    fireEvent.click(screen.getByRole('button', { name: 'add' }));
    flush();

    const content = screen.getByTestId('content-toast-1');
    expect(content).not.toHaveAttribute('data-expanded');

    fireEvent.mouseEnter(screen.getByTestId('viewport'));
    flush();
    expect(content).toHaveAttribute('data-expanded');
  });
});
