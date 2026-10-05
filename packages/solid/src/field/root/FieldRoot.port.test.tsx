import { createSignal, flush, Show } from 'solid-js';
import { it, expect } from 'vitest';
import { render, flushMicrotasks, screen } from '#test-utils';
import { Field } from '..';
import { Combobox } from '../../combobox';
import { Select } from '../../select';

// Port note: regressions for reactive Solid props and owner lifecycle, absent upstream.
// `actionsRef` is a callback in the port (upstream: a ref object).
it('calls actionsRef once on setup, and not with null on disposal', async () => {
  const calls: Array<Field.Root.Actions | null> = [];
  const [actions, setActions] = createSignal<Field.Root.Actions | null>(null);
  const [visible, setVisible] = createSignal(true);
  await render(() => (
    <Show when={visible()}>
      <Field.Root
        actionsRef={(value) => {
          calls.push(value);
          // Runs without an owner, like a Solid `ref` callback, so it may write signals.
          setActions(value);
        }}
      />
    </Show>
  ));
  expect(calls).toHaveLength(1);
  expect(calls[0]).not.toBeNull();
  flush();
  expect(actions()).toBe(calls[0]);
  setVisible(false);
  flush();
  await flushMicrotasks();
  expect(calls).toHaveLength(1);
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

// The control's `aria-describedby` follows the order in which the messages appeared, like
// upstream's effects appending their ids, and updates in the same flush as the messages.
it('orders aria-describedby by the order the messages appeared', async () => {
  const [showError, setShowError] = createSignal(false);
  const [showDescription, setShowDescription] = createSignal(true);
  await render(() => (
    <Field.Root invalid>
      <Show when={showError()}>
        <Field.Error match id="error" />
      </Show>
      <Field.Control data-testid="control" />
      <Show when={showDescription()}>
        <Field.Description id="description" />
      </Show>
    </Field.Root>
  ));
  const control = screen.getByTestId('control');
  await flushMicrotasks();
  expect(control).toHaveAttribute('aria-describedby', 'description');

  setShowError(true);
  flush();
  expect(control).toHaveAttribute('aria-describedby', 'description error');

  setShowDescription(false);
  flush();
  expect(control).toHaveAttribute('aria-describedby', 'error');

  setShowDescription(true);
  flush();
  expect(control).toHaveAttribute('aria-describedby', 'error description');
});
