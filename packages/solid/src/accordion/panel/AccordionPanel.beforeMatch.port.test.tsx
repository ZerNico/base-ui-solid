import { expect, describe, it } from 'vitest';
import { flush } from 'solid-js';
import {
  fireEvent,
  flushMicrotasks,
  isJSDOM,
  render,
  screen,
  waitForAnimationFrame,
} from '#test-utils';
import { Accordion } from '..';

function fireBeforeMatch(element: Element) {
  fireEvent(
    element,
    new window.Event('beforematch', {
      bubbles: true,
      cancelable: false,
    }),
  );
}

// Port note: upstream only covers `beforematch` on Collapsible. This checks that a single-open
// Accordion closes the other item when a match reveals a panel.
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
  },
);
