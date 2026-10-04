import { expect, describe, it } from 'vitest';
import { render, screen, describeConformance } from '#test-utils';
import { ListboxSeparator } from './ListboxSeparator';

describe('<ListboxSeparator />', () => {
  describeConformance(ListboxSeparator, {
    refInstanceof: window.HTMLDivElement,
  });

  it('has role="presentation" and defaults to horizontal', async () => {
    await render(() => <ListboxSeparator data-testid="separator" />);

    const separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('role', 'presentation');
    expect(separator).toHaveAttribute('data-orientation', 'horizontal');
    expect(separator).not.toHaveAttribute('aria-orientation');
  });

  describe('prop: orientation', () => {
    ['horizontal', 'vertical'].forEach((orientation) => {
      it(orientation, async () => {
        await render(() => (
          <ListboxSeparator
            orientation={orientation as ListboxSeparator.Props['orientation']}
            data-testid="separator"
          />
        ));

        const separator = screen.getByTestId('separator');
        expect(separator).toHaveAttribute('data-orientation', orientation);
        expect(separator).not.toHaveAttribute('aria-orientation');
      });
    });
  });

  // Port note: upstream renders `<Autocomplete.Separator />`, `<Combobox.Separator />` and
  // `<Select.Separator />` (each with `data-testid="separator"`). Those components aren't ported yet.
  describe.each([['Autocomplete.Separator'], ['Combobox.Separator'], ['Select.Separator']])(
    '%s',
    () => {
      // TODO(port): needs Autocomplete, Combobox, Select
      it.skip('exposes the listbox separator behavior', async () => {
        // Upstream renders the separator part and asserts `role="presentation"`,
        // `data-orientation="horizontal"` and no `aria-orientation` attribute.
      });
    },
  );
});
