import { createSignal, flush, Show } from 'solid-js';
import { it, expect } from 'vitest';
import { render, flushMicrotasks } from '#test-utils';
import { Field } from '..';
import { Combobox } from '../../combobox';
import { Select } from '../../select';

// Port note: regressions for reactive Solid props and owner lifecycle, absent upstream.
it('detaches actionsRef on replacement and disposal', async () => {
  const first = { current: null as Field.Root.Actions | null };
  const second = { current: null as Field.Root.Actions | null };
  const [ref, setRef] = createSignal(first);
  const [visible, setVisible] = createSignal(true);
  await render(() => (
    <Show when={visible()}>
      <Field.Root actionsRef={ref()} />
    </Show>
  ));
  const handle = first.current;
  expect(handle).not.toBeNull();
  setRef(second);
  flush();
  await flushMicrotasks();
  expect(first.current).toBeNull();
  expect(second.current).toBe(handle);
  setVisible(false);
  flush();
  await flushMicrotasks();
  expect(second.current).toBeNull();
});

// Validation props are also spread on plain JSX elements (e.g. hidden inputs), where Solid renders
// a boolean `true` as an empty attribute.
it('renders aria-invalid="true" on hidden inputs of invalid fields', async () => {
  const { container } = await render(() => (
    <Field.Root invalid>
      <Combobox.Root name="combobox">
        <Combobox.Input />
      </Combobox.Root>
      <Select.Root name="select">
        <Select.Trigger />
      </Select.Root>
    </Field.Root>
  ));
  // eslint-disable-next-line testing-library/no-container -- hidden inputs have no role
  const invalidInputs = container.querySelectorAll('input[aria-invalid]');
  expect(invalidInputs.length).toBeGreaterThan(0);
  invalidInputs.forEach((input) => {
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
