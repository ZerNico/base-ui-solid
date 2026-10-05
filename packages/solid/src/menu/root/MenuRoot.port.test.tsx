import { createSignal, flush } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { Menu } from 'base-ui-solid/menu';
import { createRenderer, flushMicrotasks, screen, waitFor } from '#test-utils';

// Port note: controlled props reach the store one update after the prop (see PORTING.md, "Stores
// and popups"). These tests guard the settled DOM and focus after controlled changes.
describe('<Menu.Root /> (port)', () => {
  const { render } = createRenderer();

  it('settles focus when the controlled open prop toggles quickly', async () => {
    const [open, setOpen] = createSignal(false);

    const { user } = await render(() => (
      <Menu.Root open={open()} onOpenChange={setOpen}>
        <Menu.Trigger data-testid="trigger">Toggle</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup data-testid="popup">
              <Menu.Item>one</Menu.Item>
              <Menu.Item>two</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    const trigger = screen.getByTestId('trigger');
    trigger.focus();

    setOpen(true);
    flush();
    await waitFor(() => expect(screen.getByTestId('popup')).toBeVisible());
    await waitFor(() =>
      expect(screen.getByTestId('popup').contains(document.activeElement)).toBe(true),
    );

    // Close and reopen before the close settles.
    setOpen(false);
    flush();
    setOpen(true);
    flush();
    await flushMicrotasks();

    await waitFor(() => expect(screen.getByTestId('popup')).toBeVisible());
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() =>
      expect(screen.getByTestId('popup').contains(document.activeElement)).toBe(true),
    );

    // Keyboard navigation works in the reopened menu.
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'one' })).toHaveFocus());

    setOpen(false);
    flush();
    await waitFor(() => expect(screen.queryByTestId('popup')).toBe(null));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
