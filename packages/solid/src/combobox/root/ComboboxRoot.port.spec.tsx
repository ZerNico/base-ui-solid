import { Combobox } from 'base-ui-solid/combobox';
import { Autocomplete } from 'base-ui-solid/autocomplete';
import { expectType } from '#test-utils';

// Port note: type regressions for the port's item typing, absent upstream. Callbacks below have no
// annotations or casts: their parameter types come from inference or the parts' type arguments.

interface Fruit {
  id: string;
  name: string;
}

const fruits: Fruit[] = [
  { id: 'apple', name: 'Apple' },
  { id: 'banana', name: 'Banana' },
];

const groupedFruits = [
  { value: 'tropical', items: [{ id: 'mango', name: 'Mango' }] },
  { value: 'temperate', items: fruits },
];

// The value type is inferred from `items` without `value`/`defaultValue`.
<Combobox.Root
  items={fruits}
  onValueChange={(value) => {
    expectType<Fruit | null, typeof value>(value);
    // @ts-expect-error - possibly null
    value.name;
  }}
  itemToStringLabel={(item) => {
    expectType<Fruit, typeof item>(item);
    return item.name;
  }}
  filter={(item, query) => {
    expectType<Fruit, typeof item>(item);
    return item.name.includes(query);
  }}
/>;

<Combobox.Root
  items={fruits}
  multiple
  onValueChange={(value) => {
    expectType<Fruit[], typeof value>(value);
  }}
/>;

// Grouped items infer the type of the groups' items.
<Combobox.Root
  items={groupedFruits}
  onValueChange={(value) => {
    expectType<{ id: string; name: string } | null, typeof value>(value);
  }}
/>;

<Combobox.Root
  items={['a', 'b']}
  onValueChange={(value) => {
    expectType<string | null, typeof value>(value);
  }}
/>;

// `value`/`defaultValue` still take precedence, and `filter` receives the items.
<Combobox.Root
  items={fruits}
  defaultValue="apple"
  onValueChange={(value) => {
    expectType<string | null, typeof value>(value);
  }}
  filter={(item) => {
    expectType<Fruit, typeof item>(item);
    return true;
  }}
/>;

// Without `items`, `filter` receives the values.
<Combobox.Root
  defaultValue="apple"
  filter={(item) => {
    expectType<string, typeof item>(item);
    return true;
  }}
/>;

// A collection infers both the source items and their values.
const fruitCollection = Combobox.createItems(fruits, {
  getValue: (fruit) => fruit.id,
  getLabel: (fruit) => fruit.name,
});
<Combobox.Root
  items={fruitCollection}
  onValueChange={(value) => {
    expectType<string | null, typeof value>(value);
  }}
/>;

// Generic parts type their render functions' accessors.
<Combobox.Root items={fruits}>
  <Combobox.Value<Fruit | null>>
    {(value) => {
      expectType<Fruit | null, ReturnType<typeof value>>(value());
      return value()?.name;
    }}
  </Combobox.Value>
  <Combobox.List<Fruit>>
    {(item, index) => {
      expectType<Fruit, ReturnType<typeof item>>(item());
      expectType<number, ReturnType<typeof index>>(index());
      return <Combobox.Item value={item()}>{item().name}</Combobox.Item>;
    }}
  </Combobox.List>
  <Combobox.List>
    <Combobox.Collection<Fruit>>
      {(item) => {
        // @ts-expect-error - not a Fruit property
        item().label;
        return <Combobox.Item value={item()}>{item().name}</Combobox.Item>;
      }}
    </Combobox.Collection>
  </Combobox.List>
</Combobox.Root>;

<Autocomplete.Root items={fruits}>
  <Autocomplete.List<Fruit>>
    {(item) => <Autocomplete.Item value={item()}>{item().name}</Autocomplete.Item>}
  </Autocomplete.List>
</Autocomplete.Root>;

// Without a type argument, the item stays `any`, like upstream.
<Combobox.List>
  {(item) => {
    expectType<any, ReturnType<typeof item>>(item());
    return null;
  }}
</Combobox.List>;
