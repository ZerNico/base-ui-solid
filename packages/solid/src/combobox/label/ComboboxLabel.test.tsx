import { expect, vi, describe, it } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { createRenderer, describeConformance, isJSDOM } from '#test-utils';

describe('<Combobox.Label />', () => {
  const { render } = createRenderer();
  describeConformance((props) => <Combobox.Label {...props} />, {
    refInstanceof: window.HTMLDivElement,
    wrap(node) {
      return (
        <Combobox.Root>
          {node()}
          <Combobox.Trigger>Open</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.Input />
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      );
    },
  });
  it('warns without relying on React.captureOwnerStack when labeling an external input', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await render(() => (
        <Combobox.Root>
          <Combobox.Label>Fruit</Combobox.Label>
          <Combobox.Input />
        </Combobox.Root>
      ));
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('<Combobox.Label> labels <Combobox.Trigger> only.'),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
  it.skipIf(!isJSDOM)('does not run the development warning in production', async () => {
    // Port note: Solid uses the module's IS_DEV flag and has no captureOwnerStack.
    vi.resetModules();
    vi.doMock('@base-ui-solid/utils/isDev', () => ({ IS_DEV: false }));
    const { Combobox } = await import('base-ui-solid/combobox');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await render(() => (
        <Combobox.Root>
          <Combobox.Label>Fruit</Combobox.Label>
          <Combobox.Input />
        </Combobox.Root>
      ));
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
      vi.doUnmock('@base-ui-solid/utils/isDev');
      vi.resetModules();
    }
  });
});
