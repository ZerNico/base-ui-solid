import { Errored } from 'solid-js';
import { describe, it, expect } from 'vitest';
import { NavigationMenu } from 'base-ui-solid/navigation-menu';
import { createRenderer, describeConformance } from '#test-utils';

describe('<NavigationMenu.Icon />', () => {
  const { render } = createRenderer();

  describeConformance(NavigationMenu.Icon, {
    refInstanceof: window.HTMLSpanElement,
    wrap: (node) => (
      <NavigationMenu.Root>
        <NavigationMenu.Item>{node()}</NavigationMenu.Item>
      </NavigationMenu.Root>
    ),
  });

  it('throws a descriptive error when rendered outside <NavigationMenu.Item>', async () => {
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
            <NavigationMenu.Icon />
          </NavigationMenu.Root>
        ))()}
      </Errored>
    ));
    expect(caughtError?.message).toBe(
      'Base UI: NavigationMenuItem parts must be used within a <NavigationMenu.Item>.',
    );
  });
});
