import { it, expect } from 'vitest';
import { render, renderToString, screen, flushMicrotasks } from '#test-utils';
import { Field } from '..';
import { DefaultValueApp } from './FieldControl.fixtures';

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

// Solid's server spread prints `defaultValue` verbatim, and hydration doesn't set DOM properties.
it('keeps the default value of a server-rendered input after hydration', async () => {
  const { hydrate } = await renderToString(DefaultValueApp);
  const control = screen.getByTestId<HTMLInputElement>('control');
  expect(control).toHaveAttribute('value', 'https://example.com');
  expect(control).not.toHaveAttribute('defaultValue');

  hydrate();

  expect(screen.getByTestId<HTMLInputElement>('control').value).toBe('https://example.com');
});
