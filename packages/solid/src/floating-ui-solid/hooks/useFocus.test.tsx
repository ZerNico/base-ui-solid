import { expect, vi, beforeEach, afterEach, it } from 'vitest';
import { createSignal, flush, Show } from 'solid-js';
import {
  fireEvent,
  flushMicrotasks,
  render,
  screen,
  isJSDOM,
  useTestInteractions,
} from '#test-utils';
import { useFloating } from '../../../test/floating-ui-tests/useFloating';
import { useFocus } from './useFocus';

describe.skipIf(!isJSDOM)('useFocus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not reopen when focus is restored after leaving the tab', async () => {
    function App() {
      const [open, setOpen] = createSignal(false);
      const { refs, context } = useFloating({
        get open() {
          return open();
        },
        onOpenChange: setOpen,
      });
      const { getReferenceProps, getFloatingProps } = useTestInteractions([
        useFocus(context.rootStore, { delay: 100 }),
      ]);

      return (
        <>
          <button {...getReferenceProps({ ref: refs.setReference })} />
          <Show when={open()}>
            <div role="tooltip" {...getFloatingProps({ ref: refs.setFloating })} />
          </Show>
        </>
      );
    }

    await render(() => <App />);
    const button = screen.getByRole('button');

    button.focus();
    await flushMicrotasks();

    window.dispatchEvent(new Event('blur'));
    // Port note: React's `onFocus` listens to `focusin`, which `@testing-library/react`'s
    // `fireEvent.focus` also dispatches.
    fireEvent.focus(button);
    fireEvent.focusIn(button);
    flush();

    vi.advanceTimersByTime(200);
    await flushMicrotasks();

    expect(screen.queryByRole('tooltip')).toBe(null);
  });
});
