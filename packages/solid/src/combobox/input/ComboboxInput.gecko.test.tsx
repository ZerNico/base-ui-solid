import { expect, vi, describe, it } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { DirectionProvider } from 'base-ui-solid/direction-provider';
import { createRenderer, screen } from '#test-utils';

vi.mock('@base-ui-solid/utils/platform', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@base-ui-solid/utils/platform')>();
  return {
    ...actual,
    platform: {
      ...actual.platform,
      engine: {
        ...actual.platform.engine,
        gecko: true,
      },
    },
  };
});
describe('<Combobox.Input /> in Gecko RTL', () => {
  const { render } = createRenderer();
  it('uses Gecko RTL caret positions for Home and End', async () => {
    const { user } = await render(() => (
      <DirectionProvider direction="rtl">
        <Combobox.Root defaultInputValue="apple">
          <Combobox.Input />
        </Combobox.Root>
      </DirectionProvider>
    ));
    const input = screen.getByRole<HTMLInputElement>('combobox');
    input.focus();
    await user.keyboard('{Home}');
    expect(input.selectionStart).toBe(input.value.length);
    await user.keyboard('{End}');
    expect(input.selectionStart).toBe(0);
  });
});
