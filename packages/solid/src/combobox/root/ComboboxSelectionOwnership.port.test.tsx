import type { Accessor } from 'solid-js';
import { createSignal, flush } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { Field } from 'base-ui-solid/field';
import { Form } from 'base-ui-solid/form';
import { Select } from 'base-ui-solid/select';
import { createRenderer, fireEvent, flushMicrotasks, screen } from '#test-utils';

const fruits = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Orange', value: 'orange' },
];

type Fruit = (typeof fruits)[number];

function FruitList() {
  return (
    <Combobox.Portal>
      <Combobox.Positioner>
        <Combobox.Popup>
          <Combobox.List>
            {(item: Accessor<Fruit>) => (
              <Combobox.Item value={item()}>{item().label}</Combobox.Item>
            )}
          </Combobox.List>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  );
}

describe('<Combobox.Root /> selection ownership (port)', () => {
  const { render } = createRenderer();

  it('writes only the hidden input of the root that owns the selection', async () => {
    await render(() => (
      <form aria-label="fruits">
        <Combobox.Root
          items={fruits}
          name="fruit-a"
          defaultOpen
        >
          <Combobox.Input aria-label="fruit a input" />
          <FruitList />
        </Combobox.Root>
        <Combobox.Root items={fruits} name="fruit-b">
          <Combobox.Input aria-label="fruit b input" />
          <FruitList />
        </Combobox.Root>
      </form>
    ));

    const form = screen.getByRole('form', { name: 'fruits' }) as HTMLFormElement;
    const hiddenA = document.querySelector<HTMLInputElement>('input[name="fruit-a"]')!;
    const hiddenB = document.querySelector<HTMLInputElement>('input[name="fruit-b"]')!;
    expect(hiddenA).not.toBe(hiddenB);

    fireEvent.click(screen.getByRole('option', { name: 'Banana' }));

    await flushMicrotasks();
    // The default field context shares `validation.inputRef`: the write must target this root's
    // hidden input, not whichever control mounted last.
    expect(hiddenA.value).toBe('banana');
    expect(hiddenB.value).toBe('');
    expect(Object.fromEntries(new FormData(form))).toEqual({
      'fruit-a': 'banana',
      'fruit-b': '',
    });
  });

  it('keeps the later-mounted root untouched when the first root selects', async () => {
    await render(() => (
      <form aria-label="reverse fruits">
        <Combobox.Root items={fruits} name="fruit-b" defaultOpen>
          <Combobox.Input aria-label="fruit b input" />
          <FruitList />
        </Combobox.Root>
        <Combobox.Root items={fruits} name="fruit-a">
          <Combobox.Input aria-label="fruit a input" />
          <FruitList />
        </Combobox.Root>
      </form>
    ));

    const hiddenA = document.querySelector<HTMLInputElement>('input[name="fruit-a"]')!;
    const hiddenB = document.querySelector<HTMLInputElement>('input[name="fruit-b"]')!;

    fireEvent.click(screen.getByRole('option', { name: 'Banana' }));

    await flushMicrotasks();
    expect(hiddenB.value).toBe('banana');
    expect(hiddenA.value).toBe('');
  });

  it('does not write through the shared default input ref into a later Select', async () => {
    await render(() => (
      <form aria-label="mixed form">
        <Combobox.Root items={fruits} name="fruit-combobox" defaultOpen>
          <Combobox.Input aria-label="fruit combobox input" />
          <FruitList />
        </Combobox.Root>
        <Select.Root name="fruit-select" defaultValue="apple">
          <Select.Trigger aria-label="fruit select trigger">
            <Select.Value />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <Select.Item value="apple">Apple</Select.Item>
                <Select.Item value="banana">Banana</Select.Item>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </form>
    ));

    const comboboxHidden = document.querySelector<HTMLInputElement>(
      'input[name="fruit-combobox"]',
    )!;
    const selectHidden = document.querySelector<HTMLInputElement>('input[name="fruit-select"]')!;
    expect(selectHidden.value).toBe('apple');

    fireEvent.click(screen.getAllByRole('option', { name: 'Banana' })[0]);

    await flushMicrotasks();
    expect(comboboxHidden.value).toBe('banana');
    expect(selectHidden.value).toBe('apple');
  });

  it('commits an uncontrolled selection to the native constraint before the event returns', async () => {
    await render(() => (
      <Form aria-label="fruit form">
        <Field.Root data-testid="field" name="fruit">
          <Combobox.Root
            items={fruits}
            name="fruit"
            required
            defaultOpen
          >
            <Combobox.Input aria-label="fruit input" />
            <FruitList />
          </Combobox.Root>
        </Field.Root>
      </Form>
    ));

    const form = screen.getByRole('form', { name: 'fruit form' }) as HTMLFormElement;
    const hidden = document.querySelector<HTMLInputElement>('input[name="fruit"]')!;
    const field = screen.getByTestId('field');
    expect(hidden.required).toBe(true);
    expect(hidden.validity.valueMissing).toBe(true);
    expect(form.checkValidity()).toBe(false);

    fireEvent.click(screen.getByRole('option', { name: 'Banana' }));

    // The hidden input is the constraint source for the field and the form. It must reflect this
    // selection in the event transaction, before the reactive attributes land.
    expect(hidden.value).toBe('banana');
    expect(hidden.validity.valueMissing).toBe(false);
    expect(form.checkValidity()).toBe(true);
    expect(Object.fromEntries(new FormData(form))).toEqual({ fruit: 'banana' });

    flush();
    await flushMicrotasks();
    expect(hidden.value).toBe('banana');
    expect(field).toHaveAttribute('data-dirty');
    expect(field).toHaveAttribute('data-filled');
    expect(field).not.toHaveAttribute('data-invalid');
  });

  it('does not validate a controlled request before the parent accepts it', async () => {
    const [value, setValue] = createSignal<Fruit | null>(null);
    const validate = vi.fn(() => null);

    await render(() => (
      <Field.Root validationMode="onChange" validate={validate} name="fruit">
        <Combobox.Root
          items={fruits}
          name="fruit"
          required
          defaultOpen
          value={value()}
          onValueChange={(nextValue) => {
            // Delay acceptance so the request is not confirmed within the event transaction.
            queueMicrotask(() => setValue((nextValue as Fruit | null) ?? null));
          }}
        >
          <Combobox.Input aria-label="fruit input" />
          <FruitList />
        </Combobox.Root>
      </Field.Root>
    ));

    const hidden = document.querySelector<HTMLInputElement>('input[name="fruit"]')!;
    fireEvent.click(screen.getByRole('option', { name: 'Banana' }));

    expect(hidden.value).toBe('');
    expect(hidden.validity.valueMissing).toBe(true);
    expect(validate).not.toHaveBeenCalled();

    await flushMicrotasks();
    expect(hidden.value).toBe('banana');
    expect(hidden.validity.valueMissing).toBe(false);
    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate).toHaveBeenLastCalledWith(
      { label: 'Banana', value: 'banana' },
      expect.anything(),
    );
  });

  it('does not commit or validate a controlled request the parent rejects', async () => {
    const validate = vi.fn(() => null);
    const onValueChange = vi.fn();

    await render(() => (
      <Field.Root validationMode="onChange" validate={validate} name="fruit">
        <Combobox.Root
          items={fruits}
          name="fruit"
          required
          defaultOpen
          value={null}
          onValueChange={onValueChange}
        >
          <Combobox.Input aria-label="fruit input" />
          <FruitList />
        </Combobox.Root>
      </Field.Root>
    ));

    const hidden = document.querySelector<HTMLInputElement>('input[name="fruit"]')!;
    fireEvent.click(screen.getByRole('option', { name: 'Banana' }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(hidden.value).toBe('');
    expect(hidden.validity.valueMissing).toBe(true);
    expect(validate).not.toHaveBeenCalled();

    await flushMicrotasks();
    expect(hidden.value).toBe('');
    expect(validate).not.toHaveBeenCalled();
  });

  it('does not commit or validate a canceled selection', async () => {
    const validate = vi.fn(() => null);
    const onValueChange = vi.fn((_nextValue: unknown, eventDetails: { cancel(): void }) => {
      eventDetails.cancel();
    });

    await render(() => (
      <Field.Root validationMode="onChange" validate={validate} name="fruit">
        <Combobox.Root
          items={fruits}
          name="fruit"
          defaultOpen
          onValueChange={onValueChange}
        >
          <Combobox.Input aria-label="fruit input" />
          <FruitList />
        </Combobox.Root>
      </Field.Root>
    ));

    const hidden = document.querySelector<HTMLInputElement>('input[name="fruit"]')!;
    fireEvent.click(screen.getByRole('option', { name: 'Banana' }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(hidden.value).toBe('');
    await flushMicrotasks();
    expect(hidden.value).toBe('');
    expect(validate).not.toHaveBeenCalled();
  });

  it('validates a local selection once and keeps rapid changes in sync', async () => {
    const validate = vi.fn(() => null);

    await render(() => (
      <Field.Root validationMode="onChange" validate={validate} name="fruit">
        <Combobox.Root
          items={fruits}
          name="fruit"
          open
        >
          <Combobox.Input aria-label="fruit input" />
          <FruitList />
        </Combobox.Root>
      </Field.Root>
    ));

    const hidden = document.querySelector<HTMLInputElement>('input[name="fruit"]')!;
    fireEvent.click(screen.getByRole('option', { name: 'Banana' }));
    await flushMicrotasks();
    expect(hidden.value).toBe('banana');
    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate).toHaveBeenLastCalledWith(
      { label: 'Banana', value: 'banana' },
      expect.anything(),
    );

    fireEvent.click(screen.getByRole('option', { name: 'Orange' }));
    await flushMicrotasks();
    expect(hidden.value).toBe('orange');
    expect(validate).toHaveBeenCalledTimes(2);
    expect(validate).toHaveBeenLastCalledWith(
      { label: 'Orange', value: 'orange' },
      expect.anything(),
    );
  });

  it('keeps required in sync when a multiple selection becomes empty', async () => {
    await render(() => (
      <Field.Root data-testid="field" name="fruits">
        <Combobox.Root
          multiple
          items={fruits}
          name="fruits"
          required
          defaultOpen
        >
          <Combobox.Input aria-label="fruits input" />
          <FruitList />
        </Combobox.Root>
      </Field.Root>
    ));

    const primaryHidden = document.querySelector<HTMLInputElement>('input[aria-hidden="true"]')!;
    expect(primaryHidden.required).toBe(true);
    expect(primaryHidden.validity.valueMissing).toBe(true);

    fireEvent.click(screen.getByRole('option', { name: 'Banana' }));
    expect(primaryHidden.required).toBe(false);
    expect(primaryHidden.validity.valueMissing).toBe(false);

    await flushMicrotasks();
    expect(primaryHidden.required).toBe(false);
    expect(document.querySelectorAll<HTMLInputElement>('input[name="fruits"]')).toHaveLength(1);

    fireEvent.click(screen.getByRole('option', { name: 'Banana' }));
    expect(primaryHidden.required).toBe(true);
    expect(primaryHidden.validity.valueMissing).toBe(true);

    await flushMicrotasks();
    expect(primaryHidden.required).toBe(true);
    expect(document.querySelectorAll<HTMLInputElement>('input[name="fruits"]')).toHaveLength(0);
  });
});
