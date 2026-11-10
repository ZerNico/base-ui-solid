import { createMemo, Loading } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '#test-utils';
import { Button } from 'base-ui-solid/button';
import { Popover } from 'base-ui-solid/popover';

// Port-specific: Solid props can read an async memo that's still pending when the element is
// created. A ref can't suspend, so it must wait for the props instead of halting reactivity.
describe('useRenderElement (port)', () => {
  it('attaches refs once props pending on an async value resolve', async () => {
    let resolveClass!: (value: string) => void;
    const className = createMemo(
      async () =>
        new Promise<string>((resolve) => {
          resolveClass = resolve;
        }),
    );
    let refElement: Element | null = null;

    await render(() => (
      <Loading fallback={<span>Loading…</span>}>
        <Button
          class={className()}
          ref={(element) => {
            refElement = element;
          }}
        >
          Save
        </Button>
      </Loading>
    ));

    expect(screen.getByText('Loading…')).not.toBe(null);
    resolveClass('resolved');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('resolved');
    });
    expect(refElement).toBe(screen.getByRole('button', { name: 'Save' }));
  });

  it('attaches internal refs once props pending on an async value resolve', async () => {
    let resolveLabel!: (value: string) => void;
    const label = createMemo(
      async () =>
        new Promise<string>((resolve) => {
          resolveLabel = resolve;
        }),
    );

    await render(() => (
      <Loading fallback={<span>Loading…</span>}>
        <Popover.Root>
          <Popover.Trigger aria-label={label()} render={(props) => <Button {...props} />}>
            Open
          </Popover.Trigger>
        </Popover.Root>
      </Loading>
    ));

    expect(screen.getByText('Loading…')).not.toBe(null);
    resolveLabel('Resolved');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Resolved' })).not.toBe(null);
    });
  });
});
