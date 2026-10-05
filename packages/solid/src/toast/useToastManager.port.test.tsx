import { For } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { Toast } from 'base-ui-solid/toast';
import { createRenderer, screen, waitFor } from '#test-utils';

// Port-specific: Solid's `<For>` tracks items by reference unless it's keyed, so `toasts` keeps
// one object per toast for its lifetime (see `useToastManager`).
describe('useToastManager (port)', () => {
  const { render } = createRenderer();

  function Toasts() {
    const toastManager = Toast.useToastManager();
    return (
      <For each={toastManager.toasts}>
        {(toast) => (
          <Toast.Root toast={toast} data-testid="root">
            <Toast.Title data-testid="title" />
          </Toast.Root>
        )}
      </For>
    );
  }

  function Controls() {
    const toastManager = Toast.useToastManager();
    return (
      <>
        <button type="button" onClick={() => toastManager.add({ id: 'a', title: 'first' })}>
          add
        </button>
        <button type="button" onClick={() => toastManager.update('a', { title: 'second' })}>
          update
        </button>
      </>
    );
  }

  it('keeps a toast mounted across updates in an unkeyed list', async () => {
    const { user } = await render(() => (
      <Toast.Provider>
        <Controls />
        <Toast.Viewport>
          <Toasts />
        </Toast.Viewport>
      </Toast.Provider>
    ));

    await user.click(screen.getByRole('button', { name: 'add' }));
    await waitFor(() => expect(screen.getByTestId('title')).toHaveTextContent('first'));
    const root = screen.getByTestId('root');

    await user.click(screen.getByRole('button', { name: 'update' }));
    await waitFor(() => expect(screen.getByTestId('title')).toHaveTextContent('second'));

    expect(screen.getByTestId('root')).toBe(root);
    expect(screen.getAllByTestId('root')).toHaveLength(1);
  });

  it('keeps the same toast object across updates', async () => {
    let read: () => object[] = () => [];
    function Capture() {
      const toastManager = Toast.useToastManager();
      read = () => toastManager.toasts;
      return null;
    }
    const { user } = await render(() => (
      <Toast.Provider>
        <Controls />
        <Capture />
      </Toast.Provider>
    ));

    await user.click(screen.getByRole('button', { name: 'add' }));
    const before = read()[0];
    await user.click(screen.getByRole('button', { name: 'update' }));
    const after = read()[0];

    expect(after).toBe(before);
    expect(after).toMatchObject({ id: 'a', title: 'second' });
  });
});
