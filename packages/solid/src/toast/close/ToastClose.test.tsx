import { flush } from 'solid-js';
import { expect, describe, it } from 'vitest';
import { Toast } from 'base-ui-solid/toast';
import { createRenderer, describeConformance, screen } from '#test-utils';
import { List, Button } from '../utils/test-utils';

describe('<Toast.Close />', () => {
  const { render } = createRenderer();

  const toast: Toast.Root.ToastObject = {
    id: 'test',
    title: 'title',
  };

  describeConformance(Toast.Close, {
    refInstanceof: window.HTMLButtonElement,
    wrap: (node) => (
      <Toast.Provider>
        <Toast.Viewport>
          <Toast.Root toast={toast}>{node()}</Toast.Root>
        </Toast.Viewport>
      </Toast.Provider>
    ),
  });

  it('closes the toast when clicked', async () => {
    const { user } = await render(() => (
      <Toast.Provider>
        <Toast.Viewport data-testid="viewport">
          <List />
        </Toast.Viewport>
        <Button />
      </Toast.Provider>
    ));

    const button = screen.getByRole('button', { name: 'add' });
    const viewport = screen.getByTestId('viewport');

    await user.click(button);

    expect(screen.getByTestId('title')).not.toBe(null);

    viewport.focus();
    flush();

    const closeButton = screen.getByRole('button', { name: 'close-press' });

    await user.click(closeButton);

    expect(screen.queryByTestId('title')).toBe(null);
  });
});
