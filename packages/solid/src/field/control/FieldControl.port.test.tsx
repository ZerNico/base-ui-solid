import { it, expect } from 'vitest';
import { render, screen, flushMicrotasks } from '#test-utils';
import { Field } from '..';

// Port note: regressions for reactive Solid props and owner lifecycle, absent upstream.
it('tracks focus and touched state from a custom control descendant', async () => {
  await render(() => (
    <Field.Root data-testid="field">
      <Field.Control
        render={(props) => (
          <div {...props}>
            <input data-testid="nested" />
          </div>
        )}
      />
    </Field.Root>
  ));
  screen.getByTestId('nested').focus();
  await flushMicrotasks();
  expect(screen.getByTestId('field')).toHaveAttribute('data-focused');
  screen.getByTestId('nested').blur();
  await flushMicrotasks();
  expect(screen.getByTestId('field')).not.toHaveAttribute('data-focused');
  expect(screen.getByTestId('field')).toHaveAttribute('data-touched');
});
