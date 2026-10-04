import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest';
import { createSignal, Show } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { fireEvent, flushMicrotasks, render, screen, isJSDOM } from '#test-utils';
import { useFloating } from '../../../test/floating-ui-tests/useFloating';
import { useHoverFloatingInteraction } from './useHoverFloatingInteraction';
import { useHoverReferenceInteraction } from './useHoverReferenceInteraction';

describe.skipIf(!isJSDOM)('useHoverFloatingInteraction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function App(props: { closeDelay?: number }) {
    const [open, setOpen] = createSignal(false);
    const triggerElementRef: RefObject<Element | null> = { current: null };
    const { refs, context } = useFloating({
      get open() {
        return open();
      },
      onOpenChange: setOpen,
    });
    const referenceProps = useHoverReferenceInteraction(context.rootStore, {
      triggerElementRef,
      get delay() {
        return { close: props.closeDelay };
      },
    });
    useHoverFloatingInteraction(context.rootStore, {
      get closeDelay() {
        return props.closeDelay;
      },
    });

    return (
      <>
        <button
          {...referenceProps()}
          ref={(node) => {
            refs.setReference(node);
            triggerElementRef.current = node;
          }}
        />
        <Show when={open()}>
          <div role="tooltip" ref={refs.setFloating} />
        </Show>
      </>
    );
  }

  it('closes after the close delay when the pointer leaves the floating element', async () => {
    await render(() => <App closeDelay={100} />);

    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);
    await flushMicrotasks();

    const tooltip = screen.getByRole('tooltip');
    fireEvent(button, new MouseEvent('mouseleave', { relatedTarget: tooltip }));
    fireEvent.mouseEnter(tooltip);
    fireEvent.mouseLeave(tooltip);

    vi.advanceTimersByTime(99);
    await flushMicrotasks();

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    vi.advanceTimersByTime(1);
    await flushMicrotasks();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('keeps the popup open when the floating element is entered before closeDelay elapses', async () => {
    await render(() => <App closeDelay={500} />);

    const button = screen.getByRole('button');
    fireEvent.mouseEnter(button);
    await flushMicrotasks();

    const tooltip = screen.getByRole('tooltip');
    fireEvent(button, new MouseEvent('mouseleave', { relatedTarget: tooltip }));

    vi.advanceTimersByTime(499);
    await flushMicrotasks();

    fireEvent.mouseEnter(tooltip);

    vi.advanceTimersByTime(500);
    await flushMicrotasks();

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(tooltip);

    vi.advanceTimersByTime(499);
    await flushMicrotasks();

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    vi.advanceTimersByTime(1);
    await flushMicrotasks();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
