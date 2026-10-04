import { expect, vi, describe, it } from 'vitest';
import { createRenderer } from '#test-utils';
import { useComboboxPortalContext } from './ComboboxPortalContext';

describe('ComboboxPortalContext', () => {
  const { render } = createRenderer();

  it('throws a descriptive error when used outside <Combobox.Portal>', async () => {
    function Consumer() {
      useComboboxPortalContext();
      return null;
    }

    // Port note: Chromium reports a caught render error again on window.
    const swallowError = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', swallowError);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(() => <Consumer />)).rejects.toThrow(
        'Base UI: <Combobox.Portal> is missing.',
      );
    } finally {
      errorSpy.mockRestore();
      window.removeEventListener('error', swallowError);
    }
  });
});
