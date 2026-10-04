import { describe } from 'vitest';
import { Menu } from 'base-ui-solid/menu';
import { describeConformance } from '#test-utils';

describe('<Menu.Arrow />', () => {
  describeConformance(Menu.Arrow, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup>{node()}</Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ),
  });
});
