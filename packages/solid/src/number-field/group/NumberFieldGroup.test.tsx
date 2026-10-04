import { describe, it, expect } from 'vitest';
import { render, screen, describeConformance } from '#test-utils';
import { NumberField } from '..';

describe('<NumberField.Group />', () => {
  describeConformance(NumberField.Group, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => <NumberField.Root>{node()}</NumberField.Root>,
  });

  it('has role prop', async () => {
    await render(() => (
      <NumberField.Root>
        <NumberField.Group />
      </NumberField.Root>
    ));
    expect(screen.queryByRole('group')).not.toBe(null);
  });
});
