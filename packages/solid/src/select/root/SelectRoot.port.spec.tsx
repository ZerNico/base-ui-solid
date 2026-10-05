import { Select } from 'base-ui-solid/select';
import { expectType } from '#test-utils';

// Port note: type regressions for the port's value typing, absent upstream. Callbacks below have
// no annotations or casts: their parameter types come from inference or the parts' type arguments.

const fonts = [
  { label: 'Sans-serif', value: 'sans' },
  { label: 'Serif', value: 'serif' },
];

interface Country {
  code: string;
}

const countries: Array<{ label: string; value: Country }> = [
  { label: 'Germany', value: { code: 'de' } },
  { label: 'France', value: { code: 'fr' } },
];

// The value type is inferred from the items' values without `value`/`defaultValue`.
<Select.Root
  items={fonts}
  onValueChange={(value) => {
    expectType<string | null, typeof value>(value);
    // @ts-expect-error - possibly null
    value.startsWith('s');
  }}
/>;

<Select.Root
  items={countries}
  itemToStringValue={(item) => {
    expectType<Country, typeof item>(item);
    return item.code;
  }}
  onValueChange={(value) => {
    expectType<Country | null, typeof value>(value);
  }}
/>;

<Select.Root
  items={countries}
  multiple
  onValueChange={(value) => {
    expectType<Country[], typeof value>(value);
  }}
/>;

// A `null` placeholder item is part of the inferred type.
<Select.Root
  items={[{ label: 'Select a font', value: null }, ...fonts]}
  onValueChange={(value) => {
    expectType<string | null, typeof value>(value);
  }}
/>;

// Grouped items infer the type of the groups' items' values.
<Select.Root
  items={[{ value: 'sans', items: fonts }]}
  onValueChange={(value) => {
    expectType<string | null, typeof value>(value);
  }}
/>;

// `value`/`defaultValue` still take precedence.
<Select.Root
  items={countries}
  defaultValue="de"
  onValueChange={(value) => {
    expectType<string | null, typeof value>(value);
  }}
/>;

// `Select.Value` types its render function's accessor from its type argument.
<Select.Root items={countries}>
  <Select.Value<Country | null>>
    {(value) => {
      expectType<Country | null, ReturnType<typeof value>>(value());
      return value()?.code;
    }}
  </Select.Value>
  <Select.Value>
    {(value) => {
      expectType<any, ReturnType<typeof value>>(value());
      return null;
    }}
  </Select.Value>
</Select.Root>;
