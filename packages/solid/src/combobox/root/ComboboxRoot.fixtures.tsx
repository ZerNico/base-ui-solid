import { Combobox } from 'base-ui-solid/combobox';

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
