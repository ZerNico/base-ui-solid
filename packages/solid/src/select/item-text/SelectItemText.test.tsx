import { expect, vi, describe, it } from 'vitest';
import { Select } from 'base-ui-solid/select';
import { describeConformance, render } from '#test-utils';

describe('<Select.ItemText />', () => {
  describeConformance(Select.ItemText, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Select.Root open>
        <Select.Positioner>
          <Select.Item value="">{node()}</Select.Item>
        </Select.Positioner>
      </Select.Root>
    ),
  });

  it('throws a descriptive error when rendered outside <Select.Item>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Port note: the intentional render failure emits Solid's REACTIVITY_HALTED repair hint.
    const originalWarn = console.warn;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args) => {
      if (!String(args[0]).includes('[REACTIVITY_HALTED]')) {
        originalWarn(...args);
      }
    });
    // Port note: when a part throws below another part's element, Solid rethrows the error that
    // `render` rejects with once more as an uncaught error (the browser reports it through
    // `window`'s `error` event). Swallow that duplicate report only.
    const handleWindowError = (event: ErrorEvent) => {
      if (event.message.includes('SelectItemContext is missing')) {
        event.preventDefault();
      }
    };
    window.addEventListener('error', handleWindowError);

    try {
      await expect(
        render(() => (
          <Select.Root open>
            <Select.Positioner>
              <Select.ItemText />
            </Select.Positioner>
          </Select.Root>
        )),
      ).rejects.toThrow(
        'Base UI: SelectItemContext is missing. SelectItem parts must be placed within <Select.Item>.',
      );
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
    } finally {
      window.removeEventListener('error', handleWindowError);
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
