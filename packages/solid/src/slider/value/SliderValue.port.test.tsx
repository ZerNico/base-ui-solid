import { createSignal, flush } from 'solid-js';
import type { Accessor } from 'solid-js';
import { it, expect, vi } from 'vitest';
import { Slider } from 'base-ui-solid/slider';
import { render, screen } from '#test-utils';

// Port note: regression for the Solid render-function contract, absent upstream.
it('calls the render function once and updates its DOM in place', async () => {
  const [value, setValue] = createSignal([20, 40]);
  const renderValue = vi.fn(
    (formattedValues: Accessor<readonly string[]>, values: Accessor<readonly number[]>) => (
      <b data-testid="content">
        {formattedValues().join('|')} ({values().join(',')})
      </b>
    ),
  );
  await render(() => (
    <Slider.Root value={value()}>
      <Slider.Value>{renderValue}</Slider.Value>
    </Slider.Root>
  ));
  const content = screen.getByTestId('content');
  expect(content).toHaveTextContent('20|40 (20,40)');

  setValue([30, 50]);
  flush();
  expect(screen.getByTestId('content')).toBe(content);
  expect(content).toHaveTextContent('30|50 (30,50)');
  expect(renderValue).toHaveBeenCalledTimes(1);
});
