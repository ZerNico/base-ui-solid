import { vi, expect, beforeEach, describe, test } from 'vitest';
import { createSignal, flush, omit, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import {
  fireEvent,
  flushMicrotasks,
  render,
  screen,
  waitFor,
  isJSDOM,
  useTestInteractions,
} from '#test-utils';
import userEvent from '@testing-library/user-event';

import {
  FloatingFocusManager,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  useDismiss,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useFocus,
  useClick,
} from '../index';
import { useFloating } from '../../../test/floating-ui-tests/useFloating';
import { REASONS } from '../../internals/reasons';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { UseDismissProps } from './useDismiss';
import { normalizeProp } from './useDismiss';

// Port note: upstream's `@mui/internal-test-utils` `fireEvent`/`act` flush React synchronously.
// Here, `flush()` applies the queued Solid updates (and the effects they trigger) after each
// synchronous event, and `await flushMicrotasks()` replaces `act(async () => …)`.

beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
    (callback: FrameRequestCallback): number => {
      callback(0);
      return 0;
    },
  );
});

function App(
  props: UseDismissProps & {
    onClose?: () => void;
  },
) {
  const [open, setOpen] = createSignal(true);
  const { refs, context } = useFloating({
    get open() {
      return open();
    },
    onOpenChange(openArg, data) {
      setOpen(openArg);
      const reason = data?.reason;
      if (props.outsidePress) {
        expect(reason).toBe(REASONS.outsidePress);
      } else if (props.escapeKey) {
        expect(reason).toBe(REASONS.escapeKey);
        if (!openArg) {
          props.onClose?.();
        }
      } else if (props.referencePress?.()) {
        expect(reason).toBe(REASONS.triggerPress);
      }
    },
  });
  const { getReferenceProps, getFloatingProps } = useTestInteractions([
    useDismiss(context.rootStore, props),
  ]);

  return (
    <>
      <button {...getReferenceProps({ ref: refs.setReference })} />
      <Show when={open()}>
        <div role="tooltip" {...getFloatingProps({ ref: refs.setFloating })}>
          <input />
        </div>
      </Show>
    </>
  );
}

