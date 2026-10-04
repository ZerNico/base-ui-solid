import { expect, describe, it } from 'vitest';
import { Select } from 'base-ui-solid/select';
import { screen, waitFor, createRenderer, describeConformance, isJSDOM } from '#test-utils';

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

  const baselineX = 10;
  const baselineY = 36;
  const popupWidth = 52;
  const popupHeight = 24;
  const anchorWidth = 72;
  const anchorHeight = 36;
  const triggerStyle = { width: `${anchorWidth}px`, height: `${anchorHeight}px` };
  const popupStyle = { width: `${popupWidth}px`, height: `${popupHeight}px` };

  describe.skipIf(isJSDOM)('prop: sideOffset', () => {
    it('offsets the side when a number is specified', async () => {
      const sideOffset = 7;
      await render(() => (
        <Select.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Select.Portal>
            <Select.Positioner
              data-testid="positioner"
              align="center"
              sideOffset={sideOffset}
              alignItemWithTrigger={false}
            >
              <Select.Popup style={popupStyle}>Popup</Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      // Port note: Floating UI positioning settles asynchronously in Solid.
      await waitFor(() => {
        expect(screen.getByTestId('positioner').style.transform).toBe(
          `translate(${baselineX}px, ${baselineY + sideOffset}px)`,
        );
      });
    });

    it('offsets the side when a function is specified', async () => {
      await render(() => (
        <Select.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Select.Portal>
            <Select.Positioner
              data-testid="positioner"
              align="center"
              sideOffset={(data) => data.positioner.width + data.anchor.width}
              alignItemWithTrigger={false}
            >
              <Select.Popup style={popupStyle}>Popup</Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      // Port note: Floating UI positioning settles asynchronously in Solid.
      await waitFor(() => {
        expect(screen.getByTestId('positioner').style.transform).toBe(
          `translate(${baselineX}px, ${baselineY + popupWidth + anchorWidth}px)`,
        );
      });
    });

    it('can read the latest side inside sideOffset', async () => {
      let side = 'none';
      await render(() => (
        <Select.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Select.Portal>
            <Select.Positioner
              side="left"
              align="center"
              data-testid="positioner"
              alignItemWithTrigger={false}
              sideOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Select.Popup style={popupStyle}>Popup</Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      // correctly flips the side in the browser
      // Port note: Floating UI positioning settles asynchronously in Solid.
      await waitFor(() => {
        expect(side).toBe('right');
      });
    });

    it('can read the latest align inside sideOffset', async () => {
      let align = 'none';
      await render(() => (
        <Select.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Select.Portal>
            <Select.Positioner
              side="right"
              align="start"
              data-testid="positioner"
              alignItemWithTrigger={false}
              sideOffset={(data) => {
                align = data.align;
                return 0;
              }}
            >
              <Select.Popup style={popupStyle}>Popup</Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      // correctly flips the align in the browser
      // Port note: Floating UI positioning settles asynchronously in Solid.
      await waitFor(() => {
        expect(align).toBe('end');
      });
    });

    it('reads logical side inside sideOffset', async () => {
      let side = 'none';
      await render(() => (
        <Select.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Select.Portal>
            <Select.Positioner
              side="inline-start"
              data-testid="positioner"
              alignItemWithTrigger={false}
              sideOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Select.Popup style={popupStyle}>Popup</Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      // correctly flips the side in the browser
      // Port note: Floating UI positioning settles asynchronously in Solid.
      await waitFor(() => {
        expect(side).toBe('inline-end');
      });
    });
  });

  describe.skipIf(isJSDOM)('prop: alignOffset', () => {
    it('offsets the align when a number is specified', async () => {
      const alignOffset = 7;
      await render(() => (
        <Select.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Select.Portal>
            <Select.Positioner
              data-testid="positioner"
              align="center"
              alignOffset={alignOffset}
              alignItemWithTrigger={false}
            >
              <Select.Popup style={popupStyle}>Popup</Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      // Port note: Floating UI positioning settles asynchronously in Solid.
      await waitFor(() => {
        expect(screen.getByTestId('positioner').style.transform).toBe(
          `translate(${baselineX + alignOffset}px, ${baselineY}px)`,
        );
      });
    });

    it('offsets the align when a function is specified', async () => {
      await render(() => (
        <Select.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Select.Portal>
            <Select.Positioner
              data-testid="positioner"
              align="center"
              alignItemWithTrigger={false}
              alignOffset={(data) => data.positioner.width}
            >
              <Select.Popup style={popupStyle}>Popup</Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      // Port note: Floating UI positioning settles asynchronously in Solid.
      await waitFor(() => {
        expect(screen.getByTestId('positioner').style.transform).toBe(
          `translate(${baselineX + popupWidth}px, ${baselineY}px)`,
        );
      });
    });

    it('can read the latest side inside alignOffset', async () => {
      let side = 'none';
      await render(() => (
        <Select.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Select.Portal>
            <Select.Positioner
              side="left"
              align="center"
              data-testid="positioner"
              alignItemWithTrigger={false}
              alignOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Select.Popup style={popupStyle}>Popup</Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      // correctly flips the side in the browser
      // Port note: Floating UI positioning settles asynchronously in Solid.
      await waitFor(() => {
        expect(side).toBe('right');
      });
    });

    it('can read the latest align inside alignOffset', async () => {
      let align = 'none';
      await render(() => (
        <Select.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Select.Portal>
            <Select.Positioner
              side="right"
              align="start"
              data-testid="positioner"
              alignItemWithTrigger={false}
              alignOffset={(data) => {
                align = data.align;
                return 0;
              }}
            >
              <Select.Popup style={popupStyle}>Popup</Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      // correctly flips the align in the browser
      // Port note: Floating UI positioning settles asynchronously in Solid.
      await waitFor(() => {
        expect(align).toBe('end');
      });
    });

    it('reads logical side inside alignOffset', async () => {
      let side = 'none';
      await render(() => (
        <Select.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Select.Portal>
            <Select.Positioner
              side="inline-start"
              data-testid="positioner"
              alignItemWithTrigger={false}
              alignOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Select.Popup style={popupStyle}>Popup</Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      // correctly flips the side in the browser
      // Port note: Floating UI positioning settles asynchronously in Solid.
      await waitFor(() => {
        expect(side).toBe('inline-end');
      });
    });
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
