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
import { Collapsible } from '..';

function fireBeforeMatch(element: Element) {
  fireEvent(
    element,
    new window.Event('beforematch', {
      bubbles: true,
      cancelable: false,
    }),
  );
}

// Port note: guards the no-motion open/close path and the styles restored when the owner is
// disposed mid-transition. The duration test replaces upstream's `React.Activity` test, which is
// skipped as React-only.
describe('<Collapsible.Panel /> lifecycle (port)', () => {
  it('keeps an initially closed no-motion open, close and reopen out of the starting phase', async () => {
    await render(() => (
      <Collapsible.Root>
        <Collapsible.Trigger>Trigger</Collapsible.Trigger>
        <Collapsible.Panel data-testid="panel">Content</Collapsible.Panel>
      </Collapsible.Root>
    ));

    const trigger = screen.getByRole('button', { name: 'Trigger' });

    fireEvent.click(trigger);
    flush();

    const panel = screen.getByTestId('panel');
    expect(panel).toHaveAttribute('data-open');
    // No motion means the panel must not expose a starting frame.
    expect(panel).not.toHaveAttribute('data-starting-style');

    await flushMicrotasks();
    expect(panel.style.getPropertyValue('--collapsible-panel-height')).toBe('auto');

    fireEvent.click(trigger);
    flush();
    await flushMicrotasks();
    expect(screen.queryByTestId('panel')).toBe(null);

    fireEvent.click(trigger);
    flush();
    await flushMicrotasks();
    const reopened = screen.getByTestId('panel');
    expect(reopened).toHaveAttribute('data-open');
    expect(reopened).not.toHaveAttribute('data-starting-style');
    expect(reopened.style.getPropertyValue('--collapsible-panel-height')).toBe('auto');
  });

  it('closes and reopens an initially open no-motion panel', async () => {
    await render(() => (
      <Collapsible.Root defaultOpen>
        <Collapsible.Trigger>Trigger</Collapsible.Trigger>
        <Collapsible.Panel data-testid="panel">Content</Collapsible.Panel>
      </Collapsible.Root>
    ));

    const trigger = screen.getByRole('button', { name: 'Trigger' });
    const panel = screen.getByTestId('panel');
    expect(panel).toHaveAttribute('data-open');
    expect(panel).not.toHaveAttribute('data-starting-style');

    fireEvent.click(trigger);
    flush();
    await flushMicrotasks();
    expect(screen.queryByTestId('panel')).toBe(null);

    fireEvent.click(trigger);
    flush();
    await flushMicrotasks();
    expect(screen.getByTestId('panel')).toHaveAttribute('data-open');
  });

  it.skipIf(isJSDOM)(
    'restores measurement layout styles when disposed during an opening transition',
    async () => {
      const { unmount } = await render(() => (
        <Collapsible.Root>
          <Collapsible.Trigger>Trigger</Collapsible.Trigger>
          <Collapsible.Panel
            data-testid="panel"
            style={{
              transition: 'height 10s linear',
              'justify-content': 'center',
              'align-items': 'center',
            }}
          >
            Content
          </Collapsible.Panel>
        </Collapsible.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      fireEvent.click(trigger);
      flush();
      await flushMicrotasks();

      const panel = screen.getByTestId('panel');
      // The opening measurement neutralizes alignment styles until the next frame.
      expect(panel.style.getPropertyValue('justify-content')).toBe('initial');
      expect(panel.style.getPropertyValue('align-items')).toBe('initial');

      unmount();
      // Owner disposal restores the authored styles immediately, not on the cancelled frame.
      expect(panel.style.getPropertyValue('justify-content')).toBe('center');
      expect(panel.style.getPropertyValue('align-items')).toBe('center');

      await waitForAnimationFrame();
      await flushMicrotasks();
      expect(panel.style.getPropertyValue('justify-content')).toBe('center');
      expect(panel.style.getPropertyValue('align-items')).toBe('center');
    },
  );

  it.skipIf(isJSDOM || !('onbeforematch' in window))(
    'restores a beforematch temporary duration when disposed during the open',
    async () => {
      const { unmount } = await render(() => (
        <Collapsible.Root>
          <Collapsible.Panel
            hiddenUntilFound
            keepMounted
            data-testid="panel"
            style={{ 'transition-duration': '123ms' }}
          >
            Content
          </Collapsible.Panel>
        </Collapsible.Root>
      ));

      const panel = screen.getByTestId('panel');
      fireBeforeMatch(panel);
      flush();
      await flushMicrotasks();

      // The reveal opens without waiting for the authored motion.
      expect(panel.style.transitionDuration).toBe('0s');

      unmount();
      expect(panel.style.transitionDuration).toBe('123ms');

      await waitForAnimationFrame();
      await flushMicrotasks();
      expect(panel.style.transitionDuration).toBe('123ms');
    },
  );
});
