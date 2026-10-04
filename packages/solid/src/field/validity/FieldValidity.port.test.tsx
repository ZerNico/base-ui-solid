import { createSignal, flush } from 'solid-js';
import { it, expect } from 'vitest';
import { render, screen } from '#test-utils';
import { Field } from '..';

// Port note: regressions for reactive Solid props and owner lifecycle, absent upstream.
it('renders a replacement validity children callback', async () => {
  const first = () => <span data-testid="validity">first</span>;
  const second = () => <span data-testid="validity">second</span>;
  const [child, setChild] = createSignal({ callback: first });
  await render(() => (
    <Field.Root>
      <Field.Validity children={child().callback} />
    </Field.Root>
  ));
  setChild({ callback: second });
  flush();
  expect(screen.getByTestId('validity')).toHaveTextContent('second');
});
