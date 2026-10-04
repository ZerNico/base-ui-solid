import { describe } from 'vitest';
import { Menu } from 'base-ui-solid/menu';
import { describeConformance } from '#test-utils';

describe('<Menu.Portal />', () => {
  describeConformance((props) => <Menu.Portal keepMounted {...props} />, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => <Menu.Root>{node()}</Menu.Root>,
  });
});
