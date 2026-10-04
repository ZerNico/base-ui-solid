import { describe, it, expect } from 'vitest';
import { createSignal, Show } from 'solid-js';
import { render, describeConformance, fireEvent, flushMicrotasks, screen } from '#test-utils';
import { Progress } from '..';

describe('<Progress.Label />', () => {
  describeConformance(Progress.Label, {
    wrap: (node) => <Progress.Root value={40}>{node()}</Progress.Root>,
    refInstanceof: window.HTMLSpanElement,
  });

  it('updates and clears the progress bar label association', async () => {
    function App() {
      const [labelId, setLabelId] = createSignal('label-a');
      const [showLabel, setShowLabel] = createSignal(true);

      return (
        <>
          <Progress.Root value={40}>
            <Show when={showLabel()}>
              <Progress.Label id={labelId()}>Upload progress</Progress.Label>
            </Show>
          </Progress.Root>
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

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-labelledby', 'label-a');

    fireEvent.click(screen.getByRole('button', { name: 'Change id' }));
    await flushMicrotasks();
    expect(progressbar).toHaveAttribute('aria-labelledby', 'label-b');

    fireEvent.click(screen.getByRole('button', { name: 'Remove label' }));
    await flushMicrotasks();
    expect(progressbar).not.toHaveAttribute('aria-labelledby');
  });

  it('throws a descriptive error when rendered outside <Progress.Root>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(() => <Progress.Label />)).rejects.toThrow(
        'Base UI: ProgressRootContext is missing. Progress parts must be placed within <Progress.Root>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
