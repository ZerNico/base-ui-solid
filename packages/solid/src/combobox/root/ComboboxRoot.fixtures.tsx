import type { Accessor } from 'solid-js';
import { Combobox } from 'base-ui-solid/combobox';

// Port note: `Combobox.List`/`Combobox.Collection` (and `Autocomplete.*`) render functions receive
// the item and its index as accessors, and `*.Value` render functions receive accessors.

export function SSRFixture1() {
  return (
    <Combobox.Root>
      <Combobox.Input data-testid="input" />
      <Combobox.Portal>
        <Combobox.Positioner />
      </Combobox.Portal>
    </Combobox.Root>
  );
}
export function SSRFixture2() {
  return (
    <Combobox.Root>
      <Combobox.Trigger data-testid="trigger" />
      <Combobox.Portal>
        <Combobox.Positioner />
      </Combobox.Portal>
    </Combobox.Root>
  );
}
export function SSRFixture3() {
  return (
    <Combobox.Root inline>
      <Combobox.Label data-testid="label">Food</Combobox.Label>
      <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
      <Combobox.Input data-testid="input" />
    </Combobox.Root>
  );
}

export function InputOutsidePopupFixture() {
  return (
    <Combobox.Root items={['a', 'b']}>
      <Combobox.InputGroup>
        <Combobox.Input />
        <div>
          <Combobox.Clear />
          <Combobox.Trigger data-testid="trigger" />
        </div>
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner>
          <Combobox.Popup>
            <Combobox.List>
              {(item: Accessor<string>) => <Combobox.Item value={item()}>{item()}</Combobox.Item>}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
