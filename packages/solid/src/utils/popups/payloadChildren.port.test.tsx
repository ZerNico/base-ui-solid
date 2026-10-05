import { flush } from 'solid-js';
import { expect, describe, it } from 'vitest';
import { render, screen, flushMicrotasks } from '#test-utils';
import { Popover } from '../../popover';
import { Dialog } from '../../dialog';
import { Menu } from '../../menu';

// Port note: regressions for Root render-function children, absent upstream. Solid calls the
// function once with `{ payload }`, where `payload` is an accessor, so destructuring the argument
// keeps the content reactive.
describe('Root render-function children', () => {
  it('keeps a destructured Popover payload reactive across triggers', async () => {
    const handle = Popover.createHandle<number>();
    let calls = 0;
    await render(() => (
      <div>
        <Popover.Trigger handle={handle} id="trigger-1" payload={1}>
          One
        </Popover.Trigger>
        <Popover.Trigger handle={handle} id="trigger-2" payload={2}>
          Two
        </Popover.Trigger>
        <Popover.Root handle={handle}>
          {({ payload }) => {
            calls += 1;
            return (
              <Popover.Portal keepMounted>
                <Popover.Positioner>
                  <Popover.Popup>
                    <span data-testid="payload">{payload() ?? 'none'}</span>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            );
          }}
        </Popover.Root>
      </div>
    ));
    const content = screen.getByTestId('payload');
    expect(content).toHaveTextContent('none');

    handle.open('trigger-1');
    flush();
    await flushMicrotasks();
    expect(content).toHaveTextContent('1');

    handle.open('trigger-2');
    flush();
    await flushMicrotasks();
    expect(screen.getByTestId('payload')).toBe(content);
    expect(content).toHaveTextContent('2');
    expect(calls).toBe(1);
  });

  it('keeps a destructured Dialog payload reactive with openWithPayload', async () => {
    const handle = Dialog.createHandle<string>();
    await render(() => (
      <Dialog.Root handle={handle}>
        {({ payload }) => <span data-testid="payload">{payload() ?? 'none'}</span>}
      </Dialog.Root>
    ));
    expect(screen.getByTestId('payload')).toHaveTextContent('none');
    handle.openWithPayload('first');
    flush();
    await flushMicrotasks();
    expect(screen.getByTestId('payload')).toHaveTextContent('first');
    handle.openWithPayload('second');
    flush();
    await flushMicrotasks();
    expect(screen.getByTestId('payload')).toHaveTextContent('second');
  });

  it('treats a function child without parameters as JSX, like Solid', async () => {
    const child = () => <span data-testid="child">child</span>;
    await render(() => <Menu.Root>{child}</Menu.Root>);
    expect(screen.getByTestId('child')).toHaveTextContent('child');
  });
});
