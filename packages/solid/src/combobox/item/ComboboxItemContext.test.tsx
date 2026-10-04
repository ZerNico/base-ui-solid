import { expect, vi, describe, it } from 'vitest';
import { createRenderer } from '#test-utils';
import { useComboboxItemContext } from './ComboboxItemContext';

describe('ComboboxItemContext', () => {
  const { render } = createRenderer();

  it('throws a descriptive error when used outside <Combobox.Item>', async () => {
    function Consumer() {
      useComboboxItemContext();
      return null;
    }

    // Port note: Chromium reports a caught render error again on window.
    const swallowError = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', swallowError);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(() => <Consumer />)).rejects.toThrow(
        'Base UI: ComboboxItemContext is missing. ComboboxItem parts must be placed within <Combobox.Item>.',
      );
    } finally {
      errorSpy.mockRestore();
      window.removeEventListener('error', swallowError);
    }
  });
});
