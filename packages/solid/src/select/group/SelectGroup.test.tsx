import { expect, describe, it } from 'vitest';
import { Select } from 'base-ui-solid/select';
import { describeConformance, render, screen } from '#test-utils';

describe('<Select.Group />', () => {
  describeConformance(Select.Group, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => <Select.Root open>{node()}</Select.Root>,
  });

  it('should render group with label', async () => {
    await render(() => (
      <Select.Root open>
        <Select.Positioner>
          <Select.Group>
            <Select.GroupLabel>Fruits</Select.GroupLabel>
            <Select.Item value="apple">Apple</Select.Item>
            <Select.Item value="banana">Banana</Select.Item>
          </Select.Group>
        </Select.Positioner>
      </Select.Root>
    ));

    expect(screen.getByRole('group')).toHaveAttribute('aria-labelledby');
    expect(screen.getByText('Fruits')).toBeVisible();
  });

  it('should associate label with group', async () => {
    await render(() => (
      <Select.Root open>
        <Select.Positioner>
          <Select.Group>
            <Select.GroupLabel>Vegetables</Select.GroupLabel>
            <Select.Item value="carrot">Carrot</Select.Item>
            <Select.Item value="lettuce">Lettuce</Select.Item>
          </Select.Group>
        </Select.Positioner>
      </Select.Root>
    ));

    const Group = screen.getByRole('group');
    const label = screen.getByText('Vegetables');
    expect(Group).toHaveAttribute('aria-labelledby', label.id);
  });
});
