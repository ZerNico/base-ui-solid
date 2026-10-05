import { createSignal, flush } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { Popover } from 'base-ui-solid/popover';
import { createRenderer, flushMicrotasks, screen, waitFor } from '#test-utils';

// Port note: controlled props reach the store one update after the prop (see PORTING.md, "Stores
// and popups"). These tests guard the settled DOM and focus after controlled changes.
describe('<Popover.Root /> (port)', () => {
  const { render } = createRenderer();

  it('settles focus when the controlled open prop toggles quickly', async () => {
    const [open, setOpen] = createSignal(false);

    await render(() => (
      <Popover.Root open={open()} onOpenChange={setOpen}>
        <Popover.Trigger data-testid="trigger">Toggle</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup data-testid="popup">
              <button data-testid="inside">Inside</button>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    const trigger = screen.getByTestId('trigger');
    trigger.focus();

    setOpen(true);
    flush();
    await waitFor(() => expect(screen.getByTestId('popup')).toBeVisible());
    const popup = screen.getByTestId('popup');
    await waitFor(() => expect(popup.contains(document.activeElement)).toBe(true));

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

    setOpen(false);
    flush();
    await waitFor(() => expect(screen.queryByTestId('popup')).toBe(null));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