describe.skipIf(!isJSDOM)('useDismiss', () => {
  describe('default options', () => {
    test('registers outside press touch listeners as passive', async () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      try {
        await render(() => <App />);

        await Promise.all(
          ['touchstart', 'touchmove', 'touchend'].map((eventName) =>
            waitFor(() => {
              expect(addEventListenerSpy).toHaveBeenCalledWith(eventName, expect.any(Function), {
                capture: true,
                passive: true,
              });
            }),
          ),
        );
      } finally {
        addEventListenerSpy.mockRestore();
      }
    });

    test('dismisses with escape key', async () => {
      await render(() => <App />);
      fireEvent.keyDown(document.body, { key: 'Escape' });
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      await flushMicrotasks();
    });

    test('calls preventDefault on escape key dismiss', async () => {
      await render(() => <App />);
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.body.dispatchEvent(event);
      await flushMicrotasks();
      expect(event.defaultPrevented).toBe(true);
      await flushMicrotasks();
    });

    test('does not call preventDefault on escape key if close is canceled', async () => {
      function CancelApp() {
        const [open, setOpen] = createSignal(true);
        const { refs, context } = useFloating({
          get open() {
            return open();
          },
          onOpenChange(openArg, data) {
            data?.cancel();
            setOpen(true);
          },
        });
        const { getReferenceProps, getFloatingProps } = useTestInteractions([
          useDismiss(context.rootStore),
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

      await render(() => <CancelApp />);
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.body.dispatchEvent(event);
      await flushMicrotasks();
      expect(event.defaultPrevented).toBe(false);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      await flushMicrotasks();
    });

    test('does not dismiss with escape key if IME is active', async () => {
      const onClose = vi.fn();

      await render(() => <App onClose={onClose} escapeKey />);

      const textbox = screen.getByRole('textbox');

      textbox.focus();
      await flushMicrotasks();

      await flushMicrotasks();

      // Simulate behavior when "あ" (Japanese) is entered and Esc is pressed for IME
      // cancellation.
      fireEvent.change(textbox, { target: { value: 'あ' } });
      fireEvent.compositionStart(textbox);
      fireEvent.keyDown(textbox, { key: 'Escape' });
      fireEvent.compositionEnd(textbox);
      flush();

      // Wait for the compositionend timeout tick due to Safari
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

      expect(onClose).toHaveBeenCalledTimes(0);

      fireEvent.keyDown(textbox, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('dismisses with outside pointer press', async () => {
      await render(() => <App />);
      await userEvent.click(document.body);
      await flushMicrotasks();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    // Port note: Solid has no `StrictMode`, so both rows render the same tree.
    test.each([false, true])(
      'clears the inside marker when the interaction owner unmounts (strict: %s)',
      async () => {
        function DismissInteraction(props: {
          context: ReturnType<typeof useFloating>['context'];
          outsidePress: boolean;
        }) {
          const { getFloatingProps } = useTestInteractions([
            useDismiss(props.context.rootStore, {
              get outsidePress() {
                return props.outsidePress;
              },
              outsidePressEvent: 'sloppy',
            }),
          ]);

          return <button type="button" {...getFloatingProps()} />;
        }

        function PersistentRootApp(props: { interactionMounted: boolean; outsidePress: boolean }) {
          const [open, setOpen] = createSignal(true);
          const { context, refs } = useFloating({
            get open() {
              return open();
            },
            onOpenChange: setOpen,
          });

          return (
            <Show when={open()}>
              <div role="tooltip" ref={refs.setFloating}>
                <Show when={props.interactionMounted}>
                  <DismissInteraction context={context} outsidePress={props.outsidePress} />
                </Show>
              </div>
            </Show>
          );
        }

        const [interactionMounted, setInteractionMounted] = createSignal(true);
        const [outsidePress, setOutsidePress] = createSignal(false);

        await render(() => (
          <PersistentRootApp
            interactionMounted={interactionMounted()}
            outsidePress={outsidePress()}
          />
        ));

        fireEvent.click(screen.getByRole('button'));
        flush();
        setInteractionMounted(false);
        setOutsidePress(true);
        flush();
        setInteractionMounted(true);
        flush();
        fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
        flush();

        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      },
    );

    test('dismisses with reference press', async () => {
      await render(() => <App referencePress={() => true} />);
      fireEvent.pointerDown(screen.getByRole('button'));
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('dismisses with native click', async () => {
      await render(() => <App referencePress={() => true} />);
      fireEvent.click(screen.getByRole('button'));
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('outsidePress function guard', async () => {
      await render(() => <App outsidePress={() => false} />);
      await userEvent.click(document.body);
      await flushMicrotasks();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    test('outsidePress ignored for third party elements', async () => {
      function ThirdPartyApp() {
        const [isOpen, setIsOpen] = createSignal(true);

        const { context, refs } = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });

        const dismiss = useDismiss(context.rootStore);

        const { getReferenceProps, getFloatingProps } = useTestInteractions([dismiss]);

        return (
          <>
            <button {...getReferenceProps({ ref: refs.setReference })} />
            <Show when={isOpen()}>
              <FloatingFocusManager context={context.rootStore}>
                <div role="dialog" {...getFloatingProps({ ref: refs.setFloating })} />
              </FloatingFocusManager>
            </Show>
          </>
        );
      }

      await render(() => <ThirdPartyApp />);
      await flushMicrotasks();

      const thirdParty = document.createElement('div');
      thirdParty.setAttribute('data-testid', 'third-party');
      document.body.append(thirdParty);
      await userEvent.click(thirdParty);
      await flushMicrotasks();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      thirdParty.remove();
    });

    test('dismisses when clicking outside a shared shadow root', async () => {
      function ShadowApp(props: { shadowRoot: ShadowRoot }) {
        const [isOpen, setIsOpen] = createSignal(true);

        const { context, refs } = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });

        const dismiss = useDismiss(context.rootStore);
        const { getReferenceProps, getFloatingProps } = useTestInteractions([dismiss]);

        return (
          <>
            <button {...getReferenceProps({ ref: refs.setReference })} />
            <Show when={isOpen()}>
              <FloatingPortal container={props.shadowRoot}>
                <div role="dialog" {...getFloatingProps({ ref: refs.setFloating })} />
              </FloatingPortal>
            </Show>
          </>
        );
      }

      const host = document.body.appendChild(document.createElement('div'));
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      shadowRoot.appendChild(container);

      try {
        await render(() => <ShadowApp shadowRoot={shadowRoot} />, { container });

        await userEvent.click(document.body);
        await flushMicrotasks();

        expect(shadowRoot.querySelector('[role="dialog"]')).toBe(null);
      } finally {
        host.remove();
      }
    });

    test('dismisses when clicking outside a shared shadow root while focus is managed', async () => {
      function ShadowApp(props: { shadowRoot: ShadowRoot }) {
        const [isOpen, setIsOpen] = createSignal(true);

        const { context, refs } = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });

        const dismiss = useDismiss(context.rootStore);
        const { getReferenceProps, getFloatingProps } = useTestInteractions([dismiss]);

        return (
          <>
            <button {...getReferenceProps({ ref: refs.setReference })} />
            <Show when={isOpen()}>
              <FloatingPortal container={props.shadowRoot}>
                <FloatingFocusManager context={context.rootStore}>
                  <div role="dialog" {...getFloatingProps({ ref: refs.setFloating })} />
                </FloatingFocusManager>
              </FloatingPortal>
            </Show>
          </>
        );
      }

      const host = document.body.appendChild(document.createElement('div'));
      const shadowRoot = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      shadowRoot.appendChild(container);

      try {
        await render(() => <ShadowApp shadowRoot={shadowRoot} />, { container });
        await flushMicrotasks();

        await userEvent.click(document.body);
        await flushMicrotasks();

        expect(shadowRoot.querySelector('[role="dialog"]')).toBe(null);
      } finally {
        host.remove();
      }
    });

    test('outsidePress not ignored for nested floating elements', async () => {
      function Popover(props: { children?: JSX.Element; id: string; modal?: boolean | null }) {
        const [isOpen, setIsOpen] = createSignal(true);

        const { context, refs } = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });

        const dismiss = useDismiss(context.rootStore);

        const { getReferenceProps, getFloatingProps } = useTestInteractions([dismiss]);

        const dialogJsx = () => (
          <div
            role="dialog"
            data-testid={props.id}
            {...getFloatingProps({ ref: refs.setFloating })}
          >
            {props.children}
          </div>
        );

        return (
          <>
            <button {...getReferenceProps({ ref: refs.setReference })} />
            <Show when={isOpen()}>
              <>
                {props.modal == null ? (
                  dialogJsx()
                ) : (
                  <FloatingFocusManager context={context.rootStore} modal={props.modal}>
                    {dialogJsx()}
                  </FloatingFocusManager>
                )}
              </>
            </Show>
          </>
        );
      }

      function NestedApp(props: { modal: [boolean, boolean] | null }) {
        return (
          <Popover id="popover-1" modal={props.modal ? props.modal[0] : true}>
            <Popover id="popover-2" modal={props.modal ? props.modal[1] : null} />
          </Popover>
        );
      }

      const { unmount } = await render(() => <NestedApp modal={[true, true]} />);
      await flushMicrotasks();

      let popover1 = screen.getByTestId('popover-1');
      let popover2 = screen.getByTestId('popover-2');
      await userEvent.click(popover2);
      await flushMicrotasks();
      expect(popover1).toBeInTheDocument();
      expect(popover2).toBeInTheDocument();
      await userEvent.click(popover1);
      await flushMicrotasks();
      expect(popover2).not.toBeInTheDocument();

      unmount();

      const { unmount: unmount2 } = await render(() => <NestedApp modal={[true, false]} />);
      await flushMicrotasks();

      popover1 = screen.getByTestId('popover-1');
      popover2 = screen.getByTestId('popover-2');

      await userEvent.click(popover2);
      await flushMicrotasks();
      expect(popover1).toBeInTheDocument();
      expect(popover2).toBeInTheDocument();
      await userEvent.click(popover1);
      await flushMicrotasks();
      expect(popover2).not.toBeInTheDocument();

      unmount2();

      const { unmount: unmount3 } = await render(() => <NestedApp modal={[false, true]} />);
      await flushMicrotasks();

      popover1 = screen.getByTestId('popover-1');
      popover2 = screen.getByTestId('popover-2');

      await userEvent.click(popover2);
      await flushMicrotasks();
      expect(popover1).toBeInTheDocument();
      expect(popover2).toBeInTheDocument();
      await userEvent.click(popover1);
      await flushMicrotasks();
      expect(popover2).not.toBeInTheDocument();

      unmount3();

      await render(() => <NestedApp modal={null} />);
      await flushMicrotasks();

      popover1 = screen.getByTestId('popover-1');
      popover2 = screen.getByTestId('popover-2');

      await userEvent.click(popover2);
      await flushMicrotasks();
      expect(popover1).toBeInTheDocument();
      expect(popover2).toBeInTheDocument();
      await userEvent.click(popover1);
      await flushMicrotasks();
      expect(popover2).not.toBeInTheDocument();
    });
  });

  describe('options set to false', () => {
    test('does not dismiss with escape key', async () => {
      await render(() => <App escapeKey={false} />);
      fireEvent.keyDown(document.body, { key: 'Escape' });
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      await flushMicrotasks();
    });

    test('does not dismiss with outside press', async () => {
      await render(() => <App outsidePress={false} />);
      await userEvent.click(document.body);
      await flushMicrotasks();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    test('does not dismiss with reference pointer down', async () => {
      await render(() => <App referencePress={() => false} />);
      await userEvent.click(screen.getByRole('button'));
      await flushMicrotasks();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    test('does not dismiss when clicking portaled children', async () => {
      function PortaledApp() {
        const [open, setOpen] = createSignal(true);
        const { refs, context } = useFloating({
          get open() {
            return open();
          },
          onOpenChange: setOpen,
        });

        const { getReferenceProps, getFloatingProps } = useTestInteractions([
          useDismiss(context.rootStore),
        ]);

        return (
          <>
            <button ref={refs.setReference} {...getReferenceProps()} />
            <Show when={open()}>
              <div ref={refs.setFloating} {...getFloatingProps()}>
                <FloatingPortal>
                  <button data-testid="portaled-button" />
                </FloatingPortal>
              </div>
            </Show>
          </>
        );
      }

      await render(() => <PortaledApp />);

      fireEvent.pointerDown(screen.getByTestId('portaled-button'), {
        bubbles: true,
      });
      await flushMicrotasks();

      expect(screen.getByTestId('portaled-button')).toBeInTheDocument();
    });

    test('outsidePress function guard', async () => {
      await render(() => <App outsidePress={() => true} />);
      await userEvent.click(document.body);
      await flushMicrotasks();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('prop: bubbles', () => {
    function Dialog(props: UseDismissProps & { testId: string; children: JSX.Element }) {
      const dismissProps = omit(props, 'testId', 'children');
      const [open, setOpen] = createSignal(true);
      const nodeId = useFloatingNodeId();

      const { refs, context } = useFloating({
        get open() {
          return open();
        },
        onOpenChange: setOpen,
        nodeId,
      });

      const { getReferenceProps, getFloatingProps } = useTestInteractions([
        useDismiss(context.rootStore, dismissProps),
      ]);

      return (
        <FloatingNode id={nodeId}>
          <button {...getReferenceProps({ ref: refs.setReference })} />
          <Show when={open()}>
            <FloatingFocusManager context={context.rootStore}>
              <div {...getFloatingProps({ ref: refs.setFloating })} data-testid={props.testId}>
                {props.children}
              </div>
            </FloatingFocusManager>
          </Show>
        </FloatingNode>
      );
    }

    function NestedDialog(props: UseDismissProps & { testId: string; children: JSX.Element }) {
      const parentId = useFloatingParentNodeId();

      // Port note: decided once, like upstream's per-render branch: the parent node can't change.
      if (parentId == null) {
        // eslint-disable-next-line solid/components-return-once
        return (
          <FloatingTree>
            <Dialog {...props} />
          </FloatingTree>
        );
      }

      return <Dialog {...props} />;
    }

    describe('normalizeProp', () => {
      test('undefined', () => {
        const { escapeKey: escapeKeyBubbles, outsidePress: outsidePressBubbles } = normalizeProp();

        expect(escapeKeyBubbles).toBe(false);
        expect(outsidePressBubbles).toBe(true);
      });

      test('when false', () => {
        const { escapeKey: escapeKeyBubbles, outsidePress: outsidePressBubbles } =
          normalizeProp(false);

        expect(escapeKeyBubbles).toBe(false);
        expect(outsidePressBubbles).toBe(false);
      });

      test('{}', () => {
        const { escapeKey: escapeKeyBubbles, outsidePress: outsidePressBubbles } = normalizeProp(
          {},
        );

        expect(escapeKeyBubbles).toBe(false);
        expect(outsidePressBubbles).toBe(true);
      });

      test('{ escapeKey: false }', () => {
        const { escapeKey: escapeKeyBubbles, outsidePress: outsidePressBubbles } = normalizeProp({
          escapeKey: false,
        });

        expect(escapeKeyBubbles).toBe(false);
        expect(outsidePressBubbles).toBe(true);
      });

      test('{ outsidePress: false }', () => {
        const { escapeKey: escapeKeyBubbles, outsidePress: outsidePressBubbles } = normalizeProp({
          outsidePress: false,
        });

        expect(escapeKeyBubbles).toBe(false);
        expect(outsidePressBubbles).toBe(false);
      });
    });

    describe('prop: bubbles.outsidePress', () => {
      test('when true', async () => {
        await render(() => (
          <NestedDialog testId="outer">
            <NestedDialog testId="inner">
              <button>test button</button>
            </NestedDialog>
          </NestedDialog>
        ));

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.getByTestId('inner')).toBeInTheDocument();

        fireEvent.pointerDown(document.body);
        flush();

        expect(screen.queryByTestId('outer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
      });

      test('when false', async () => {
        await render(() => (
          <NestedDialog testId="outer" bubbles={{ outsidePress: false }}>
            <NestedDialog testId="inner" bubbles={{ outsidePress: false }}>
              <button>test button</button>
            </NestedDialog>
          </NestedDialog>
        ));

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.getByTestId('inner')).toBeInTheDocument();

        fireEvent.pointerDown(document.body);
        flush();

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();

        fireEvent.pointerDown(document.body);
        flush();

        expect(screen.queryByTestId('outer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
      });

      test('mixed', async () => {
        await render(() => (
          <NestedDialog testId="outer" bubbles={{ outsidePress: true }}>
            <NestedDialog testId="inner" bubbles={{ outsidePress: false }}>
              <button>test button</button>
            </NestedDialog>
          </NestedDialog>
        ));

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.getByTestId('inner')).toBeInTheDocument();

        fireEvent.pointerDown(document.body);
        flush();

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();

        fireEvent.pointerDown(document.body);
        flush();

        expect(screen.queryByTestId('outer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
      });
    });

    describe('prop: bubbles.escapeKey', () => {
      test('without FloatingTree', async () => {
        function FocusApp() {
          const [popoverOpen, setPopoverOpen] = createSignal(true);
          const [tooltipOpen, setTooltipOpen] = createSignal(false);

          const popover = useFloating({
            get open() {
              return popoverOpen();
            },
            onOpenChange: setPopoverOpen,
          });
          const tooltip = useFloating({
            get open() {
              return tooltipOpen();
            },
            onOpenChange: setTooltipOpen,
          });

          const popoverInteractions = useTestInteractions([useDismiss(popover.context.rootStore)]);
          const tooltipInteractions = useTestInteractions([
            useFocus(tooltip.context.rootStore),
            useDismiss(tooltip.context.rootStore),
          ]);

          return (
            <>
              <button
                ref={popover.refs.setReference}
                {...popoverInteractions.getReferenceProps()}
              />
              <Show when={popoverOpen()}>
                <div
                  role="dialog"
                  ref={popover.refs.setFloating}
                  {...popoverInteractions.getFloatingProps()}
                >
                  <button
                    data-testid="focus-button"
                    ref={tooltip.refs.setReference}
                    {...tooltipInteractions.getReferenceProps()}
                  />
                </div>
              </Show>
              <Show when={tooltipOpen()}>
                <div
                  role="tooltip"
                  ref={tooltip.refs.setFloating}
                  {...tooltipInteractions.getFloatingProps()}
                />
              </Show>
            </>
          );
        }

        await render(() => <FocusApp />);

        await flushMicrotasks();
        screen.getByTestId('focus-button').focus();
        await flushMicrotasks();

        await waitFor(() => {
          expect(screen.getByRole('tooltip')).toBeInTheDocument();
        });

        await userEvent.keyboard('{Escape}');

        await waitFor(() => {
          expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        });
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      test('when true', async () => {
        await render(() => (
          <NestedDialog testId="outer" bubbles>
            <NestedDialog testId="inner" bubbles>
              <button>test button</button>
            </NestedDialog>
          </NestedDialog>
        ));

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.getByTestId('inner')).toBeInTheDocument();

        await userEvent.keyboard('{Escape}');
        await flushMicrotasks();

        expect(screen.queryByTestId('outer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
      });

      test('when false', async () => {
        await render(() => (
          <NestedDialog testId="outer" bubbles={{ escapeKey: false }}>
            <NestedDialog testId="inner" bubbles={{ escapeKey: false }}>
              <button>test button</button>
            </NestedDialog>
          </NestedDialog>
        ));

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.getByTestId('inner')).toBeInTheDocument();

        await userEvent.keyboard('{Escape}');
        await flushMicrotasks();

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();

        await userEvent.keyboard('{Escape}');
        await flushMicrotasks();

        expect(screen.queryByTestId('outer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
      });

      test('mixed', async () => {
        await render(() => (
          <NestedDialog testId="outer" bubbles={{ escapeKey: true }}>
            <NestedDialog testId="inner" bubbles={{ escapeKey: false }}>
              <button>test button</button>
            </NestedDialog>
          </NestedDialog>
        ));

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.getByTestId('inner')).toBeInTheDocument();

        await userEvent.keyboard('{Escape}');
        await flushMicrotasks();

        expect(screen.getByTestId('outer')).toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();

        await userEvent.keyboard('{Escape}');
        await flushMicrotasks();

        expect(screen.queryByTestId('outer')).not.toBeInTheDocument();
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
      });
    });
  });

  describe('prop: capture', () => {
    describe('normalizeProp', () => {
      test('undefined', () => {
        const { escapeKey: escapeKeyCapture, outsidePress: outsidePressCapture } = normalizeProp();

        expect(escapeKeyCapture).toBe(false);
        expect(outsidePressCapture).toBe(true);
      });

      test('{}', () => {
        const { escapeKey: escapeKeyCapture, outsidePress: outsidePressCapture } = normalizeProp(
          {},
        );

        expect(escapeKeyCapture).toBe(false);
        expect(outsidePressCapture).toBe(true);
      });

      test('when true', () => {
        const { escapeKey: escapeKeyCapture, outsidePress: outsidePressCapture } =
          normalizeProp(true);

        expect(escapeKeyCapture).toBe(true);
        expect(outsidePressCapture).toBe(true);
      });

      test('when false', () => {
        const { escapeKey: escapeKeyCapture, outsidePress: outsidePressCapture } =
          normalizeProp(false);

        expect(escapeKeyCapture).toBe(false);
        expect(outsidePressCapture).toBe(false);
      });

      test('{ escapeKey: true }', () => {
        const { escapeKey: escapeKeyCapture, outsidePress: outsidePressCapture } = normalizeProp({
          escapeKey: true,
        });

        expect(escapeKeyCapture).toBe(true);
        expect(outsidePressCapture).toBe(true);
      });

      test('{ outsidePress: false }', () => {
        const { escapeKey: escapeKeyCapture, outsidePress: outsidePressCapture } = normalizeProp({
          outsidePress: false,
        });

        expect(escapeKeyCapture).toBe(false);
        expect(outsidePressCapture).toBe(false);
      });
    });

    function Overlay(props: { children: JSX.Element }) {
      return (
        <div
          style={{ width: '100vw', height: '100vh' }}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
            }
          }}
        >
          <span>outside</span>
          {props.children}
        </div>
      );
    }

    function Dialog(props: UseDismissProps & { id: string; children: JSX.Element }) {
      const dismissProps = omit(props, 'id', 'children');
      const [open, setOpen] = createSignal(true);
      const nodeId = useFloatingNodeId();

      const { refs, context } = useFloating({
        get open() {
          return open();
        },
        onOpenChange: setOpen,
        nodeId,
      });

      const { getReferenceProps, getFloatingProps } = useTestInteractions([
        useDismiss(context.rootStore, dismissProps),
      ]);

      return (
        <FloatingNode id={nodeId}>
          <button {...getReferenceProps({ ref: refs.setReference })} />
          <Show when={open()}>
            <FloatingPortal>
              <FloatingFocusManager context={context.rootStore}>
                <div {...getFloatingProps({ ref: refs.setFloating })}>
                  <span>{props.id}</span>
                  {props.children}
                </div>
              </FloatingFocusManager>
            </FloatingPortal>
          </Show>
        </FloatingNode>
      );
    }

    function NestedDialog(props: UseDismissProps & { id: string; children: JSX.Element }) {
      const parentId = useFloatingParentNodeId();

      // Port note: decided once, like upstream's per-render branch: the parent node can't change.
      if (parentId == null) {
        // eslint-disable-next-line solid/components-return-once
        return (
          <FloatingTree>
            <Dialog {...props} />
          </FloatingTree>
        );
      }

      return <Dialog {...props} />;
    }

    describe('prop: capture.outsidePress', () => {
      test('when true', async () => {
        const user = userEvent.setup();

        await render(() => (
          <Overlay>
            <NestedDialog id="outer">
              <NestedDialog id="inner">{null}</NestedDialog>
            </NestedDialog>
          </Overlay>
        ));

        expect(screen.getByText('outer')).toBeInTheDocument();
        expect(screen.getByText('inner')).toBeInTheDocument();

        await user.click(screen.getByText('outer'));
        await flushMicrotasks();

        expect(screen.getByText('outer')).toBeInTheDocument();
        expect(screen.queryByText('inner')).not.toBeInTheDocument();

        await user.click(screen.getByText('outside'));
        await flushMicrotasks();

        expect(screen.queryByText('outer')).not.toBeInTheDocument();
        expect(screen.queryByText('inner')).not.toBeInTheDocument();
      });
    });

    describe('prop: capture.escapeKey', () => {
      test('when false', async () => {
        const user = userEvent.setup();

        await render(() => (
          <Overlay>
            <NestedDialog id="outer">
              <NestedDialog id="inner">{null}</NestedDialog>
            </NestedDialog>
          </Overlay>
        ));

        expect(screen.getByText('outer')).toBeInTheDocument();
        expect(screen.getByText('inner')).toBeInTheDocument();

        await user.keyboard('{Escape}');
        await flushMicrotasks();

        expect(screen.getByText('outer')).toBeInTheDocument();
        expect(screen.queryByText('inner')).not.toBeInTheDocument();

        await user.keyboard('{Escape}');
        await flushMicrotasks();

        expect(screen.queryByText('outer')).not.toBeInTheDocument();
        expect(screen.queryByText('inner')).not.toBeInTheDocument();
      });
    });
  });

  describe('outsidePressEvent: intentional', () => {
    test('dragging outside the floating element does not close', async () => {
      await render(() => <App outsidePressEvent="intentional" />);
      const floatingEl = screen.getByRole('tooltip');
      fireEvent.mouseDown(floatingEl);
      flush();
      fireEvent.mouseUp(document.body);
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      await flushMicrotasks();
    });

    test('dragging inside the floating element does not close', async () => {
      await render(() => <App outsidePressEvent="intentional" />);
      const floatingEl = screen.getByRole('tooltip');
      fireEvent.mouseDown(document.body);
      flush();
      fireEvent.mouseUp(floatingEl);
      flush();
      // The browser fires the gesture's click on the common ancestor of the
      // mousedown and mouseup targets; the mouseup inside the floating element
      // marks the React tree so this click must not dismiss.
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      await flushMicrotasks();
    });

    test('dragging outside the floating element then clicking outside closes', async () => {
      await render(() => <App outsidePressEvent="intentional" />);
      const floatingEl = screen.getByRole('tooltip');
      fireEvent.mouseDown(floatingEl);
      flush();
      fireEvent.mouseUp(document.body);
      flush();
      // A click event will have fired before the proper outside click.
      fireEvent.click(document.body);
      flush();
      fireEvent.click(document.body);
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('dragging outside the floating element then clicking outside closes with mouse clicks', async () => {
      await render(() => <App outsidePressEvent="intentional" />);
      const floatingEl = screen.getByRole('tooltip');
      fireEvent.pointerDown(floatingEl, { pointerType: 'mouse' });
      flush();
      fireEvent.mouseDown(floatingEl);
      flush();
      fireEvent.mouseUp(document.body);
      flush();

      // Real mouse clicks carry `detail: 1`. This one passes the press-observed guard
      // and is consumed by the one-shot drag suppression.
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // The next press-backed mouse click closes.
      fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
      flush();
      fireEvent.mouseDown(document.body);
      flush();
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('mouse click whose press started before open does not close', async () => {
      await render(() => <App outsidePressEvent="intentional" />);

      // The trailing click of a press that began before open, e.g. a menu item activated
      // by drag-release opening a dialog.
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // A press observed while open still closes.
      fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
      flush();
      fireEvent.mouseDown(document.body);
      flush();
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('compatibility events whose pointerdown opened the floating element do not count as a new press', async () => {
      function OpenOnPointerDownApp() {
        const [open, setOpen] = createSignal(false);
        const { refs, context } = useFloating({
          get open() {
            return open();
          },
          onOpenChange: setOpen,
        });
        const { getFloatingProps } = useTestInteractions([
          useDismiss(context.rootStore, { outsidePressEvent: 'intentional' }),
        ]);

        return (
          <>
            <button onPointerDown={() => setOpen(true)}>Open</button>
            <Show when={open()}>
              <div role="tooltip" {...getFloatingProps({ ref: refs.setFloating })} />
            </Show>
          </>
        );
      }

      await render(() => <OpenOnPointerDownApp />);

      const openButton = screen.getByRole('button', { name: 'Open' });
      fireEvent.pointerDown(openButton, { pointerType: 'mouse' });
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // The pointerdown happened before the floating element opened. Its
      // compatibility events arrive after opening but belong to the same press.
      fireEvent.mouseDown(openButton);
      flush();
      fireEvent.mouseUp(document.body);
      flush();
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // A new pointer press that begins while open still dismisses.
      fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
      flush();
      fireEvent.mouseDown(document.body);
      flush();
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('keyboard-generated outside click without a prior press closes', async () => {
      await render(() => <App outsidePressEvent="intentional" />);

      // Keyboard activations produce `detail: 0` clicks with no press.
      fireEvent.click(document.body, { detail: 0 });
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('press-less outside click reporting a pointer type closes', async () => {
      await render(() => <App outsidePressEvent="intentional" />);

      // Android assistive technology reports `pointerType: 'mouse'` with no press behind
      // it, so the click count is what separates the two.
      const click = new MouseEvent('click', { bubbles: true, detail: 0 });
      Object.defineProperty(click, 'pointerType', { value: 'mouse' });
      fireEvent(document.body, click);
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('press seen in a previous open session does not leak into a reopen', async () => {
      function ReopenApp() {
        const [open, setOpen] = createSignal(true);
        const { refs, context } = useFloating({
          get open() {
            return open();
          },
          onOpenChange: setOpen,
        });
        const { getReferenceProps, getFloatingProps } = useTestInteractions([
          useDismiss(context.rootStore, { outsidePressEvent: 'intentional' }),
        ]);

        return (
          <>
            <button
              {...getReferenceProps({ ref: refs.setReference, onClick: () => setOpen(true) })}
            />
            <Show when={open()}>
              <div role="tooltip" {...getFloatingProps({ ref: refs.setFloating })} />
            </Show>
          </>
        );
      }

      await render(() => <ReopenApp />);

      // A genuine outside press closes and leaves a press on record.
      fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
      flush();
      fireEvent.mouseDown(document.body);
      flush();
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button'));
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // The reopened session must not inherit the previous session's press:
      // a press-less trailing click still must not count as an outside press.
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // A press observed in the new session still closes.
      fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
      flush();
      fireEvent.mouseDown(document.body);
      flush();
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('press seen before a same-batch close and reopen does not leak into the new session', async () => {
      let context!: ReturnType<typeof useFloating>['context'];

      function BatchReopenApp() {
        const [open, setOpen] = createSignal(true);
        const floating = useFloating({
          get open() {
            return open();
          },
          onOpenChange: setOpen,
        });
        context = floating.context;
        const { getReferenceProps, getFloatingProps } = useTestInteractions([
          useDismiss(floating.context.rootStore, { outsidePressEvent: 'intentional' }),
        ]);

        return (
          <>
            <button {...getReferenceProps({ ref: floating.refs.setReference })} />
            <Show when={open()}>
              <div role="tooltip" {...getFloatingProps({ ref: floating.refs.setFloating })} />
            </Show>
          </>
        );
      }

      await render(() => <BatchReopenApp />);

      // A press lands while the first session is open.
      fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
      flush();
      fireEvent.mouseDown(document.body);
      flush();

      // React never renders `open === false` here, so only `openchange` can observe the
      // session boundary.
      context.rootStore.setOpen(false, createChangeEventDetails(REASONS.none));
      context.rootStore.setOpen(true, createChangeEventDetails(REASONS.none));
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // The gesture's trailing click belongs to the previous session and must
      // not dismiss the reopened floating element.
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // A press observed in the new session still closes.
      fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
      flush();
      fireEvent.mouseDown(document.body);
      flush();
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('press survives a redundant open dispatch while already open', async () => {
      let context!: ReturnType<typeof useFloating>['context'];

      function RedundantOpenApp() {
        const [open, setOpen] = createSignal(true);
        const floating = useFloating({
          get open() {
            return open();
          },
          onOpenChange: setOpen,
        });
        context = floating.context;
        const { getReferenceProps, getFloatingProps } = useTestInteractions([
          useDismiss(floating.context.rootStore, { outsidePressEvent: 'intentional' }),
        ]);

        return (
          <>
            <button {...getReferenceProps({ ref: floating.refs.setReference })} />
            <Show when={open()}>
              <div role="tooltip" {...getFloatingProps({ ref: floating.refs.setFloating })} />
            </Show>
          </>
        );
      }

      await render(() => <RedundantOpenApp />);

      // A genuine outside press lands while open.
      fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
      flush();
      fireEvent.mouseDown(document.body);
      flush();

      // A redundant open dispatch mid-gesture (hovering an inactive trigger does this)
      // does not end the session, so the press stays on record.
      context.rootStore.setOpen(true, createChangeEventDetails(REASONS.none));
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('press survives listener re-attachment while open', async () => {
      const [escapeKey, setEscapeKey] = createSignal<boolean | undefined>(undefined);
      await render(() => <App outsidePressEvent="intentional" escapeKey={escapeKey()} />);

      fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
      flush();
      fireEvent.mouseDown(document.body);
      flush();

      // Changing an effect dependency mid-gesture re-attaches the document listeners;
      // the observed press must survive that.
      setEscapeKey(false);
      flush();

      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('pointerdown-only press while open allows the outside click to close', async () => {
      await render(() => <App outsidePressEvent="intentional" />);

      // Pointer-event browsers may deliver `pointerdown` without a compat
      // `mousedown`; it must count as an observed press on its own.
      fireEvent.pointerDown(document.body);
      flush();
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('non-primary-button press does not count as an outside press', async () => {
      await render(() => <App outsidePressEvent="intentional" />);

      // A right-button press produces `contextmenu`, not `click`, so it must
      // not vouch for a later press-less click.
      fireEvent.pointerDown(document.body, { pointerType: 'mouse', button: 2 });
      flush();
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // A primary-button press still closes.
      fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
      flush();
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('cancelled press does not count as an outside press', async () => {
      await render(() => <App outsidePressEvent="intentional" />);

      // A press whose gesture is cancelled produces no click, so it must not
      // vouch for a later press-less click.
      fireEvent.pointerDown(document.body, { pointerType: 'touch' });
      flush();
      fireEvent.pointerCancel(document.body);
      flush();
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // A completed press still closes.
      fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
      flush();
      fireEvent.click(document.body, { detail: 1 });
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('inside click then programmatic outside click closes', async () => {
      await render(() => <App outsidePressEvent="intentional" />);
      const insideInput = screen.getByRole('textbox');

      fireEvent.mouseDown(insideInput);
      flush();
      fireEvent.mouseUp(insideInput);
      flush();
      fireEvent.click(insideInput);
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      fireEvent.click(document.body);
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('inside click after drag does not cause immediate close on first outside click', async () => {
      await render(() => <App outsidePressEvent="intentional" />);
      const floatingEl = screen.getByRole('tooltip');
      const insideInput = screen.getByRole('textbox');

      fireEvent.mouseDown(floatingEl);
      flush();
      fireEvent.mouseUp(document.body);
      flush();

      // Inside clicks should never dismiss, and they should not consume the
      // one-shot outside click suppression from the drag that started inside.
      fireEvent.click(insideInput);
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // First true outside click after that drag is still ignored once.
      fireEvent.click(document.body);
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      // The next outside click is a deliberate outside press and dismisses.
      fireEvent.click(document.body);
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('drag ending on outsidePress-ignored target does not consume next outside click', async () => {
      await render(() => (
        <App
          outsidePressEvent="intentional"
          outsidePress={(event) => !(event.target as Element)?.closest('[data-testid="ignore"]')}
        />
      ));
      const floatingEl = screen.getByRole('tooltip');
      const ignored = document.createElement('div');
      ignored.setAttribute('data-testid', 'ignore');
      document.body.append(ignored);

      fireEvent.mouseDown(floatingEl);
      flush();
      fireEvent.mouseUp(ignored);
      flush();

      fireEvent.click(document.body);
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('press start prevented inside does not require double outside click', async () => {
      function AppWithPreventedPressStart() {
        const [open, setOpen] = createSignal(true);
        const { refs, context } = useFloating({
          get open() {
            return open();
          },
          onOpenChange: setOpen,
        });
        const { getReferenceProps, getFloatingProps } = useTestInteractions([
          useDismiss(context.rootStore, { outsidePressEvent: 'intentional' }),
        ]);

        return (
          <>
            <button {...getReferenceProps({ ref: refs.setReference })} />
            <Show when={open()}>
              <div role="tooltip" {...getFloatingProps({ ref: refs.setFloating })}>
                <div data-testid="scrubber" onPointerDown={(event) => event.preventDefault()} />
              </div>
            </Show>
          </>
        );
      }

      await render(() => <AppWithPreventedPressStart />);
      const scrubber = screen.getByTestId('scrubber');

      fireEvent.pointerDown(scrubber, { pointerType: 'mouse', button: 0 });
      flush();
      fireEvent.mouseDown(scrubber, { button: 0 });
      flush();
      fireEvent.pointerUp(document.body, { pointerType: 'mouse', button: 0 });
      flush();
      fireEvent.mouseUp(document.body, { button: 0 });
      flush();

      // Wait a tick: if no immediate synthetic click occurred after pointerup,
      // the next user click should still dismiss.
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      await flushMicrotasks();

      fireEvent.pointerDown(document.body, { pointerType: 'mouse', button: 0 });
      flush();
      fireEvent.mouseDown(document.body, { button: 0 });
      flush();
      fireEvent.pointerUp(document.body, { pointerType: 'mouse', button: 0 });
      flush();
      fireEvent.mouseUp(document.body, { button: 0 });
      flush();
      fireEvent.click(document.body);
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('press start prevented inside suppresses only immediate outside click', async () => {
      function AppWithPreventedPressStart() {
        const [open, setOpen] = createSignal(true);
        const { refs, context } = useFloating({
          get open() {
            return open();
          },
          onOpenChange: setOpen,
        });
        const { getReferenceProps, getFloatingProps } = useTestInteractions([
          useDismiss(context.rootStore, { outsidePressEvent: 'intentional' }),
        ]);

        return (
          <>
            <button {...getReferenceProps({ ref: refs.setReference })} />
            <Show when={open()}>
              <div role="tooltip" {...getFloatingProps({ ref: refs.setFloating })}>
                <div data-testid="scrubber" onPointerDown={(event) => event.preventDefault()} />
              </div>
            </Show>
          </>
        );
      }

      await render(() => <AppWithPreventedPressStart />);
      const scrubber = screen.getByTestId('scrubber');

      fireEvent.pointerDown(scrubber, { pointerType: 'mouse', button: 0 });
      flush();
      fireEvent.mouseDown(scrubber, { button: 0 });
      flush();
      fireEvent.pointerUp(document.body, { pointerType: 'mouse', button: 0 });
      flush();
      fireEvent.mouseUp(document.body, { button: 0 });
      flush();

      fireEvent.click(document.body);
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      await flushMicrotasks();

      fireEvent.click(document.body);
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    test('pointercancel after prevented press start suppresses immediate outside click', async () => {
      function AppWithPreventedPressStart() {
        const [open, setOpen] = createSignal(true);
        const { refs, context } = useFloating({
          get open() {
            return open();
          },
          onOpenChange: setOpen,
        });
        const { getReferenceProps, getFloatingProps } = useTestInteractions([
          useDismiss(context.rootStore, { outsidePressEvent: 'intentional' }),
        ]);

        return (
          <>
            <button {...getReferenceProps({ ref: refs.setReference })} />
            <Show when={open()}>
              <div role="tooltip" {...getFloatingProps({ ref: refs.setFloating })}>
                <div data-testid="scrubber" onPointerDown={(event) => event.preventDefault()} />
              </div>
            </Show>
          </>
        );
      }

      await render(() => <AppWithPreventedPressStart />);
      const scrubber = screen.getByTestId('scrubber');

      fireEvent.pointerDown(scrubber, { pointerType: 'mouse', button: 0 });
      flush();
      fireEvent.mouseDown(scrubber, { button: 0 });
      flush();
      fireEvent.pointerCancel(document.body, { pointerType: 'mouse' });
      flush();

      fireEvent.click(document.body);
      flush();
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      await flushMicrotasks();

      fireEvent.click(document.body);
      flush();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  test('nested floating elements with different portal containers', async () => {
    function ButtonWithFloating(props: {
      children?: JSX.Element;
      portalContainer?: HTMLElement | null;
      triggerText: string;
    }) {
      const [open, setOpen] = createSignal(false);
      // Port note: `floatingStyles` is a getter, so it's read from the returned object.
      const floating = useFloating({
        get open() {
          return open();
        },
        onOpenChange: setOpen,
      });
      const { refs, context } = floating;

      const click = useClick(context.rootStore);
      const dismiss = useDismiss(context.rootStore);

      const { getReferenceProps, getFloatingProps } = useTestInteractions([click, dismiss]);

      return (
        <>
          <button ref={refs.setReference} {...getReferenceProps()}>
            {props.triggerText}
          </button>
          <Show when={open()}>
            <FloatingPortal container={props.portalContainer}>
              <FloatingFocusManager context={context.rootStore} modal={false}>
                <div ref={refs.setFloating} style={floating.floatingStyles} {...getFloatingProps()}>
                  {props.children}
                </div>
              </FloatingFocusManager>
            </FloatingPortal>
          </Show>
        </>
      );
    }

    function PortalApp() {
      const [otherContainer, setOtherContainer] = createSignal<HTMLDivElement | null>();

      const portal1 = undefined;
      const portal2 = otherContainer;

      return (
        <>
          <ButtonWithFloating portalContainer={portal1} triggerText="open 1">
            <ButtonWithFloating portalContainer={portal2()} triggerText="open 2">
              <button>nested</button>
            </ButtonWithFloating>
          </ButtonWithFloating>
          <div ref={setOtherContainer} />
        </>
      );
    }

    await render(() => <PortalApp />);

    await userEvent.click(screen.getByText('open 1'));
    await flushMicrotasks();
    expect(screen.getByText('open 2')).toBeInTheDocument();

    await userEvent.click(screen.getByText('open 2'));
    await flushMicrotasks();

    expect(screen.getByText('open 1')).toBeInTheDocument();
    expect(screen.getByText('open 2')).toBeInTheDocument();
    expect(screen.getByText('nested')).toBeInTheDocument();
  });
});
