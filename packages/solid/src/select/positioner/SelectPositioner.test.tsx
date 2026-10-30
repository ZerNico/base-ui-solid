import { expect, describe, it } from 'vitest';
import { Select } from 'base-ui-solid/select';
import {
  screen,
  waitFor,
  createRenderer,
  describeConformance,
  isJSDOM,
  positionerConformanceTests,
} from '#test-utils';

function Trigger(props: Select.Trigger.Props) {
  return <Select.Trigger {...props} />;
}

describe('<Select.Positioner />', () => {
  const { render } = createRenderer();

  describeConformance(Select.Positioner, {
    refInstanceof: window.HTMLDivElement,
    wrap(node) {
      return (
        <Select.Root open>
          <Select.Portal>{node()}</Select.Portal>
        </Select.Root>
      );
    },
  });

  const triggerStyle = { width: '72px', height: '36px' };
  const popupStyle = { width: '52px', height: '24px' };

  positionerConformanceTests({
    render,
    stableState: false,
    createComponent: (props) => (
      <Select.Root {...props.root}>
        <Trigger {...props.trigger}>Trigger</Trigger>
        <Select.Portal>
          <Select.Positioner align="center" alignItemWithTrigger={false} {...props.positioner}>
            <Select.Popup {...props.popup}>Popup</Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    ),
  });

  describe.skipIf(isJSDOM)('kept-mounted positioner', () => {
    it('does not retain stale coordinates while closed', async () => {
      const { user } = await render(() => (
        <Select.Root defaultOpen>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Select.Portal>
            <Select.Positioner data-testid="positioner" alignItemWithTrigger={false}>
              <Select.Popup style={popupStyle}>Popup</Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      const positioner = screen.getByTestId('positioner');
      // Port note: Floating UI positioning settles asynchronously in Solid.
      await waitFor(() => {
        expect(positioner.style.transform).not.toBe('');
      });

      await user.keyboard('{Escape}');

      // The portal can remount around the close, so re-query the kept-mounted node.
      await waitFor(() => {
        expect(screen.getByTestId('positioner').hidden).toBe(true);
      });

      // Rendering the full-size popup at coordinates computed for the hidden (zero-size)
      // positioner can overflow the layout viewport on the next open, making mobile Chrome
      // zoom the page out. The positioner must sit at the viewport origin until positioned.
      const closedPositioner = screen.getByTestId('positioner');
      await waitFor(() => {
        expect(closedPositioner.style.position).toBe('fixed');
      });
      // Port note: Floating UI positioning settles asynchronously in Solid.
      await waitFor(() => {
        expect(closedPositioner.style.transform).toBe('');
      });
      // Port note: Floating UI positioning settles asynchronously in Solid.
      await waitFor(() => {
        expect(closedPositioner.style.top).toBe('0px');
      });
      // Port note: Floating UI positioning settles asynchronously in Solid.
      await waitFor(() => {
        expect(closedPositioner.style.left).toBe('0px');
      });
    });
  });
});
