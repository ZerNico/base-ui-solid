import { createSignal, flush, Show } from 'solid-js';
import { it, expect } from 'vitest';
import { render, flushMicrotasks } from '#test-utils';
import { Form } from './Form';

// Port note: regressions for reactive Solid props and owner lifecycle, absent upstream.
// `actionsRef` is a callback in the port (upstream: a ref object).
it('calls actionsRef once on setup, and not with null on disposal', async () => {
  const calls: Array<Form.Actions | null> = [];
  const [actions, setActions] = createSignal<Form.Actions | null>(null);
  const [visible, setVisible] = createSignal(true);
  await render(() => (
    <Show when={visible()}>
      <Form
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
