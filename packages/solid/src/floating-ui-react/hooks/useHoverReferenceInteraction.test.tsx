import { vi, expect, it, describe, beforeEach, afterEach } from 'vitest';
import { createEffect, createMemo, createSignal, flush, merge, Show } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { fireEvent, flushMicrotasks, render, screen, isJSDOM } from '#test-utils';
import { useFloating } from '../../../test/floating-ui-tests/useFloating';
import { safePolygon } from '../safePolygon';
import { useHoverFloatingInteraction } from './useHoverFloatingInteraction';
import { useHoverInteractionSharedState } from './useHoverInteractionSharedState';
import type { HoverInteraction } from './useHoverInteractionSharedState';
import { useHoverReferenceInteraction } from './useHoverReferenceInteraction';
import type { UseHoverReferenceInteractionProps } from './useHoverReferenceInteraction';
import { REASONS } from '../../internals/reasons';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';

describe.skipIf(!isJSDOM)('useHoverReferenceInteraction', () => {
  it('updates the handleClose options during render', async () => {
    // Port note: there's no render phase to read the options in, so the test reads them from the
    // shared hover state after each update is flushed.
    let hoverInteraction: HoverInteraction | undefined;
    const blockPointerEvents = () => hoverInteraction?.handleCloseOptions?.blockPointerEvents;

    function App(props: { block: boolean }) {
      const { context } = useFloating();
      const handleClose = createMemo(() => safePolygon({ blockPointerEvents: props.block }));
      useHoverReferenceInteraction(context.rootStore, {
        get handleClose() {
          return handleClose();
        },
      });
      hoverInteraction = useHoverInteractionSharedState(context.rootStore);

      return null;
    }

    const [block, setBlock] = createSignal(false);
    await render(() => <App block={block()} />);
    expect(blockPointerEvents()).toBe(false);

    setBlock(true);
    flush();
    expect(blockPointerEvents()).toBe(true);
  });

  it('does not treat child target as inactive when handlers are on a wrapper', async () => {
    const onOpenChange = vi.fn();

    function App() {
      const [open, setOpen] = createSignal(true);
      const triggerElementRef: RefObject<Element | null> = { current: null };
      const { refs, context } = useFloating({
        get open() {
          return open();
        },
        onOpenChange(nextOpen, details) {
          onOpenChange(nextOpen, details);
          setOpen(nextOpen);
        },
      });

      const hoverProps = useHoverReferenceInteraction(context.rootStore, {
        mouseOnly: true,
        restMs: 100,
        delay: { close: 0 },
        move: false,
        triggerElementRef,
      });

      return (
        <>
          <div data-testid="wrapper" {...hoverProps()}>
            <button
              data-testid="trigger"
              ref={(node) => {
                refs.setReference(node);
                triggerElementRef.current = node;
              }}
            />
          </div>
          <Show when={open()}>
            <div role="tooltip" ref={refs.setFloating} />
          </Show>
        </>
      );
    }

    await render(() => <App />);

    const wrapper = screen.getByTestId('wrapper');
    const trigger = screen.getByTestId('trigger');

    fireEvent.pointerEnter(wrapper, { pointerType: 'mouse' });
    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseMove(trigger, { movementX: 10, movementY: 0 });

    await flushMicrotasks();

    // Moving over the active trigger should not emit a redundant openchange.
    expect(onOpenChange).toHaveBeenCalledTimes(0);
    expect(screen.queryByRole('tooltip')).not.toBe(null);
  });

  it('does not treat a synthetic child target as inactive when the native path differs', async () => {
    const onOpenChange = vi.fn();

    function App() {
      const [open, setOpen] = createSignal(true);
      const triggerElementRef: RefObject<Element | null> = { current: null };
      const { refs, context } = useFloating({
        get open() {
          return open();
        },
        onOpenChange(nextOpen, details) {
          onOpenChange(nextOpen, details);
          setOpen(nextOpen);
        },
      });

      const hoverProps = useHoverReferenceInteraction(context.rootStore, {
        mouseOnly: true,
        restMs: 100,
        delay: { close: 0 },
        move: false,
        triggerElementRef,
      });

      return (
        <>
          <div data-testid="wrapper" {...hoverProps()}>
            <button
              data-testid="trigger"
              ref={(node) => {
                refs.setReference(node);
                triggerElementRef.current = node;
              }}
            >
              <span data-testid="child" />
            </button>
          </div>
          <Show when={open()}>
            <div role="tooltip" ref={refs.setFloating} />
          </Show>
        </>
      );
    }

    await render(() => <App />);

    const wrapper = screen.getByTestId('wrapper');
    const child = screen.getByTestId('child');

    fireEvent.pointerEnter(wrapper, { pointerType: 'mouse' });
    fireEvent.mouseEnter(wrapper);

    const event = new MouseEvent('mousemove', { bubbles: true });
    Object.defineProperties(event, {
      composedPath: {
        configurable: true,
        value: () => [document.body, child, wrapper],
      },
      movementX: {
        configurable: true,
        value: 10,
      },
      movementY: {
        configurable: true,
        value: 0,
      },
    });

    fireEvent(child, event);

    await flushMicrotasks();

    expect(onOpenChange).toHaveBeenCalledTimes(0);
    expect(screen.queryByRole('tooltip')).not.toBe(null);
  });

  it('treats disabled child trigger as inactive in wrapper fallback mode', async () => {
    const onOpenChange = vi.fn();

    function App() {
      const [open, setOpen] = createSignal(true);
      const triggerElementRef: RefObject<Element | null> = { current: null };
      const { refs, context } = useFloating({
        get open() {
          return open();
        },
        onOpenChange(nextOpen, details) {
          onOpenChange(nextOpen, details);
          setOpen(nextOpen);
        },
      });

      const hoverProps = useHoverReferenceInteraction(context.rootStore, {
        mouseOnly: true,
        restMs: 100,
        delay: { close: 0 },
        move: false,
        triggerElementRef,
      });

      return (
        <>
          <button
            data-testid="active-trigger"
            ref={(node) => {
              refs.setReference(node);
              triggerElementRef.current = node;
            }}
          />
          <div data-testid="inactive-wrapper" {...hoverProps()}>
            <button
              data-testid="disabled-trigger"
              data-trigger-disabled
              ref={(node) => {
                if (node) {
                  context.rootStore.context.triggerElements.add('disabled-trigger', node);
                }
              }}
            />
          </div>
          <Show when={open()}>
            <div role="tooltip" ref={refs.setFloating} />
          </Show>
        </>
      );
    }

    await render(() => <App />);

    const activeTrigger = screen.getByTestId('active-trigger');
    const wrapper = screen.getByTestId('inactive-wrapper');
    const disabledTrigger = screen.getByTestId('disabled-trigger');

    fireEvent.pointerEnter(activeTrigger, { pointerType: 'mouse' });
    fireEvent.mouseEnter(activeTrigger);
    fireEvent.pointerEnter(wrapper, { pointerType: 'mouse' });
    fireEvent.mouseMove(disabledTrigger, { movementX: 10, movementY: 0 });

    await flushMicrotasks();

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('tooltip')).not.toBe(null);
  });

  it('reopens immediately for same trigger in delegated wrapper mode during close transition', async () => {
    const onOpenChange = vi.fn();
    let closeFromHover: (() => void) | null = null;

    function App() {
      const [open, setOpen] = createSignal(true);
      const triggerElementRef: RefObject<Element | null> = { current: null };
      const { refs, context } = useFloating({
        get open() {
          return open();
        },
        onOpenChange(nextOpen, details) {
          onOpenChange(nextOpen, details);
          setOpen(nextOpen);
        },
      });

      closeFromHover = () => {
        context.rootStore.setOpen(
          false,
          createChangeEventDetails(REASONS.triggerHover, new MouseEvent('mouseleave')),
        );
      };

      // Simulate active close transition lifecycle while closed.
      // Port note: upstream writes this during render; here it's written whenever `open` changes.
      createEffect(open, (openValue) => {
        (context.rootStore.state as { transitionStatus?: 'ending' | undefined }).transitionStatus =
          openValue ? undefined : 'ending';
      });

      const hoverProps = useHoverReferenceInteraction(context.rootStore, {
        mouseOnly: true,
        move: false,
        delay: { open: 500, close: 0 },
        triggerElementRef,
      });

      return (
        <>
          <div
            data-testid="wrapper"
            {...hoverProps()}
            ref={(node) => {
              triggerElementRef.current = node;
            }}
          >
            <button
              data-testid="trigger"
              ref={(node) => {
                refs.setReference(node);
              }}
            />
          </div>
          <Show when={open()}>
            <div role="tooltip" ref={refs.setFloating} />
          </Show>
        </>
      );
    }

    await render(() => <App />);

    const wrapper = screen.getByTestId('wrapper');
    await flushMicrotasks();

    closeFromHover!();
    await flushMicrotasks();

    await flushMicrotasks();
    expect(screen.queryByRole('tooltip')).toBe(null);

    fireEvent.pointerEnter(wrapper, { pointerType: 'mouse' });
    fireEvent.mouseEnter(wrapper);

    await flushMicrotasks();

    // Close from hover + immediate reopen without waiting open delay.
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange.mock.calls[1][0]).toBe(true);
    expect(screen.queryByRole('tooltip')).not.toBe(null);
  });

  it('reopens immediately when close transition state is provided externally', async () => {
    const onOpenChange = vi.fn();
    let closeFromHover: (() => void) | null = null;

    function App() {
      const [open, setOpen] = createSignal(true);
      const triggerElementRef: RefObject<Element | null> = { current: null };
      const { refs, context } = useFloating({
        get open() {
          return open();
        },
        onOpenChange(nextOpen, details) {
          onOpenChange(nextOpen, details);
          setOpen(nextOpen);
        },
      });

      closeFromHover = () => {
        context.rootStore.setOpen(
          false,
          createChangeEventDetails(REASONS.triggerHover, new MouseEvent('mouseleave')),
        );
      };

      const hoverProps = useHoverReferenceInteraction(context.rootStore, {
        mouseOnly: true,
        move: false,
        delay: { open: 500, close: 0 },
        triggerElementRef,
        isClosing: () => !open(),
      });

      return (
        <>
          <div
            data-testid="wrapper"
            {...hoverProps()}
            ref={(node) => {
              triggerElementRef.current = node;
            }}
          >
            <button
              data-testid="trigger"
              ref={(node) => {
                refs.setReference(node);
              }}
            />
          </div>
          <Show when={open()}>
            <div role="tooltip" ref={refs.setFloating} />
          </Show>
        </>
      );
    }

    await render(() => <App />);

    const wrapper = screen.getByTestId('wrapper');
    await flushMicrotasks();

    closeFromHover!();
    await flushMicrotasks();

    await flushMicrotasks();
    expect(screen.queryByRole('tooltip')).toBe(null);

    fireEvent.pointerEnter(wrapper, { pointerType: 'mouse' });
    fireEvent.mouseEnter(wrapper);

    await flushMicrotasks();

    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange.mock.calls[1][0]).toBe(true);
    expect(screen.queryByRole('tooltip')).not.toBe(null);
  });

  describe('hover semantics', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function App(props: UseHoverReferenceInteractionProps) {
      const [open, setOpen] = createSignal(false);
      const triggerElementRef: RefObject<Element | null> = { current: null };
      const { refs, context } = useFloating({
        get open() {
          return open();
        },
        onOpenChange: setOpen,
      });
      const referenceProps = useHoverReferenceInteraction(
        context.rootStore,
        merge({ triggerElementRef }, props),
      );
      useHoverFloatingInteraction(context.rootStore);

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

    it('opens on mouseenter', async () => {
      await render(() => <App />);

      fireEvent.mouseEnter(screen.getByRole('button'));
      flush();

      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      await flushMicrotasks();
    });

    it('closes on mouseleave', async () => {
      await render(() => <App />);

      fireEvent.mouseEnter(screen.getByRole('button'));
      flush();
      fireEvent.mouseLeave(screen.getByRole('button'));
      flush();

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('closes when the pointer moves onto the floating element without safePolygon', async () => {
      await render(() => <App />);

      fireEvent.mouseEnter(screen.getByRole('button'));
      await flushMicrotasks();

      fireEvent(
        screen.getByRole('button'),
        new MouseEvent('mouseleave', { relatedTarget: screen.getByRole('tooltip') }),
      );
      flush();

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    describe('prop: delay', () => {
      it('symmetric number', async () => {
        await render(() => <App delay={1000} />);

        fireEvent.mouseEnter(screen.getByRole('button'));

        vi.advanceTimersByTime(999);
        await flushMicrotasks();

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

        vi.advanceTimersByTime(1);
        await flushMicrotasks();

        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      it('open', async () => {
        await render(() => <App delay={{ open: 500 }} />);

        fireEvent.mouseEnter(screen.getByRole('button'));

        vi.advanceTimersByTime(499);
        await flushMicrotasks();

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

        vi.advanceTimersByTime(1);
        await flushMicrotasks();

        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });

      it('close', async () => {
        await render(() => <App delay={{ close: 500 }} />);

        fireEvent.mouseEnter(screen.getByRole('button'));
        flush();
        fireEvent.mouseLeave(screen.getByRole('button'));
        flush();

        vi.advanceTimersByTime(499);
        await flushMicrotasks();

        expect(screen.getByRole('tooltip')).toBeInTheDocument();

        vi.advanceTimersByTime(1);
        await flushMicrotasks();

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });

      it('open with close 0', async () => {
        await render(() => <App delay={{ open: 500 }} />);

        fireEvent.mouseEnter(screen.getByRole('button'));

        vi.advanceTimersByTime(499);
        await flushMicrotasks();

        fireEvent.mouseLeave(screen.getByRole('button'));

        vi.advanceTimersByTime(1);
        await flushMicrotasks();

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });

      it('restMs + nullish open delay should respect restMs', async () => {
        await render(() => <App restMs={100} delay={{ close: 100 }} />);

        fireEvent.mouseEnter(screen.getByRole('button'));

        vi.advanceTimersByTime(99);
        await flushMicrotasks();

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });

    it('restMs', async () => {
      await render(() => <App restMs={100} />);

      const button = screen.getByRole('button');

      const originalDispatchEvent = button.dispatchEvent;
      const spy = vi.spyOn(button, 'dispatchEvent').mockImplementation((event) => {
        Object.defineProperty(event, 'movementX', { value: 10 });
        Object.defineProperty(event, 'movementY', { value: 10 });
        return originalDispatchEvent.call(button, event);
      });

      fireEvent.mouseMove(button);

      vi.advanceTimersByTime(99);
      await flushMicrotasks();

      fireEvent.mouseMove(button);

      vi.advanceTimersByTime(1);
      await flushMicrotasks();

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      fireEvent.mouseMove(button);

      vi.advanceTimersByTime(100);
      await flushMicrotasks();

      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      spy.mockRestore();
    });

    it('restMs does not reset timer for minor mouse movement', async () => {
      await render(() => <App restMs={100} />);

      const button = screen.getByRole('button');

      const originalDispatchEvent = button.dispatchEvent;
      const spy = vi.spyOn(button, 'dispatchEvent').mockImplementation((event) => {
        Object.defineProperty(event, 'movementX', { value: 1 });
        Object.defineProperty(event, 'movementY', { value: 0 });
        return originalDispatchEvent.call(button, event);
      });

      fireEvent.mouseMove(button);

      vi.advanceTimersByTime(99);
      await flushMicrotasks();

      fireEvent.mouseMove(button);

      vi.advanceTimersByTime(1);
      await flushMicrotasks();

      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      spy.mockRestore();
    });

    it('reports the hover reason', async () => {
      const reasons: string[] = [];

      function ReasonApp() {
        const [open, setOpen] = createSignal(false);
        const triggerElementRef: RefObject<Element | null> = { current: null };
        const { refs, context } = useFloating({
          get open() {
            return open();
          },
          onOpenChange(nextOpen, details) {
            reasons.push(details.reason);
            setOpen(nextOpen);
          },
        });
        const referenceProps = useHoverReferenceInteraction(context.rootStore, {
          triggerElementRef,
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

      await render(() => <ReasonApp />);
      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      await flushMicrotasks();
      fireEvent.mouseLeave(button);

      expect(reasons).toEqual([REASONS.triggerHover, REASONS.triggerHover]);
    });
  });
});
