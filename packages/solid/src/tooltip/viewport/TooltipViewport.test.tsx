import { expect, describe, it } from 'vitest';
import { Tooltip } from 'base-ui-solid/tooltip';
import {
  createRenderer,
  describeConformance,
  flushMicrotasks,
  isJSDOM,
  screen,
  viewportConformanceTests,
  waitFor,
} from '#test-utils';

// Port note: counterpart of upstream's `await act(async () => fn())`: run the action, then let
// Solid's batched updates (and the promise callbacks they queue) settle.
async function act(fn: () => unknown) {
  await fn();
  await flushMicrotasks();
}

describe('<Tooltip.Viewport />', () => {
  const { render } = createRenderer();

  describeConformance(Tooltip.Viewport, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Tooltip.Root open>
        <Tooltip.Trigger>Trigger</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>{node()}</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    ),
  });

  viewportConformanceTests({
    render,
    openOn: 'focus',
    createComponent: (props) => (
      <Tooltip.Root {...props.root}>
        {({ payload }) => (
          <>
            {props.triggers.map((trigger) => (
              <Tooltip.Trigger delay={0} {...trigger} />
            ))}
            <Tooltip.Portal {...props.portal}>
              <Tooltip.Positioner {...props.positioner}>
                <Tooltip.Popup {...props.popup}>
                  <Tooltip.Viewport {...props.viewport}>
                    {props.renderContent(payload)}
                  </Tooltip.Viewport>
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </>
        )}
      </Tooltip.Root>
    ),
  });

  it.skipIf(isJSDOM)('anchors the positioner from the far edge while it transitions', async () => {
    await render(() => (
      <Tooltip.Root>
        <style>{`[data-testid="positioner"] { transition: transform 100ms; }`}</style>
        {/* Leave room on the left so the popup does not flip. */}
        <Tooltip.Trigger
          delay={0}
          closeDelay={0}
          style={{ position: 'fixed', top: '200px', left: '300px' }}
        >
          Trigger
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner side="left" data-testid="positioner">
            <Tooltip.Popup>
              <Tooltip.Viewport>Content</Tooltip.Viewport>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    ));

    const trigger = screen.getByRole('button', { name: 'Trigger' });

    await act(async () => trigger.focus());

    const positioner = await screen.findByTestId('positioner');

    await waitFor(() => {
      expect(positioner).toHaveAttribute('data-side', 'left');
    });

    // A transitioning popup on the left side is positioned from the right edge so a size change
    // keeps its far edge in place.
    await waitFor(() => {
      expect(positioner.style.right).not.toBe('');
    });
    expect(positioner.style.left).toBe('');
  });

  it.skipIf(isJSDOM)('should mirror the instant animation type of the tooltip', async () => {
    await render(() => (
      <Tooltip.Root>
        <Tooltip.Trigger delay={0} closeDelay={0}>
          Trigger
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>
              <Tooltip.Viewport data-testid="viewport">Content</Tooltip.Viewport>
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    ));

    const trigger = screen.getByRole('button', { name: 'Trigger' });

    await act(async () => trigger.focus());

    await waitFor(() => {
      expect(screen.getByTestId('viewport')).toHaveAttribute('data-instant', 'focus');
    });
  });
});
