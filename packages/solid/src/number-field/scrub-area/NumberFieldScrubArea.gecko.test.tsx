import { expect, vi, it } from 'vitest';
import { createRenderer, flushMicrotasks, isJSDOM, screen } from '#test-utils';
import { platform } from '@base-ui-solid/utils/platform';
import { NumberField } from '..';

vi.mock('@base-ui-solid/utils/platform', async () => {
  const actual = await vi.importActual<typeof import('@base-ui-solid/utils/platform')>(
    '@base-ui-solid/utils/platform',
  );

  return {
    ...actual,
    platform: {
      ...actual.platform,
      engine: { ...actual.platform.engine, gecko: true },
    },
  };
});

// Port note: counterpart of upstream's `await act(async () => fn())`: run the action, then let
// Solid's batched updates (and the promise callbacks they queue) settle.
async function act(fn: () => unknown) {
  await fn();
  await flushMicrotasks();
}

// Scrubbing relies on real pointer movement, which only the Chromium/Firefox runners provide.
describe.skipIf(isJSDOM || platform.engine.webkit)('<NumberField.ScrubArea /> on Gecko', () => {
  const { render, clock } = createRenderer();

  clock.withFakeTimers();

  it('delays releasing the pointer lock so soft clicks are not swallowed', async () => {
    const onValueCommitted = vi.fn();

    await render(() => (
      <NumberField.Root defaultValue={0} data-testid="root" onValueCommitted={onValueCommitted}>
        <NumberField.Input />
        <NumberField.ScrubArea data-testid="scrub-area">
          <NumberField.ScrubAreaCursor />
        </NumberField.ScrubArea>
      </NumberField.Root>
    ));

    const scrubArea = screen.getByTestId('scrub-area');
    const root = screen.getByTestId('root');
    const box = scrubArea.getBoundingClientRect();

    await act(async () => {
      scrubArea.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: box.left + box.width / 2,
          clientY: box.top + box.height / 2,
        }),
      );
      scrubArea.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, movementX: 10, movementY: 0 }),
      );
    });

    expect(screen.getByRole('textbox')).toHaveValue('10');

    await act(async () => {
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    // Firefox needs the pointer lock to outlive the release, so the scrub is still open here.
    expect(onValueCommitted).not.toHaveBeenCalled();
    expect(root).toHaveAttribute('data-scrubbing');

    // Port note: upstream's `clock.tick(20)` inside `act` -> `clock.tickAsync(20)`, which also
    // flushes Solid's pending updates.
    await act(async () => {
      await clock.tickAsync(20);
    });

    expect(onValueCommitted.mock.calls.length).toBe(1);
    expect(onValueCommitted.mock.lastCall?.[0]).toBe(10);
    expect(root).not.toHaveAttribute('data-scrubbing');
  });
});
