import { expect, vi, describe, it } from 'vitest';
import { Dialog } from 'base-ui-solid/dialog';
import { describeConformance, render, screen } from '#test-utils';

describe('<Dialog.Trigger />', () => {
  describeConformance(Dialog.Trigger, {
    refInstanceof: window.HTMLButtonElement,
    wrap: (node) => (
      <Dialog.Root open modal={false}>
        {node()}
      </Dialog.Root>
    ),
  });

  it('throws a descriptive error without a root or handle', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Port note: Solid may report the error that `render` rejects with once more as an uncaught
    // error (through `window`'s `error` event). Swallow that duplicate report only.
    const handleWindowError = (event: ErrorEvent) => {
      if (event.message.includes('<Dialog.Trigger> must be used within')) {
        event.preventDefault();
      }
    };
    window.addEventListener('error', handleWindowError);

    try {
      await expect(render(() => <Dialog.Trigger />)).rejects.toThrow(
        'Base UI: <Dialog.Trigger> must be used within <Dialog.Root> or provided with a handle.',
      );
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
    } finally {
      window.removeEventListener('error', handleWindowError);
      errorSpy.mockRestore();
    }
  });

  describe('prop: disabled', () => {
    it('disables the dialog', async () => {
      const { user } = await render(() => (
        <Dialog.Root modal={false}>
          <Dialog.Trigger disabled />
          <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Popup>
              <Dialog.Title>title text</Dialog.Title>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      ));

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('disabled');
      expect(trigger).toHaveAttribute('data-disabled');

      await user.click(trigger);
      expect(screen.queryByText('title text')).toBe(null);

      await user.keyboard('[Tab]');
      expect(document.activeElement).not.toBe(trigger);
    });

    it('custom element', async () => {
      // Port note: `render={<span />}` is a React element; a tag name is used instead.
      const { user } = await render(() => (
        <Dialog.Root modal={false}>
          <Dialog.Trigger disabled render="span" nativeButton={false} />
          <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Popup>
              <Dialog.Title>title text</Dialog.Title>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      ));

      const trigger = screen.getByRole('button');
      expect(trigger).not.toHaveAttribute('disabled');
      expect(trigger).toHaveAttribute('data-disabled');
      expect(trigger).toHaveAttribute('aria-disabled', 'true');

      await user.click(trigger);
      expect(screen.queryByText('title text')).toBe(null);

      await user.keyboard('[Tab]');
      expect(document.activeElement).not.toBe(trigger);
    });
  });
});
