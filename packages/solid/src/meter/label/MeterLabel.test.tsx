import { describe, it, expect } from 'vitest';
import { createSignal, Show } from 'solid-js';
import { render, describeConformance, fireEvent, flushMicrotasks, screen } from '#test-utils';
import { Meter } from '..';

describe('<Meter.Label />', () => {
  describeConformance(Meter.Label, {
    wrap: (node) => <Meter.Root value={50}>{node()}</Meter.Root>,
    refInstanceof: window.HTMLSpanElement,
  });

  it('updates and clears the meter label association', async () => {
    function App() {
      const [labelId, setLabelId] = createSignal('label-a');
      const [showLabel, setShowLabel] = createSignal(true);

      return (
        <>
          <Meter.Root value={50}>
            <Show when={showLabel()}>
              <Meter.Label id={labelId()}>Battery level</Meter.Label>
            </Show>
          </Meter.Root>
          <button type="button" onClick={() => setLabelId('label-b')}>
            Change id
          </button>
          <button type="button" onClick={() => setShowLabel(false)}>
            Remove label
          </button>
        </>
      );
    }

    await render(() => <App />);

    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-labelledby', 'label-a');

    fireEvent.click(screen.getByRole('button', { name: 'Change id' }));
    await flushMicrotasks();
    expect(meter).toHaveAttribute('aria-labelledby', 'label-b');

    fireEvent.click(screen.getByRole('button', { name: 'Remove label' }));
    await flushMicrotasks();
    expect(meter).not.toHaveAttribute('aria-labelledby');
  });

  it('throws a descriptive error when rendered outside <Meter.Root>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(() => <Meter.Label />)).rejects.toThrow(
        'Base UI: MeterRootContext is missing. Meter parts must be placed within <Meter.Root>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
