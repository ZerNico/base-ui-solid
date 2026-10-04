import { expect, vi, describe, beforeEach, it } from 'vitest';
import { createSignal } from 'solid-js';
import { Tooltip } from 'base-ui-solid/tooltip';
import { Toolbar } from 'base-ui-solid/toolbar';
import {
  createRenderer,
  describeConformance,
  fireEvent,
  flushMicrotasks,
  isJSDOM,
  resetBrowserPointer,
  screen,
  waitFor,
} from '#test-utils';

describe('<Tooltip.Trigger />', () => {
  // Tests here hover triggers with the real pointer and leave it resting on one, which the next
  // render would put a fresh trigger under, opening the tooltip before the test interacts.
  beforeEach(resetBrowserPointer);

  const { render } = createRenderer();

  describeConformance(Tooltip.Trigger, {
    refInstanceof: window.HTMLButtonElement,
    wrap: (node) => <Tooltip.Root>{node()}</Tooltip.Root>,
  });

  it('throws a descriptive error when rendered without a root or a handle', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(() => <Tooltip.Trigger>Trigger</Tooltip.Trigger>)).rejects.toThrow(
        'Base UI: <Tooltip.Trigger> must be either used within a <Tooltip.Root> component or provided with a handle.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('removes `data-popup-open` as soon as `open` becomes false', async () => {
    function TooltipWithPreventedUnmount() {
      const [open, setOpen] = createSignal(false);

      return (
        <Tooltip.Root
          open={open()}
          onOpenChange={(nextOpen, eventDetails) => {
            if (!nextOpen) {
              eventDetails.preventUnmountOnClose();
            }
            setOpen(nextOpen);
          }}
        >
          <Tooltip.Trigger
            data-testid="trigger"
            delay={0}
            closeDelay={0}
            style={{ 'pointer-events': 'none' }}
          >
            Trigger
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner>
              <Tooltip.Popup>Content</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      );
    }

    await render(() => <TooltipWithPreventedUnmount />);
    const trigger = screen.getByTestId('trigger');

    fireEvent.mouseEnter(trigger);
    fireEvent.mouseMove(trigger);
    await flushMicrotasks();
    expect(trigger).toHaveAttribute('data-popup-open');
    expect(screen.getByText('Content')).not.toBe(null);

    fireEvent.mouseLeave(trigger);
    await flushMicrotasks();
    expect(trigger).not.toHaveAttribute('data-popup-open');
    expect(screen.getByText('Content')).not.toBe(null);
  });

  it('opens when the rendered trigger element has its own id', async () => {
    // Port note: `render={<button … />}` (a React element) becomes a render function.
    const { user } = await render(() => (
      <Tooltip.Root>
        <Tooltip.Trigger
          delay={0}
          closeDelay={0}
          render={(props) => (
            <button {...props} id="custom-button" data-testid="trigger" type="button" />
          )}
        >
          Trigger
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup data-testid="popup">Content</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    ));

    const trigger = screen.getByTestId('trigger');

    expect(trigger).toHaveAttribute('id', 'custom-button');

    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByTestId('popup')).not.toBe(null);
    });
    expect(trigger).toHaveAttribute('data-popup-open');
  });

  it.skipIf(isJSDOM)(
    'opens on delayed hover when rendered as a disabled toolbar button',
    async () => {
      // Port note: `render={<Toolbar.Button … />}` (a React element) becomes a render function.
      const { user } = await render(() => (
        <Toolbar.Root>
          <Tooltip.Root>
            <Tooltip.Trigger
              delay={20}
              render={(props) => (
                <Toolbar.Button
                  {...(props as Toolbar.Button.Props)}
                  disabled
                  data-testid="trigger"
                />
              )}
            >
              Push
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner>
                <Tooltip.Popup data-testid="popup">Nothing to push</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Toolbar.Root>
      ));

      const trigger = screen.getByTestId('trigger');

      expect(trigger).not.toHaveAttribute('disabled');
      expect(trigger).toHaveAttribute('aria-disabled', 'true');

      await user.hover(trigger);

      await waitFor(() => {
        expect(screen.getByTestId('popup')).not.toBe(null);
      });
    },
  );
});
