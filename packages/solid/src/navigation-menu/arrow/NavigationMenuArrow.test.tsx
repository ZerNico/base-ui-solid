import { Errored } from 'solid-js';
import { describe, it, expect } from 'vitest';
import { NavigationMenu } from 'base-ui-solid/navigation-menu';
import { createRenderer, describeConformance } from '#test-utils';

describe('<NavigationMenu.Arrow />', () => {
  const { render } = createRenderer();

  describeConformance(NavigationMenu.Arrow, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <NavigationMenu.Root value="test">
        <NavigationMenu.Portal>
          <NavigationMenu.Positioner>{node()}</NavigationMenu.Positioner>
        </NavigationMenu.Portal>
      </NavigationMenu.Root>
    ),
  });

  it('throws a descriptive error when rendered outside <NavigationMenu.Positioner>', async () => {
    // Port note: contain intentional render errors so Solid's reactive graph keeps running.
    let caughtError: Error | undefined;
    await render(() => (
      <Errored
        fallback={(error) => {
          caughtError = error() as Error;
          return null;
        }}
      >
        {(() => (
          <NavigationMenu.Root>
            <NavigationMenu.Arrow />
          </NavigationMenu.Root>
        ))()}
      </Errored>
    ));
    expect(caughtError?.message).toBe(
      'Base UI: NavigationMenuPositionerContext is missing. NavigationMenuPositioner parts must be placed within <NavigationMenu.Positioner>.',
    );
  });
});
