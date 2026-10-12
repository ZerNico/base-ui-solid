import { Autocomplete } from 'base-ui-solid/autocomplete';
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
    it.each([{ orientation: 'horizontal' as const }, { orientation: 'vertical' as const }])(
      'sets data-orientation to $orientation',
      async ({ orientation }) => {
        await render(() => <ListboxSeparator orientation={orientation} data-testid="separator" />);

        const separator = screen.getByTestId('separator');
        expect(separator).toHaveAttribute('data-orientation', orientation);
        expect(separator).not.toHaveAttribute('aria-orientation');
      },
    );
  });

  describe.each([
    ['Autocomplete.Separator', () => <Autocomplete.Separator data-testid="separator" />],
    ['Combobox.Separator', () => <Combobox.Separator data-testid="separator" />],
    ['Select.Separator', () => <Select.Separator data-testid="separator" />],
  ] as const)('%s', (_, separator) => {
    it('exposes the listbox separator behavior', async () => {
      await render(separator);
      const element = screen.getByTestId('separator');
      expect(element).toHaveAttribute('role', 'presentation');
      expect(element).toHaveAttribute('data-orientation', 'horizontal');
      expect(element).not.toHaveAttribute('aria-orientation');
    });
  });
});
