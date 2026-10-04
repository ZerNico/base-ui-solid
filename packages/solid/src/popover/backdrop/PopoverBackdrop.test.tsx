import { expect, describe, it } from 'vitest';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { createRenderer, describeConformance, screen, waitFor } from '#test-utils';
import { Popover } from '..';

describe('<Popover.Backdrop />', () => {
  const { render } = createRenderer();

  describeConformance(Popover.Backdrop, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => <Popover.Root open>{node()}</Popover.Root>,
  });

  [false, true].forEach((controlled) => {
    it(`does not start an entry phase when initially open (controlled=${controlled})`, async () => {
      const statuses = new Set<Popover.Backdrop.State['transitionStatus']>();

      function RecordState(props: { state: Popover.Backdrop.State }) {
        // Port note: the state is a reactive object; the effect re-runs when its status changes.
        useIsoLayoutEffect(
          ([transitionStatus]) => {
            statuses.add(transitionStatus);
          },
          () => [props.state.transitionStatus],
        );
        return null;
      }

      await render(() => (
        <Popover.Root open={controlled ? true : undefined} defaultOpen={!controlled}>
          <Popover.Backdrop
            render={(props, state) => (
              <div {...props}>
                <RecordState state={state} />
              </div>
            )}
          />
        </Popover.Root>
      ));

      expect(statuses).toEqual(new Set([undefined]));
    });
  });

  it('sets `pointer-events: none` style on backdrop if opened by hover', async () => {
    const { user } = await render(() => (
      <Popover.Root>
        <Popover.Trigger delay={0} openOnHover>
          Open
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Backdrop data-testid="backdrop" />
          <Popover.Positioner>
            <Popover.Popup />
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    await user.hover(screen.getByText('Open'));

    expect(screen.getByTestId('backdrop').style.pointerEvents).toBe('none');
  });

  it('does not set `pointer-events: none` style on backdrop if opened by click', async () => {
    const { user } = await render(() => (
      <Popover.Root>
        <Popover.Trigger openOnHover>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Backdrop data-testid="backdrop" />
          <Popover.Positioner>
            <Popover.Popup />
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    await user.click(screen.getByText('Open'));

    await waitFor(() => {
      expect(screen.getByTestId('backdrop').style.pointerEvents).not.toBe('none');
    });
  });
});
