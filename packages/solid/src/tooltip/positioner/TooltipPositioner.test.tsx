import { expect, describe, it } from 'vitest';
import { createSignal, Errored, untrack } from 'solid-js';
import { Tooltip } from 'base-ui-solid/tooltip';
import {
  createRenderer,
  describeConformance,
  isJSDOM,
  screen,
  waitFor,
  waitForPositioned,
} from '#test-utils';

// Port note: `render={<div />}` (a React element) becomes the `div` tag name; the ref is forwarded
// through the props.
function Trigger(props: Tooltip.Trigger.Props) {
  return <Tooltip.Trigger {...props} render="div" />;
}

// Port note: React's `act` lets Floating UI's async position computation settle during `render`;
// here it lands a few microtasks later, so the tests wait for the positioner first.
async function waitForPositioner() {
  await waitForPositioned(screen.getByTestId('positioner'));
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
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner data-testid="positioner" sideOffset={sideOffset}>
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));
      await waitForPositioner();

      expect(screen.getByTestId('positioner').getBoundingClientRect()).toMatchObject({
        x: baselineX,
        y: baselineY + sideOffset,
      });
    });

    it('offsets the side when a function is specified', async () => {
      await render(() => (
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              data-testid="positioner"
              sideOffset={(data) => data.positioner.width + data.anchor.width}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));
      await waitForPositioner();

      expect(screen.getByTestId('positioner').getBoundingClientRect()).toMatchObject({
        x: baselineX,
        y: baselineY + popupWidth + anchorWidth,
      });
    });

    it('can read the latest side inside sideOffset', async () => {
      let side = 'none';
      await render(() => (
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              side="left"
              data-testid="positioner"
              sideOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));
      await waitForPositioner();

      // correctly flips the side in the browser
      expect(side).toBe('right');
    });

    it('can read the latest align inside sideOffset', async () => {
      let align = 'none';
      await render(() => (
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              side="right"
              align="start"
              data-testid="positioner"
              sideOffset={(data) => {
                align = data.align;
                return 0;
              }}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));
      await waitForPositioner();

      // correctly flips the align in the browser
      expect(align).toBe('end');
    });

    it('reads logical side inside sideOffset', async () => {
      let side = 'none';
      await render(() => (
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              side="inline-start"
              data-testid="positioner"
              sideOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));
      await waitForPositioner();

      // correctly flips the side in the browser
      expect(side).toBe('inline-end');
    });
  });

  describe.skipIf(isJSDOM)('prop: alignOffset', () => {
    it('offsets the align when a number is specified', async () => {
      const alignOffset = 7;
      await render(() => (
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner data-testid="positioner" alignOffset={alignOffset}>
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));
      await waitForPositioner();

      expect(screen.getByTestId('positioner').getBoundingClientRect()).toMatchObject({
        x: baselineX + alignOffset,
        y: baselineY,
      });
    });

    it('offsets the align when a function is specified', async () => {
      await render(() => (
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              data-testid="positioner"
              alignOffset={(data) => data.positioner.width}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));
      await waitForPositioner();

      expect(screen.getByTestId('positioner').getBoundingClientRect()).toMatchObject({
        x: baselineX + popupWidth,
        y: baselineY,
      });
    });

    it('can read the latest side inside alignOffset', async () => {
      let side = 'none';
      await render(() => (
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              side="left"
              data-testid="positioner"
              alignOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));
      await waitForPositioner();

      // correctly flips the side in the browser
      expect(side).toBe('right');
    });

    it('can read the latest align inside alignOffset', async () => {
      let align = 'none';
      await render(() => (
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              side="right"
              align="start"
              data-testid="positioner"
              alignOffset={(data) => {
                align = data.align;
                return 0;
              }}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));
      await waitForPositioner();

      // correctly flips the align in the browser
      expect(align).toBe('end');
    });

    it('reads logical side inside alignOffset', async () => {
      let side = 'none';
      await render(() => (
        <Tooltip.Root open>
          <Trigger style={triggerStyle}>Trigger</Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              side="inline-start"
              data-testid="positioner"
              alignOffset={(data) => {
                side = data.side;
                return 0;
              }}
            >
              <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ));
      await waitForPositioner();

      // correctly flips the side in the browser
      expect(side).toBe('inline-end');
    });
  });

  it.skipIf(isJSDOM)('uses transform positioning without Viewport', async () => {
    const { unmount } = await render(() => (
      <Tooltip.Root open>
        <Trigger style={triggerStyle}>Trigger</Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner data-testid="positioner">
            <Tooltip.Popup style={popupStyle}>Popup</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    ));

    const positioner = screen.getByTestId('positioner');
    await waitFor(() => {
      expect(positioner.style.transform).not.toBe('');
    });
    unmount();
  });

  it.skipIf(isJSDOM)('uses top/left positioning with Viewport', async () => {
    const { unmount } = await render(() => (
      <Tooltip.Root open>
        <Trigger style={triggerStyle}>Trigger</Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner data-testid="positioner">
            <Tooltip.Popup style={popupStyle}>
              <Tooltip.Viewport>Popup</Tooltip.Viewport>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    ));

    const positioner = screen.getByTestId('positioner');
    await waitForPositioned(positioner);
    expect(positioner.style.transform).toBe('');
    unmount();
  });

  it.skipIf(isJSDOM)('updates positioning when Viewport mounts and unmounts', async () => {
    function App() {
      const [showViewport, setShowViewport] = createSignal(false);

      return (
        <>
          <button onClick={() => setShowViewport((value) => !value)}>Toggle Viewport</button>
          <Tooltip.Root open>
            <Trigger style={triggerStyle}>Trigger</Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner data-testid="positioner">
                <Tooltip.Popup style={popupStyle}>
                  {showViewport() ? <Tooltip.Viewport>Popup</Tooltip.Viewport> : 'Popup'}
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </>
      );
    }

    const { user } = await render(() => <App />);
    const positioner = screen.getByTestId('positioner');
    await waitForPositioner();

    expect(positioner.style.transform).not.toBe('');

    await user.click(screen.getByRole('button', { name: 'Toggle Viewport' }));
    await waitFor(() => {
      expect(positioner.style.transform).toBe('');
    });

    await user.click(screen.getByRole('button', { name: 'Toggle Viewport' }));
    await waitFor(() => {
      expect(positioner.style.transform).not.toBe('');
    });
  });
});
