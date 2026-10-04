import { describe } from 'vitest';
import { NavigationMenu } from 'base-ui-solid/navigation-menu';
import { createRenderer, describeConformance } from '#test-utils';

describe('<NavigationMenu.Portal />', () => {
  createRenderer();

  describeConformance(NavigationMenu.Portal, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => <NavigationMenu.Root value="item">{node()}</NavigationMenu.Root>,
  });
});
