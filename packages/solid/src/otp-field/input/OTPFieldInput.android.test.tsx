import { describe, expect, it, vi } from 'vitest';
import { fireEvent, flushMicrotasks, render, screen } from '#test-utils';
import { OTPField } from '..';

vi.mock('@base-ui-solid/utils/platform', async () => {
  const actual = await vi.importActual<typeof import('@base-ui-solid/utils/platform')>(
    '@base-ui-solid/utils/platform',
  );

  return {
    ...actual,
    platform: {
      ...actual.platform,
      os: { ...actual.platform.os, android: true },
    },
  };
});

describe('<OTPField.Input /> Android', () => {
  it('commits each change during an IME composition', async () => {
    const onValueChange = vi.fn();

    await render(() => (
      <OTPField.Root length={3} validationType="alphanumeric" onValueChange={onValueChange}>
        <OTPField.Input />
        <OTPField.Input />
        <OTPField.Input />
      </OTPField.Root>
    ));

    const inputs = screen.getAllByRole<HTMLInputElement>('textbox');

    inputs[0].focus();
    await flushMicrotasks();

    fireEvent.compositionStart(inputs[0]);
    await flushMicrotasks();
    // Port note: React's `onChange` on text inputs is the native `input` event.
    fireEvent.input(inputs[0], { target: { value: 'a' } });
    await flushMicrotasks();

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith('a', expect.anything());
    expect(document.activeElement).toBe(inputs[1]);

    fireEvent.compositionEnd(inputs[0]);
    await flushMicrotasks();

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(inputs.map((input) => input.value)).toEqual(['a', '', '']);
  });
});
