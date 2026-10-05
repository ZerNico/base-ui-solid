import { createSignal, flush } from 'solid-js';
import type { Accessor } from 'solid-js';
import { it, expect, vi } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { render, screen } from '#test-utils';

// Port note: regression for the Solid render-function contract, absent upstream.
it('calls the render function once and updates its DOM in place', async () => {
  const [value, setValue] = createSignal<string | null>('a');
  const renderValue = vi.fn((current: Accessor<string | null>) => (
    <b data-testid="content">{current() ?? 'none'}</b>
  ));
  await render(() => (
    <Combobox.Root items={['a', 'b']} value={value()}>
      <Combobox.Value>{renderValue}</Combobox.Value>
    </Combobox.Root>
  ));
  const content = screen.getByTestId('content');
  expect(content).toHaveTextContent('a');

  setValue('b');
  flush();
  expect(screen.getByTestId('content')).toBe(content);
  expect(content).toHaveTextContent('b');

  setValue(null);
  flush();
  expect(content).toHaveTextContent('none');
  expect(renderValue).toHaveBeenCalledTimes(1);
});
