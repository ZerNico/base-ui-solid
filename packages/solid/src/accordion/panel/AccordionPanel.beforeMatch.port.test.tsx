import { expect, describe, it, vi } from 'vitest';
import { flush } from 'solid-js';
import {
  fireEvent,
  flushMicrotasks,
  isJSDOM,
  render,
  screen,
  waitFor,
  waitForAnimationFrame,
} from '#test-utils';
import { Accordion } from '..';
import { REASONS } from '../../internals/reasons';

function fireBeforeMatch(element: Element) {
  fireEvent(
    element,
    new window.Event('beforematch', {
      bubbles: true,
      cancelable: false,
    }),
  );
}

describe.skipIf(isJSDOM || !('onbeforematch' in window))(
  '<Accordion.Panel /> beforematch (port)',
  () => {
    it('opens the matched item and closes the other item', async () => {
      await render(() => (
        <Accordion.Root defaultValue={[0]} hiddenUntilFound>
          <Accordion.Item value={0}>
            <Accordion.Header>
              <Accordion.Trigger>Trigger 0</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel data-testid="panel-0">Panel 0</Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value={1}>
            <Accordion.Header>
              <Accordion.Trigger>Trigger 1</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel data-testid="panel-1">Panel 1</Accordion.Panel>
          </Accordion.Item>
        </Accordion.Root>
      ));

      const panel1 = screen.getByTestId('panel-1');
      expect(panel1).toHaveAttribute('hidden', 'until-found');
      await waitForAnimationFrame();

      fireBeforeMatch(panel1);
      flush();
      await flushMicrotasks();

      expect(screen.getByTestId('panel-1')).toHaveAttribute('data-open');
      expect(screen.getByTestId('panel-0')).toHaveAttribute('hidden');
      expect(screen.getByRole('button', { name: 'Trigger 1' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect(screen.getByRole('button', { name: 'Trigger 0' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });

    it('re-collapses a canceled reveal and keeps motion on the next open', async () => {
      const handleItemOpenChange = vi.fn(
        (nextOpen: boolean, eventDetails: Accordion.Item.ChangeEventDetails) => {
          if (eventDetails.reason === REASONS.none) {
            eventDetails.cancel();
          }
        },
      );

      const { user } = await render(() => (
        <>
          <style>{`
            .transition-test-panel {
              overflow: hidden;
              height: var(--accordion-panel-height);
              transition-property: height;
              transition-duration: 999ms;
              transition-timing-function: linear;
            }

            .transition-test-panel[data-starting-style],
            .transition-test-panel[data-ending-style] {
              height: 0;
            }
          `}</style>
          <Accordion.Root hiddenUntilFound>
            <Accordion.Item value={0} onOpenChange={handleItemOpenChange}>
              <Accordion.Header>
                <Accordion.Trigger>Trigger 0</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel
                class="transition-test-panel"
                data-testid="panel-0"
                style={{ 'transition-duration': '123ms' }}
              >
                Panel 0
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        </>
      ));

      const panel = screen.getByTestId('panel-0');
      const trigger = screen.getByRole('button', { name: 'Trigger 0' });
      expect(panel).toHaveAttribute('hidden', 'until-found');
      await waitForAnimationFrame();

      fireBeforeMatch(panel);
      flush();
      // The browser drops `hidden` as part of revealing the match.
      panel.removeAttribute('hidden');

      expect(handleItemOpenChange).toHaveBeenCalledOnce();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      await waitFor(() => {
        expect(panel).toHaveAttribute('hidden', 'until-found');
      });

      // A canceled reveal must not consume the motion of the next ordinary open.
      await user.click(trigger);
      expect(panel).toHaveAttribute('data-open');
      expect(panel.style.transitionDuration).toBe('123ms');
    });
  },
);
