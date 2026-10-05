import { Show, createSignal, flush } from 'solid-js';
import { it, expect, vi } from 'vitest';
import { Field } from 'base-ui-solid/field';
import { Form } from 'base-ui-solid/form';
import { Radio } from 'base-ui-solid/radio';
import { RadioGroup } from 'base-ui-solid/radio-group';
import { fireEvent, render, screen, flushMicrotasks } from '#test-utils';

// Port note: regression for reactive Solid props, absent upstream.
it('follows `id` changes for the DOM, the field label and the form registration', async () => {
  const [firstId, setFirstId] = createSignal('group-x');
  const [showSecond, setShowSecond] = createSignal(false);
  const onFormSubmit = vi.fn();
  await render(() => (
    <Form onFormSubmit={onFormSubmit}>
      <Field.Root name="first">
        <Field.Label data-testid="label">First</Field.Label>
        <RadioGroup id={firstId()} defaultValue="a" data-testid="first">
          <Radio.Root value="a" />
        </RadioGroup>
      </Field.Root>
      <Show when={showSecond()}>
        <Field.Root name="second">
          <RadioGroup id="group-x" defaultValue="b">
            <Radio.Root value="b" />
          </RadioGroup>
        </Field.Root>
      </Show>
      <button type="submit">Submit</button>
    </Form>
  ));

  setFirstId('group-y');
  flush();
  await flushMicrotasks();

  const group = screen.getByTestId('first');
  expect(group).toHaveAttribute('id', 'group-y');
  expect(group).toHaveAttribute('aria-labelledby', screen.getByTestId('label').id);

  // The first group's old id is free again: another control can register with it.
  setShowSecond(true);
  flush();
  await flushMicrotasks();

  fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  await flushMicrotasks();
  expect(onFormSubmit).toHaveBeenCalledTimes(1);
  expect(onFormSubmit.mock.calls[0][0]).toEqual({ first: 'a', second: 'b' });
});
