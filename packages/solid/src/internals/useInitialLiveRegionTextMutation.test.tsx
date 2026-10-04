import { expect, describe, it } from 'vitest';
import { createRenderer, screen } from '#test-utils';
import { Show } from 'solid-js';
import {
  INITIAL_LIVE_REGION_TEXT_MUTATION_RESET_DELAY,
  useInitialLiveRegionTextMutation,
} from './useInitialLiveRegionTextMutation';

describe('useInitialLiveRegionTextMutation', () => {
  const { render } = createRenderer();

  it('does nothing when its ref is not attached', async () => {
    function Unattached() {
      useInitialLiveRegionTextMutation();
      return <div data-testid="status">Status</div>;
    }

    await render(() => <Unattached />);

    expect(screen.getByTestId('status')).toHaveTextContent('Status');
  });

  it('marks the text when the element appears after mount', async () => {
    function Status(props: { present: boolean }) {
      const ref = useInitialLiveRegionTextMutation<HTMLDivElement>(() => props.present);
      return (
        <Show when={props.present}>
          <div ref={ref} data-testid="status">
            Ready
          </div>
        </Show>
      );
    }

    const { setProps } = await render((overrides) => <Status present={false} {...overrides()} />);

    expect(screen.queryByTestId('status')).toBe(null);

    await setProps({ present: true });

    expect(screen.getByTestId('status').firstChild).toHaveProperty('nodeValue', 'Ready\u2060');
  });

  it('skips empty text nodes when finding the announcement text', async () => {
    const text = document.createTextNode('Status');
    const empty = document.createTextNode('');

    function Status() {
      const ref = useInitialLiveRegionTextMutation<HTMLDivElement>();

      // Port note: Solid maps layout and passive effects to the same phase. Attach the text
      // in the DOM ref so it exists before the hook's effect, like upstream's layout effect.
      return (
        <div
          ref={(element) => {
            ref(element);
            element.append(text, empty);
          }}
          data-testid="status"
        />
      );
    }

    await render(() => <Status />);

    expect(text.data).toBe('Status\u2060');
    expect(empty.data).toBe('');
  });

  describe('with fake timers', () => {
    const { render: renderWithFakeTimers, clock } = createRenderer({
      clockOptions: { shouldAdvanceTime: true },
    });

    clock.withFakeTimers();

    it('does not overwrite text that changes before the reset', async () => {
      function Status() {
        const ref = useInitialLiveRegionTextMutation<HTMLDivElement>();
        return (
          <div ref={ref} data-testid="status">
            Status
          </div>
        );
      }

      await renderWithFakeTimers(() => <Status />);
      const status = screen.getByTestId('status');
      status.firstChild!.nodeValue = 'Updated';

      clock.tick(INITIAL_LIVE_REGION_TEXT_MUTATION_RESET_DELAY);

      expect(status).toHaveTextContent('Updated');
    });
  });
});
