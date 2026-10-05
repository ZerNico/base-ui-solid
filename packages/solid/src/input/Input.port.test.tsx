import { describe, it, expect } from 'vitest';
import { renderToString, screen } from '#test-utils';
import { InputDefaultValueApp } from './Input.fixtures';

// Port note: regressions absent upstream. React server-renders `defaultValue`/`defaultChecked` as
// `value`/`checked`. Solid's server spread prints them verbatim, which browsers ignore, so the
// port normalizes them for the default `<input>`, including when a `render` prop replaces it.
describe('<Input /> server rendering', () => {
  it.each(['default', 'tag', 'function', 'component'] as const)(
    'renders the default value as the value attribute (%s render)',
    async (variant) => {
      const { hydrate } = await renderToString(InputDefaultValueApp, { variant });
      const input = screen.getByTestId<HTMLInputElement>('input');
      expect(input).toHaveAttribute('value', 'Alice');
      expect(input).not.toHaveAttribute('defaultValue');

      hydrate();

      expect(screen.getByTestId<HTMLInputElement>('input').value).toBe('Alice');
    },
  );
});
