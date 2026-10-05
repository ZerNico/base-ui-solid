import { createSignal, flush } from 'solid-js';
import type { Accessor } from 'solid-js';
import { it, expect, vi } from 'vitest';
import { Autocomplete } from 'base-ui-solid/autocomplete';
import { render, screen } from '#test-utils';

// Port note: regression for the Solid render-function contract, absent upstream.
it('calls the render function once and updates its DOM in place', async () => {
  const [value, setValue] = createSignal('al');
  const renderValue = vi.fn((current: Accessor<string>) => (
    <b data-testid="content">{current()}</b>
  ));
  await render(() => (
    <Autocomplete.Root items={['alpha', 'beta']} value={value()}>
      <Autocomplete.Value>{renderValue}</Autocomplete.Value>
    </Autocomplete.Root>
  ));
  const content = screen.getByTestId('content');
  expect(content).toHaveTextContent('al');

  setValue('be');
  flush();
  expect(screen.getByTestId('content')).toBe(content);
  expect(content).toHaveTextContent('be');
  expect(renderValue).toHaveBeenCalledTimes(1);
});
