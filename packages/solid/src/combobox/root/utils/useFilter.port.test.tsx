import { createSignal, flush } from 'solid-js';
import { expect, describe, it } from 'vitest';
import { render, screen } from '#test-utils';
import { Autocomplete } from '../../../autocomplete';
import { useComboboxFilter } from './useFilter';

// Port note: regressions for reactive filter options, absent upstream (React re-runs the hook
// with new options on every render).
describe('filter hooks with reactive options', () => {
  it.each([
    ['Autocomplete.useFilter', Autocomplete.useFilter],
    ['Combobox.useFilter', useComboboxFilter],
  ] as const)('%s reads getter options when filtering', async (_name, useFilter) => {
    const [sensitivity, setSensitivity] = createSignal<'base' | 'case'>('base');
    function TestFilter() {
      const filter = useFilter({
        get sensitivity() {
          return sensitivity();
        },
      });
      return <span data-testid="result">{String(filter.contains('Apple', 'apple'))}</span>;
    }
    await render(() => <TestFilter />);
    expect(screen.getByTestId('result')).toHaveTextContent('true');
    setSensitivity('case');
    flush();
    expect(screen.getByTestId('result')).toHaveTextContent('false');
  });
});
