import { expect, describe, it } from 'vitest';
import { Tooltip } from 'base-ui-solid/tooltip';
import {
  createRenderer,
  describeConformance,
  isJSDOM,
  screen,
  waitForPositioned,
} from '#test-utils';

describe('<Tooltip.Arrow />', () => {
  const { render } = createRenderer();

  describeConformance(Tooltip.Arrow, {
    refInstanceof: window.Element,
    wrap: (node) => (
      <Tooltip.Root open>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>{node()}</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    ),
  });

  function ArrowTooltip(props: { arrowPadding?: number; triggerWidth?: number }) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0 }}>
        <Tooltip.Root open>
          <Tooltip.Trigger style={{ width: `${props.triggerWidth ?? 20}px`, height: '20px' }}>
            T
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner side="bottom" arrowPadding={props.arrowPadding}>
              <Tooltip.Popup style={{ width: '200px', height: '40px' }}>
                <Tooltip.Arrow data-testid="arrow" style={{ width: '10px', height: '10px' }} />
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </div>
    );
  }

  it('is hidden from assistive technology and mirrors the resolved side', async () => {
    await render(() => <ArrowTooltip />);

    const arrow = screen.getByTestId('arrow');

    expect(arrow).toHaveAttribute('aria-hidden', 'true');
    expect(arrow).toHaveAttribute('data-side', 'bottom');
    expect(arrow).toHaveAttribute('data-open');
  });

  it.skipIf(isJSDOM)('is marked uncentered when it cannot point at the anchor', async () => {
    await render(() => <ArrowTooltip arrowPadding={40} />);
    // Port note: React's `act` lets Floating UI's async position computation settle during
    // `render`; here it lands a few microtasks later, so wait for the positioner first.
    await waitForPositioned(screen.getByTestId('arrow').parentElement!.parentElement!);

    expect(screen.getByTestId('arrow')).toHaveAttribute('data-uncentered');
  });

  it.skipIf(isJSDOM)('is not marked uncentered when it can point at the anchor', async () => {
    await render(() => <ArrowTooltip arrowPadding={0} triggerWidth={200} />);
    // Port note: see above.
    await waitForPositioned(screen.getByTestId('arrow').parentElement!.parentElement!);

    expect(screen.getByTestId('arrow')).not.toHaveAttribute('data-uncentered');
  });
});
