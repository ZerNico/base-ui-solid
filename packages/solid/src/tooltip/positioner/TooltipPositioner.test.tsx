import { expect, describe, it } from 'vitest';
import { Errored, untrack } from 'solid-js';
import { Tooltip } from 'base-ui-solid/tooltip';
import {
  createRenderer,
  describeConformance,
  positionerConformanceTests,
  screen,
} from '#test-utils';

// Port note: `render={<div />}` (a React element) becomes the `div` tag name; the ref is forwarded
// through the props.
function Trigger(props: Tooltip.Trigger.Props) {
  return <Tooltip.Trigger {...props} render="div" />;
}

describe('<Tooltip.Positioner />', () => {
  const { render } = createRenderer();

  describeConformance(Tooltip.Positioner, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Tooltip.Root open>
        <Tooltip.Portal>{node()}</Tooltip.Portal>
      </Tooltip.Root>
    ),
  });

  describe('prop: side', () => {
    it('uses the side prop over the default', async () => {
      await render(() => (
        <Tooltip.Root open>
          <Trigger>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner data-testid="positioner" side="bottom" />
          </Tooltip.Portal>
        </Tooltip.Root>
      ));

      expect(screen.getByTestId('positioner')).toHaveAttribute('data-side', 'bottom');
    });
  });

  it('throws a descriptive error when rendered outside <Tooltip.Root>', async () => {
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
        <Tooltip.Positioner />
      </Errored>
    ));
    expect(() => {
      throw caughtError;
    }).toThrow(
      'Base UI: TooltipRootContext is missing. Tooltip parts must be placed within <Tooltip.Root>.',
    );
  });

  it('throws a descriptive error when rendered outside <Tooltip.Portal>', async () => {
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
          <Tooltip.Positioner />
        </Tooltip.Root>
      </Errored>
    ));
    expect(() => {
      throw caughtError;
    }).toThrow('Base UI: <Tooltip.Portal> is missing.');
  });

  positionerConformanceTests({
    render,
    viewport: true,
    defaultSide: 'top',
    defaultCollisionAvoidance: 'popup',
    createComponent: (props) => (
      <Tooltip.Root {...props.root}>
        <Trigger {...props.trigger}>Trigger</Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner {...props.positioner}>
            <Tooltip.Popup {...props.popup}>
              {props.viewport ? <Tooltip.Viewport>Popup</Tooltip.Viewport> : 'Popup'}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    ),
  });
});
