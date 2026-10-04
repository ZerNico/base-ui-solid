import { flush } from 'solid-js';

import { expect, vi, describe, it } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { createRenderer, fireEvent, screen } from '#test-utils';

vi.mock('@base-ui-solid/utils/platform', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@base-ui-solid/utils/platform')>();
  return {
    ...actual,
    platform: {
      ...actual.platform,
      os: {
        ...actual.platform.os,
        android: true,
      },
    },
  };
});
describe('<Combobox.Input /> on Android', () => {
  const { render } = createRenderer();
  it('propagates changes during Android composition', async () => {
    const onInputValueChange = vi.fn();
    await render(() => (
      <Combobox.Root onInputValueChange={onInputValueChange}>
        <Combobox.Input />
      </Combobox.Root>
    ));
    const input = screen.getByRole('combobox');
    fireEvent.compositionStart(input);
    flush();
    fireEvent.input(input, { target: { value: 'a' } });
    flush();
    expect(onInputValueChange).toHaveBeenCalledWith('a', expect.anything());
  });
});
