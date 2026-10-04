import { SelectionlessCombobox as Autocomplete } from './root/SelectionlessCombobox.test-utils';

export function SSRFixture1() {
  return (
    <Autocomplete.Root items={['alpha', 'beta']} name="search">
      <Autocomplete.Input data-testid="input" />
      <Autocomplete.Portal>
        <Autocomplete.Positioner />
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
