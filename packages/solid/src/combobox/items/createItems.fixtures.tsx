import { Combobox } from 'base-ui-solid/combobox';

export function ExternalWindowFixture() {
  const items = Combobox.createItems([] as { id: string; name: string }[], {
    getValue: (person) => person.id,
    getLabel: (person) => person.name,
  });
  return (
    <Combobox.Root
      items={items}
      filteredItems={[{ id: 'user-1', name: 'Alice' }]}
      defaultValue="user-1"
    >
      <Combobox.Input data-testid="input" />
    </Combobox.Root>
  );
}
