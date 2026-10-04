import { describe, it, expect } from 'vitest';
import { renderToString, screen, waitFor } from '#test-utils';
import { InputOutsidePopupFixture } from '../root/ComboboxRoot.fixtures';

// Port-specific: Solid runs refs while hydrating, where it skips attribute writes.
describe('<Combobox.Trigger /> (port)', () => {
  it('drops the input-inside-popup attributes after hydration when the input is outside the popup', async () => {
    const { hydrate } = await renderToString(InputOutsidePopupFixture);
    // The server can't know where the input is, like upstream.
    expect(screen.getByTestId('trigger')).toHaveAttribute('role', 'combobox');

    hydrate();

    await waitFor(() => {
      expect(screen.getByTestId('trigger')).not.toHaveAttribute('role');
    });
    const trigger = screen.getByTestId('trigger');
    expect(trigger).toHaveAttribute('tabindex', '-1');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  });
});
