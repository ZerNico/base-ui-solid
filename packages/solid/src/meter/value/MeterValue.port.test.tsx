import { createSignal, flush } from 'solid-js';
import type { Accessor } from 'solid-js';
import { it, expect, vi } from 'vitest';
import { Meter } from 'base-ui-solid/meter';
import { render, screen } from '#test-utils';

// Port note: regression for the Solid render-function contract, absent upstream.
it('calls the render function once and updates its DOM in place', async () => {
  const [value, setValue] = createSignal(30);
  const renderValue = vi.fn((formattedValue: Accessor<string>, rawValue: Accessor<number>) => (
    <b data-testid="content">
      {formattedValue()} ({rawValue()})
    </b>
  ));
  await render(() => (
    <Meter.Root value={value()}>
      <Meter.Value>{renderValue}</Meter.Value>
    </Meter.Root>
  ));
  const content = screen.getByTestId('content');
  expect(content).toHaveTextContent('30% (30)');

  setValue(60);
  flush();
  expect(screen.getByTestId('content')).toBe(content);
  expect(content).toHaveTextContent('60% (60)');
  expect(renderValue).toHaveBeenCalledTimes(1);
});
