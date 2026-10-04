import { describe, it, expect } from 'vitest';
import { Menu } from 'base-ui-solid/menu';
import { createRenderer, describeConformance, screen } from '#test-utils';

describe('<Menu.RadioGroup />', () => {
  const { render } = createRenderer();
  describeConformance(Menu.RadioGroup, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => node(),
  });
  it('renders a div with the `group` role', async () => {
    await render(() => <Menu.RadioGroup />);
    expect(screen.getByRole('group')).toBeVisible();
  });
});
