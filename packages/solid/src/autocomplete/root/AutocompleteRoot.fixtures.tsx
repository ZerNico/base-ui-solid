// Port note: SSR compiles these upstream trees separately for the server and client.
import { Autocomplete } from '..';
import { Field } from '../../field';
import { Form } from '../../form';
import { Input } from '../../input';

export function FormSSR1() {
  return (
    <Form>
      <Field.Root name="search">
        <Autocomplete.Root items={['alpha', 'alpine']} inline>
          <Autocomplete.Input data-testid="input" />
          <Autocomplete.List>
            {(item) => <Autocomplete.Item value={item}>{item}</Autocomplete.Item>}
          </Autocomplete.List>
        </Autocomplete.Root>
      </Field.Root>
      <button type="submit">Submit</button>
    </Form>
  );
}
export function FormSSR2() {
  return (
    <Form>
      <Field.Root name="search">
        <Autocomplete.Root items={['alpha', 'alpine']}>
          <Autocomplete.InputGroup>
            <Autocomplete.Input data-testid="input" />
            <Autocomplete.Trigger>Open</Autocomplete.Trigger>
          </Autocomplete.InputGroup>
          <Autocomplete.Portal>
            <Autocomplete.Positioner>
              <Autocomplete.Popup>
                <Autocomplete.List>
                  {(item) => <Autocomplete.Item value={item}>{item}</Autocomplete.Item>}
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete.Root>
      </Field.Root>
      <button type="submit">Submit</button>
    </Form>
  );
}
export function FormSSR3() {
  return (
    <Form>
      <Field.Root name="search">
        <Autocomplete.Root items={['alpha', 'alpine']} defaultValue="alpha">
          <Autocomplete.Trigger>
            <Autocomplete.Value />
          </Autocomplete.Trigger>
          <Autocomplete.Portal>
            <Autocomplete.Positioner>
              <Autocomplete.Popup>
                <Autocomplete.Input
                  render={(props) => <Input {...(props as Input.Props)} data-testid="input" />}
                />
                <Autocomplete.List>
                  {(item) => <Autocomplete.Item value={item}>{item}</Autocomplete.Item>}
                </Autocomplete.List>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete.Root>
      </Field.Root>
      <button type="submit">Submit</button>
    </Form>
  );
}
