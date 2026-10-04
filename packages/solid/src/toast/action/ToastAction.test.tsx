import { expect, describe, it } from 'vitest';
import { Toast } from 'base-ui-solid/toast';
import { createRenderer, describeConformance, screen } from '#test-utils';
import { List, Button } from '../utils/test-utils';

describe('<Toast.Action />', () => {
  const { render } = createRenderer();

  const toast: Toast.Root.ToastObject = {
    id: 'test',
    title: 'title',
  };

  describeConformance(
    (props: Toast.Action.Props) => <Toast.Action {...props}>action</Toast.Action>,
    {
      refInstanceof: window.HTMLButtonElement,
      wrap: (node) => (
        <Toast.Provider>
          <Toast.Viewport>
            <Toast.Root toast={toast}>{node()}</Toast.Root>
          </Toast.Viewport>
        </Toast.Provider>
      ),
    },
  );

  it('performs an action when clicked', async () => {
    const { user } = await render(() => (
      <Toast.Provider>
        <Toast.Viewport>
          <List />
        </Toast.Viewport>
        <Button />
      </Toast.Provider>
    ));

    const button = screen.getByRole('button', { name: 'add' });

    await user.click(button);

    expect(screen.getByTestId('action').id).toBe('action');
  });

  it('does not render if it has no children', async () => {
    function AddButton() {
      const { add } = Toast.useToastManager();
      return (
        <button
          type="button"
          onClick={() =>
            add({
              actionProps: {
                children: undefined,
              },
            })
          }
        >
          add
        </button>
      );
    }

    const { user } = await render(() => (
      <Toast.Provider>
        <Toast.Viewport>
          <List />
        </Toast.Viewport>
        <AddButton />
      </Toast.Provider>
    ));

    const button = screen.getByRole('button', { name: 'add' });
    await user.click(button);

    const actionElement = screen.queryByTestId('action');
    expect(actionElement).toBe(null);
  });

  // Port note: `render={<button>…</button>}` is a React element; render functions are used instead.
  it('renders content passed through the render prop', async () => {
    await render(() => (
      <Toast.Provider>
        <Toast.Viewport>
          <Toast.Root toast={toast}>
            <Toast.Action
              render={(props) => (
                <button {...props} type="button">
                  render prop action
                </button>
              )}
            />
          </Toast.Root>
        </Toast.Viewport>
      </Toast.Provider>
    ));

    expect(screen.getByText('render prop action')).not.toBe(null);
  });

  it('does not render a childless render prop when there is no action content', async () => {
    await render(() => (
      <Toast.Provider>
        <Toast.Viewport>
          <Toast.Root toast={toast}>
            <Toast.Action
              render={(props) => <button {...props} type="button" data-testid="action-render" />}
            />
          </Toast.Root>
        </Toast.Viewport>
      </Toast.Provider>
    ));

    expect(screen.queryByTestId('action-render')).toBe(null);
  });

  it('renders the toast action content through a childless render prop', async () => {
    await render(() => (
      <Toast.Provider>
        <Toast.Viewport>
          <Toast.Root toast={{ id: 'test', actionProps: { children: 'Undo' } }}>
            <Toast.Action render={(props) => <button {...props} type="button" />} />
          </Toast.Root>
        </Toast.Viewport>
      </Toast.Provider>
    ));

    expect(screen.getByText('Undo')).not.toBe(null);
  });
});
