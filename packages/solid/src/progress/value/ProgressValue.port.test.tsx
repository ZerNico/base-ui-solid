import { createSignal, flush } from 'solid-js';
import type { Accessor } from 'solid-js';
import { it, expect, vi } from 'vitest';
import { Progress } from 'base-ui-solid/progress';
import { render, screen } from '#test-utils';

// Port note: regression for the Solid render-function contract, absent upstream.
it('calls the render function once and updates its DOM in place', async () => {
  const [value, setValue] = createSignal<number | null>(30);
  const renderValue = vi.fn(
    (formattedValue: Accessor<string | null>, rawValue: Accessor<number | null>) => (
      <b data-testid="content">
        {formattedValue()} ({String(rawValue())})
      </b>
    ),
  );
  await render(() => (
    <Progress.Root value={value()}>
      <Progress.Value>{renderValue}</Progress.Value>
    </Progress.Root>
  ));
  const content = screen.getByTestId('content');
  expect(content).toHaveTextContent('30% (30)');

  setValue(60);
  flush();
  expect(screen.getByTestId('content')).toBe(content);
  expect(content).toHaveTextContent('60% (60)');

  setValue(null);
  flush();
  expect(content).toHaveTextContent('indeterminate (null)');
  expect(renderValue).toHaveBeenCalledTimes(1);
});
