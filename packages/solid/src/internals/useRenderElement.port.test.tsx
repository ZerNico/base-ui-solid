import { createMemo, Loading } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '#test-utils';
import { Button } from 'base-ui-solid/button';

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
});
