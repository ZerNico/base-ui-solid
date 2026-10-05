import { createMemo, flush } from 'solid-js';
import { expect, describe, it } from 'vitest';
import { render, screen, flushMicrotasks } from '#test-utils';
import { Popover } from '../../popover';
import { Dialog } from '../../dialog';

// Port note: regressions for the reactive `handle.isOpen`, absent upstream (React re-renders
// read the getter again, Solid needs it to be tracked).
describe('popup handle isOpen', () => {
  it('updates JSX and memos reading Popover handle.isOpen', async () => {
    const handle = Popover.createHandle();
    const label = createMemo(() => (handle.isOpen ? 'open' : 'closed'));
    await render(() => (
      <div>
        <span data-testid="state">{handle.isOpen ? 'open' : 'closed'}</span>
        <span data-testid="memo">{label()}</span>
        <Popover.Trigger handle={handle} id="trigger">
          Toggle
        </Popover.Trigger>
        <Popover.Root handle={handle}>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>Content</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
    ));
    expect(screen.getByTestId('state')).toHaveTextContent('closed');

    handle.open('trigger');
    // Read synchronously, like upstream.
    expect(handle.isOpen).toBe(true);
    flush();
    await flushMicrotasks();
    expect(screen.getByTestId('state')).toHaveTextContent('open');
    expect(screen.getByTestId('memo')).toHaveTextContent('open');

    handle.close();
    flush();
    await flushMicrotasks();
    expect(screen.getByTestId('state')).toHaveTextContent('closed');
    expect(screen.getByTestId('memo')).toHaveTextContent('closed');
  });

  it('updates when a Dialog root attaches to the handle open', async () => {
    const handle = Dialog.createHandle();
    await render(() => (
      <div>
        <span data-testid="state">{handle.isOpen ? 'open' : 'closed'}</span>
        <Dialog.Root handle={handle} defaultOpen>
          <Dialog.Portal>
            <Dialog.Popup>Content</Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    ));
    await flushMicrotasks();
    expect(screen.getByTestId('state')).toHaveTextContent('open');
  });
});
