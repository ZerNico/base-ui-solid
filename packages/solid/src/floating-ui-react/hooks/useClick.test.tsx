import { vi, expect, beforeEach, afterEach, test } from 'vitest';
import { createSignal, flush, omit, Show } from 'solid-js';
import { Dynamic } from '@solidjs/web';
import {
  fireEvent,
  flushMicrotasks,
  render,
  screen,
  isJSDOM,
  useTestInteractions,
} from '#test-utils';
import { useClick } from '../index';
import { useFloating } from '../../../test/floating-ui-tests/useFloating';
import { useHover } from '../../../test/floating-ui-tests/useHover';
import { REASONS } from '../../internals/reasons';
import type { UseFloatingOptions } from '../types';
import type { UseClickProps } from './useClick';

function App(
  props: UseClickProps & {
    initialOpen?: boolean;
    onOpenChange?: UseFloatingOptions['onOpenChange'];
    typeable?: boolean;
  },
) {
  const clickProps = omit(props, 'initialOpen', 'onOpenChange', 'typeable');

  const [open, setOpen] = createSignal(props.initialOpen ?? false);
  const { refs, context } = useFloating({
    get open() {
      return open();
    },
    onOpenChange(nextOpen, details) {
      props.onOpenChange?.(nextOpen, details);
      setOpen(nextOpen);
    },
  });
  const { getReferenceProps, getFloatingProps } = useTestInteractions([
    useClick(context.rootStore, clickProps),
  ]);

  const Reference = props.typeable ? 'input' : 'button';

  return (
    <>
      <Dynamic
        component={Reference}
        data-testid="reference"
        {...getReferenceProps({ ref: refs.setReference })}
      />
      <Show when={open()}>
        <div role="tooltip" {...getFloatingProps({ ref: refs.setFloating })} />
      </Show>
    </>
  );
}

function createMouseEvent(type: string, options: MouseEventInit = {}) {
  return new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...options,
  });
}

function createPointerEvent(type: string, pointerType: PointerEvent['pointerType']) {
  const event = createMouseEvent(type) as PointerEvent;
  Object.defineProperty(event, 'pointerType', {
    value: pointerType,
  });
  return event;
}

async function click(element: Element) {
  element.dispatchEvent(createMouseEvent('click'));
  await flushMicrotasks();
}

async function pressMouse(element: Element) {
  element.dispatchEvent(createPointerEvent('pointerdown', 'mouse'));
  element.dispatchEvent(createMouseEvent('mousedown'));
  element.dispatchEvent(createMouseEvent('click'));
  await flushMicrotasks();
}

async function hover(element: Element) {
  element.dispatchEvent(createMouseEvent('mouseover', { relatedTarget: document.body }));
  element.dispatchEvent(createMouseEvent('mouseenter', { relatedTarget: document.body }));
  await flushMicrotasks();
}

describe.skipIf(!isJSDOM)('useClick', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      (callback: FrameRequestCallback): number => {
        callback(0);
        return 0;
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('opens and closes on repeated clicks', async () => {
    await render(() => <App />);

    const button = screen.getByRole('button');

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await click(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await click(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('keeps open on repeated clicks when toggle is false', async () => {
    await render(() => <App toggle={false} />);

    const button = screen.getByRole('button');

    await click(button);
    await click(button);

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  test('opens from the mousedown event path', async () => {
    await render(() => <App event="mousedown" />);

    const button = screen.getByRole('button');

    await pressMouse(button);
    await flushMicrotasks();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  test('closes from the mousedown event path', async () => {
    await render(() => <App event="mousedown" initialOpen />);

    const button = screen.getByRole('button');

    await pressMouse(button);
    await flushMicrotasks();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('ignores the click event after mousedown when event is mousedown-only', async () => {
    await render(() => <App event="mousedown-only" />);

    const button = screen.getByRole('button');

    await pressMouse(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await click(button);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  test('ignores mouse input when ignoreMouse is true', async () => {
    await render(() => <App ignoreMouse />);

    const button = screen.getByRole('button');

    fireEvent.pointerDown(button, { pointerType: 'mouse' });
    flush();
    fireEvent.click(button);
    flush();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('delays touch opening when touchOpenDelay is set', async () => {
    vi.useFakeTimers();

    await render(() => <App touchOpenDelay={100} />);

    const button = screen.getByRole('button');

    fireEvent.pointerDown(button, { pointerType: 'touch' });
    flush();
    fireEvent.click(button);
    flush();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    vi.advanceTimersByTime(100);
    await flushMicrotasks();

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  test('delays touch opening from the deferred mousedown event path', async () => {
    vi.useFakeTimers();

    const frameCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });

    await render(() => <App event="mousedown" touchOpenDelay={100} />);

    const button = screen.getByRole('button');

    button.dispatchEvent(createPointerEvent('pointerdown', 'touch'));
    button.dispatchEvent(createMouseEvent('mousedown'));
    button.dispatchEvent(createMouseEvent('click'));
    await flushMicrotasks();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    frameCallbacks.forEach((callback) => callback(0));
    await flushMicrotasks();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    vi.advanceTimersByTime(100);
    await flushMicrotasks();

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  test('does not delay touch closing', async () => {
    vi.useFakeTimers();

    await render(() => <App initialOpen touchOpenDelay={100} />);

    const button = screen.getByRole('button');

    fireEvent.pointerDown(button, { pointerType: 'touch' });
    flush();
    fireEvent.click(button);
    flush();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('uses the configured reason', async () => {
    const onOpenChange = vi.fn();

    await render(() => <App onOpenChange={onOpenChange} reason={REASONS.inputPress} typeable />);

    await click(screen.getByRole('textbox'));

    expect(onOpenChange).toHaveBeenCalledWith(
      true,
      expect.objectContaining({ reason: REASONS.inputPress }),
    );
  });

  test('stickIfOpen true keeps a hover-opened popup open on first click', async () => {
    function HoverClickApp() {
      const [open, setOpen] = createSignal(false);
      const { refs, context } = useFloating({
        get open() {
          return open();
        },
        onOpenChange: setOpen,
      });
      const { getReferenceProps, getFloatingProps } = useTestInteractions([
        useHover(context),
        useClick(context.rootStore, { stickIfOpen: true }),
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

    await render(() => <HoverClickApp />);

    const button = screen.getByRole('button');

    await hover(button);
    await click(button);

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  test('stickIfOpen false closes a hover-opened popup on first click', async () => {
    function HoverClickApp() {
      const [open, setOpen] = createSignal(false);
      const { refs, context } = useFloating({
        get open() {
          return open();
        },
        onOpenChange: setOpen,
      });
      const { getReferenceProps, getFloatingProps } = useTestInteractions([
        useHover(context),
        useClick(context.rootStore, { stickIfOpen: false }),
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

    await render(() => <HoverClickApp />);

    const button = screen.getByRole('button');

    await hover(button);
    await click(button);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
