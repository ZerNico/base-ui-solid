import { Errored, untrack } from 'solid-js';
import { expect, describe, it } from 'vitest';
import { Tooltip } from 'base-ui-solid/tooltip';
import { createRenderer, describeConformance, screen } from '#test-utils';

describe('<Tooltip.Popup />', () => {
  const { render } = createRenderer();

  describeConformance(Tooltip.Popup, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Tooltip.Root open>
        <Tooltip.Portal>
          <Tooltip.Positioner>{node()}</Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    ),
  });

  it('should render the children', async () => {
    await render(() => (
      <Tooltip.Root open>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>Content</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    ));

    expect(screen.getByText('Content')).not.toBe(null);
  });

  it('throws a descriptive error when rendered outside <Tooltip.Positioner>', async () => {
    // Port note: capture the intentional error with Solid's error boundary so the reactive
    // scheduler stays live, then assert the same upstream exception.
    let caughtError: unknown;
    await render(() => (
      <Errored
        fallback={(error) => {
          caughtError = untrack(error);
          return null;
        }}
      >
        <Tooltip.Root open>
          <Tooltip.Portal>
            <Tooltip.Popup />
          </Tooltip.Portal>
        </Tooltip.Root>
      </Errored>
    ));
    expect(() => {
      throw caughtError;
    }).toThrow(
      'Base UI: TooltipPositionerContext is missing. TooltipPositioner parts must be placed within <Tooltip.Positioner>.',
    );
  });
});
