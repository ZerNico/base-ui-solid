import { describe } from 'vitest';
import { NavigationMenu } from 'base-ui-solid/navigation-menu';
import { createRenderer, describeConformance } from '#test-utils';

describe('<NavigationMenu.Item />', () => {
  createRenderer();

  describeConformance(NavigationMenu.Item, {
    refInstanceof: window.HTMLLIElement,
    wrap: (node) => <NavigationMenu.Root>{node()}</NavigationMenu.Root>,
  });
});
