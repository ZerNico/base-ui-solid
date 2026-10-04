import { describe } from 'vitest';
import { NavigationMenu } from 'base-ui-solid/navigation-menu';
import { createRenderer, describeConformance } from '#test-utils';

describe('<NavigationMenu.Popup />', () => {
  createRenderer();

  describeConformance(NavigationMenu.Popup, {
    refInstanceof: window.HTMLElement,
    wrap: (node) => (
      <NavigationMenu.Root value="test">
        <NavigationMenu.Portal>
          <NavigationMenu.Positioner>{node()}</NavigationMenu.Positioner>
        </NavigationMenu.Portal>
      </NavigationMenu.Root>
    ),
  });
});
