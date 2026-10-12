import { expect, describe, it } from 'vitest';
import { createSignal, Errored } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Toolbar } from 'base-ui-solid/toolbar';
import {
  createRenderer,
  describeConformance,
  fireEvent,
  flushMicrotasks,
  isJSDOM,
  popupFocusPropsTests,
  screen,
  waitFor,
} from '#test-utils';
import { Popover } from '..';

// Port note: `fireEvent` doesn't flush Solid, so assertions after it are preceded by
// `flushMicrotasks()`; `act(async () => {...})` runs its body and then awaits `flushMicrotasks()`.
// `React.useRef` becomes a `{ current }` object set by a ref callback.

describe('<Popover.Popup />', () => {
  const { render, clock } = createRenderer();

  describeConformance(Popover.Popup, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>{node()}</Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ),
  });

  it('throws a descriptive error when rendered outside <Popover.Root>', async () => {
    // Port note: contain intentional render errors so Solid's reactive graph keeps running.
    let caughtError: Error | undefined;
    await render(() => (
      <Errored
        fallback={(error) => {
          caughtError = error() as Error;
          return null;
        }}
      >
        {(() => <Popover.Popup />)()}
      </Errored>
    ));
    expect(caughtError?.message).toBe(
      'Base UI: PopoverRootContext is missing. Popover parts must be placed within <Popover.Root>.',
    );
  });

  it('throws a descriptive error when rendered outside <Popover.Positioner>', async () => {
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
          <Popover.Root open>
            <Popover.Portal>
              <Popover.Popup />
            </Popover.Portal>
          </Popover.Root>
        ))()}
      </Errored>
    ));
    expect(caughtError?.message).toBe(
      'Base UI: PopoverPositionerContext is missing. PopoverPositioner parts must be placed within <Popover.Positioner>.',
    );
  });

  it('should render the children', async () => {
    await render(() => (
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>Content</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    expect(screen.getByText('Content')).not.toBe(null);
  });

  popupFocusPropsTests({
    render,
    createComponent: (props) => (
      <Popover.Root>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup initialFocus={props.initialFocus} finalFocus={props.finalFocus}>
              {props.children}
              <Popover.Close>Close</Popover.Close>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ),
  });

  it.skipIf(isJSDOM)('focuses the popup when the active element becomes display:none', async () => {
    function TestComponent() {
      const [hidden, setHidden] = createSignal(false);

      return (
        <Popover.Root open>
          <Popover.Trigger>Open</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup data-testid="popup">
                <button
                  data-testid="hide-button"
                  style={{ display: hidden() ? 'none' : undefined }}
                  onClick={() => setHidden(true)}
                >
                  Hide
                </button>
                <input />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      );
    }

    const { user } = await render(() => <TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('hide-button')).toHaveFocus();
    });

    await user.click(screen.getByTestId('hide-button'));

    await waitFor(() => {
      expect(screen.getByTestId('popup')).toHaveFocus();
    });
  });

  describe('openOnHover: delay + click', () => {
    clock.withFakeTimers();

    it('returns focus to the trigger if opened by click before the hover delay completes', async () => {
      await render(() => (
        <Popover.Root>
          <Popover.Trigger openOnHover delay={300}>
            Open
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>
                <Popover.Close>Close</Popover.Close>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      const trigger = screen.getByText('Open');

      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);

      clock.tick(100);

      fireEvent.click(trigger);
      await flushMicrotasks();

      expect(screen.getByText('Close')).not.toBe(null);

      clock.tick(1000);
      await flushMicrotasks();

      fireEvent.click(screen.getByText('Close'));
      await flushMicrotasks();

      expect(trigger).toHaveFocus();
    });
  });

  describe('inside a toolbar', () => {
    function ToolbarPopover(props: { children: JSX.Element }) {
      return (
        <Toolbar.Root>
          <Toolbar.Button>First</Toolbar.Button>
          <Popover.Root>
            {/* Port note: `render={<Popover.Trigger />}` (React element) becomes a render function. */}
            <Toolbar.Button render={(props) => <Popover.Trigger {...(props as any)} />}>
              Open
            </Toolbar.Button>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>{props.children}</Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          <Toolbar.Button>Last</Toolbar.Button>
        </Toolbar.Root>
      );
    }

    // The popup is portaled but still bubbles React events up to `Toolbar.Root`, whose composite
    // handler would move the roving highlight and pull focus out of the open popup.
    it('does not relay composite keys from the popup to the toolbar', async () => {
      const { user } = await render(() => (
        <ToolbarPopover>
          <button type="button">Inside</button>
        </ToolbarPopover>
      ));

      // The toolbar itself still navigates with the same key, so a passing assertion below can't
      // come from an inert toolbar.
      await user.keyboard('[Tab]');
      expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
      await user.keyboard('[ArrowRight]');
      const trigger = screen.getByRole('button', { name: 'Open' });
      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });

      await user.keyboard('[Enter]');
      const insideButton = screen.getByRole('button', { name: 'Inside' });
      await waitFor(() => {
        expect(insideButton).toHaveFocus();
      });

      await user.keyboard('[ArrowRight]');
      await flushMicrotasks();

      expect(insideButton).toHaveFocus();
      expect(screen.getByRole('button', { name: 'Last' })).not.toHaveFocus();
    });

    // Shielding the toolbar must not disable the keys inside the popup: only propagation is
    // stopped, so native caret movement in popup content keeps working.
    it('keeps composite keys working inside the popup content', async () => {
      const { user } = await render(() => (
        <ToolbarPopover>
          <input defaultValue="ab" />
        </ToolbarPopover>
      ));

      await user.click(screen.getByRole('button', { name: 'Open' }));

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await waitFor(() => {
        expect(input).toHaveFocus();
      });

      input.setSelectionRange(0, 0);
      await flushMicrotasks();
      await user.keyboard('[ArrowRight]');

      expect(input.selectionStart).toBe(1);
      expect(screen.getByRole('button', { name: 'Last' })).not.toHaveFocus();
    });
  });
});
