import { createSignal, flush } from 'solid-js';
import { it, expect, vi } from 'vitest';
import { render, flushMicrotasks } from '#test-utils';
import { RadioGroup } from './RadioGroup';

// Port note: regressions for reactive Solid props and owner lifecycle, absent upstream.
it('warns when an uncontrolled default changes after initialization', async () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const [value, setValue] = createSignal('first');
    await render(() => <RadioGroup defaultValue={value()} />);
    expect(spy).not.toHaveBeenCalled();
    setValue('second');
    flush();
    await flushMicrotasks();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain('changing the default');
  } finally {
    spy.mockRestore();
  }
});
