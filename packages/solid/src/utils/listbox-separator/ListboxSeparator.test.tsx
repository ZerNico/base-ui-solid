import { Combobox } from 'base-ui-solid/combobox';
import { Select } from 'base-ui-solid/select';
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

  // TODO(port): needs Autocomplete. Keep the real body for every available separator.
  describe.each([
    ['Autocomplete.Separator', null],
    ['Combobox.Separator', () => <Combobox.Separator data-testid="separator" />],
    ['Select.Separator', () => <Select.Separator data-testid="separator" />],
  ] as const)('%s', (_, separator) => {
    it('exposes the listbox separator behavior', async (context) => {
      // TODO(port): needs Autocomplete for its row.
      if (separator == null) {
        context.skip();
        return;
      }
      await render(separator!);
      const element = screen.getByTestId('separator');
      expect(element).toHaveAttribute('role', 'presentation');
      expect(element).toHaveAttribute('data-orientation', 'horizontal');
      expect(element).not.toHaveAttribute('aria-orientation');
    });
  });
});
