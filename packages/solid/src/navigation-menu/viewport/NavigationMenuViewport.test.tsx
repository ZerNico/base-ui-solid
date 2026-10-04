import { describe } from 'vitest';
import { NavigationMenu } from 'base-ui-solid/navigation-menu';
import { createRenderer, describeConformance } from '#test-utils';

describe('<NavigationMenu.Viewport />', () => {
  createRenderer();

  describeConformance(NavigationMenu.Viewport, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => <NavigationMenu.Root>{node()}</NavigationMenu.Root>,
  });
});
