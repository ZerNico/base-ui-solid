import { expect, describe, it } from 'vitest';
import { createSignal, flush } from 'solid-js';
import { Dialog } from 'base-ui-solid/dialog';
import { describeConformance, render, screen } from '#test-utils';

describe('<Dialog.Viewport />', () => {
  describeConformance(Dialog.Viewport, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Dialog.Root open modal={false}>
        <Dialog.Portal>
          {node()}
          <Dialog.Popup />
        </Dialog.Portal>
      </Dialog.Root>
    ),
  });

  it('renders only when the dialog is mounted by default', async () => {
    function App() {
      const [open, setOpen] = createSignal(false);
      return (
        <Dialog.Root open={open()} onOpenChange={setOpen} modal={false}>
          <Dialog.Trigger>Open</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Viewport data-testid="viewport">
              <Dialog.Popup data-testid="popup">Content</Dialog.Popup>
            </Dialog.Viewport>
          </Dialog.Portal>
        </Dialog.Root>
      );
    }

    const { user } = await render(() => <App />);

    expect(screen.queryByTestId('viewport')).toBe(null);

    await user.click(screen.getByText('Open'));

    expect(screen.getByTestId('viewport')).not.toBe(null);
    expect(screen.getByTestId('viewport')).toContain(screen.getByTestId('popup'));
  });

  it('stays mounted when used within a keepMounted portal', async () => {
    const [open, setOpen] = createSignal(true);
    await render(() => (
      <Dialog.Root open={open()} modal={false}>
        <Dialog.Portal keepMounted>
          <Dialog.Viewport data-testid="viewport">
            <Dialog.Popup>Content</Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    ));

    expect(screen.getByTestId('viewport')).not.toBe(null);

    setOpen(false);
    flush();

    expect(screen.getByTestId('viewport')).not.toBe(null);
  });
});
