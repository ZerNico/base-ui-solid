import { Errored } from 'solid-js';
import { beforeEach, expect, vi, describe, it } from 'vitest';
import { NavigationMenu } from 'base-ui-solid/navigation-menu';
import { createRenderer, describeConformance } from '#test-utils';

const useAnchorPositioningSpy = vi.hoisted(() => vi.fn());

vi.mock('../../internals/useAnchorPositioning', async () => {
  const actual = await vi.importActual<typeof import('../../internals/useAnchorPositioning')>(
    '../../internals/useAnchorPositioning',
  );

  return {
    ...actual,
    useAnchorPositioning: ((...args: Parameters<typeof actual.useAnchorPositioning>) => {
      useAnchorPositioningSpy(...args);
      return actual.useAnchorPositioning(...args);
    }) satisfies typeof actual.useAnchorPositioning,
  };
});

describe('<NavigationMenu.Positioner />', () => {
  const { render } = createRenderer();

  beforeEach(() => {
    useAnchorPositioningSpy.mockClear();
  });

  describeConformance(NavigationMenu.Positioner, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <NavigationMenu.Root value="test">
        <NavigationMenu.Portal>{node()}</NavigationMenu.Portal>
      </NavigationMenu.Root>
    ),
  });

  it('uses the layout viewport', async () => {
    await render(() => (
      <NavigationMenu.Root value="test">
        <NavigationMenu.Portal>
          <NavigationMenu.Positioner />
        </NavigationMenu.Portal>
      </NavigationMenu.Root>
    ));

    expect(useAnchorPositioningSpy.mock.lastCall?.[0].shift).toEqual({
      rootBoundary: 'layoutViewport',
    });
  });

  it('throws a descriptive error when rendered outside <NavigationMenu.Portal>', async () => {
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
          <NavigationMenu.Root value="test">
            <NavigationMenu.Positioner />
          </NavigationMenu.Root>
        ))()}
      </Errored>
    ));
    expect(caughtError?.message).toBe('Base UI: <NavigationMenu.Portal> is missing.');
  });
});
