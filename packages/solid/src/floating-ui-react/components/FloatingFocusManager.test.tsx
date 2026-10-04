import { test, vi, expect, beforeEach, describe } from 'vitest';
/* eslint-disable jsx-a11y/role-has-required-aria-props */
/* eslint-disable no-promise-executor-return */

import userEvent from '@testing-library/user-event';
import type { InteractionType } from '@base-ui-solid/utils/useEnhancedClickHandler';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { within } from '@solidjs/testing-library';
import { createSignal, flush, runWithOwner, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { render as renderSolid } from '@solidjs/web';
import {
  flushMicrotasks,
  fireEvent,
  render,
  screen,
  waitFor,
  isJSDOM,
  useTestInteractions,
} from '#test-utils';
import {
  FloatingFocusManager,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  useClick,
  useDismiss,
  useFloatingNodeId,
  useFloatingParentNodeId,
} from '../index';
import { useFloating } from '../../../test/floating-ui-tests/useFloating';
import type { FloatingFocusManagerProps } from './FloatingFocusManager';
import { Main as Navigation } from '../../../test/floating-ui-tests/Navigation';
import { useHover } from '../../../test/floating-ui-tests/useHover';

// TODO (@Janpot) It looks like the toHaveFocus assertion from @mui/internal-test-utils
// is not working correctly with iframes and nested documents. Helper as a workaround
// until fixed.
function isFocused(element: Element): boolean {
  let doc = element.ownerDocument;
  let current: Element = element;

  while (doc) {
    if (doc.activeElement !== current) {
      return false;
    }

    // Move up to the parent document
    const frame = doc.defaultView?.frameElement; // the <iframe> hosting this doc
    if (!frame) {
      return true;
    }

    current = frame;
    doc = frame.ownerDocument;
  }

  return true;
}

beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
    (callback: FrameRequestCallback): number => {
      callback(0);
      return 0;
    },
  );

  Object.defineProperty(HTMLElement.prototype, 'inert', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: true,
  });
});

function App(
  props: Partial<
    Omit<FloatingFocusManagerProps, 'initialFocus'> & {
      initialFocus?: 'two' | boolean;
    }
  >,
) {
  const ref: RefObject<HTMLButtonElement | null> = { current: null };
  const [open, setOpen] = createSignal(false);
  const { refs, context } = useFloating({
    get open() {
      return open();
    },
    onOpenChange: setOpen,
  });

  return (
    <>
      <button data-testid="reference" ref={refs.setReference} onClick={() => setOpen(!open())} />
      {open() && (
        <FloatingFocusManager
          {...props}
          initialFocus={props.initialFocus === 'two' ? ref : props.initialFocus}
          context={context.rootStore}
        >
          <div role="dialog" ref={refs.setFloating} data-testid="floating">
            <button data-testid="one">close</button>
            <button
              data-testid="two"
              ref={(element) => {
                ref.current = element;
              }}
            >
              confirm
            </button>
            <button data-testid="three" onClick={() => setOpen(false)}>
              x
            </button>
            {props.children}
          </div>
        </FloatingFocusManager>
      )}
      <div tabindex={0} data-testid="last">
        outside
      </div>
    </>
  );
}

// Port note: React focuses `autoFocus` elements when they mount, Solid only sets the attribute.
// This focuses the element in an effect, like React's commit phase.
function autoFocus() {
  let element: HTMLElement | undefined;
  useIsoLayoutEffect(
    () => {
      element?.focus();
    },
    () => [],
  );
  return (node: HTMLElement) => {
    element = node;
  };
}

function RadioApp() {
  const [open, setOpen] = createSignal(false);
  const { refs, context } = useFloating({
    get open() {
      return open();
    },
    onOpenChange: setOpen,
  });

  return (
    <>
      <button data-testid="reference" ref={refs.setReference} onClick={() => setOpen(!open())} />
      {open() && (
        <FloatingFocusManager context={context.rootStore}>
          <div role="dialog" ref={refs.setFloating}>
            <input type="radio" name="group" data-testid="radio-one" />
            <input type="radio" name="group" checked data-testid="radio-two" />
            <button data-testid="after-radio">after</button>
          </div>
        </FloatingFocusManager>
      )}
    </>
  );
}

function MouseDownApp() {
  const [open, setOpen] = createSignal(false);
  const { refs, context } = useFloating({
    get open() {
      return open();
    },
    onOpenChange: setOpen,
  });
  const { getReferenceProps, getFloatingProps } = useTestInteractions([
    useClick(context.rootStore, { event: 'mousedown' }),
  ]);

  return (
    <>
      <button data-testid="reference" {...getReferenceProps({ ref: refs.setReference })} />
      {open() && (
        <FloatingFocusManager context={context.rootStore}>
          <div role="dialog" {...getFloatingProps({ ref: refs.setFloating })}>
            <button data-testid="one">close</button>
          </div>
        </FloatingFocusManager>
      )}
    </>
  );
}

// Port note: Solid can't clone the reference element, so `children` is a function that receives
// the reference props to spread on it.
interface DialogProps {
  open?: boolean;
  render: (props: { close: () => void }) => JSX.Element;
  children: (referenceProps: Record<string, unknown>) => JSX.Element;
}

function Dialog(props: DialogProps) {
  const [open, setOpen] = createSignal(untrack(() => props.open) ?? false);
  const nodeId = useFloatingNodeId();

  const { refs, context } = useFloating({
    get open() {
      return open();
    },
    onOpenChange: setOpen,
    nodeId,
  });

  const { getReferenceProps, getFloatingProps } = useTestInteractions([
    useClick(context.rootStore),
    useDismiss(context.rootStore, { bubbles: false }),
  ]);

  return (
    <FloatingNode id={nodeId}>
      {props.children(getReferenceProps({ ref: refs.setReference }))}
      <FloatingPortal>
        {open() && (
          <FloatingFocusManager context={context.rootStore}>
            <div {...getFloatingProps({ ref: refs.setFloating })}>
              {props.render({
                close: () => setOpen(false),
              })}
            </div>
          </FloatingFocusManager>
        )}
      </FloatingPortal>
    </FloatingNode>
  );
}

describe('FloatingFocusManager', () => {
  describe.skipIf(!isJSDOM)('JSDOM-only coverage', () => {
    describe('prop: initialFocus', () => {
      test('default behavior focuses first tabbable element', async () => {
        await render(() => <App />);

        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        expect(screen.getByTestId('one')).toHaveFocus();
      });

      test('default behavior focuses the checked radio in a named group', async () => {
        await render(() => <RadioApp />);

        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        expect(screen.getByTestId('radio-two')).toHaveFocus();
      });

      test('ref', async () => {
        await render(() => <App initialFocus="two" />);
        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        expect(screen.getByTestId('two')).toHaveFocus();
      });

      test('respects autoFocus', async () => {
        await render(() => (
          <App>
            <input autofocus ref={autoFocus()} data-testid="input" />
          </App>
        ));
        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();
        expect(screen.getByTestId('input')).toHaveFocus();
      });

      test('focuses without a frame delay when a screen reader press opens it', async () => {
        await render(() => <MouseDownApp />);

        // A screen reader press is a `mousedown` with `detail: 0`.
        fireEvent.mouseDown(screen.getByTestId('reference'), { detail: 0 });

        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
        await flushMicrotasks();

        expect(screen.getByTestId('one')).toHaveFocus();
      });

      test('keeps the frame delay for a real mouse press', async () => {
        await render(() => <MouseDownApp />);

        fireEvent.mouseDown(screen.getByTestId('reference'), { detail: 1 });

        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
        await flushMicrotasks();

        expect(screen.getByTestId('one')).not.toHaveFocus();
      });
    });

    describe('prop: returnFocus', () => {
      test('when true', async () => {
        const [returnFocus, setReturnFocus] = createSignal<boolean | undefined>(undefined);
        await render(() => <App returnFocus={returnFocus()} />);

        screen.getByTestId('reference').focus();
        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        expect(screen.getByTestId('one')).toHaveFocus();

        screen.getByTestId('two').focus();

        setReturnFocus(false);
        flush();

        expect(screen.getByTestId('two')).toHaveFocus();

        fireEvent.click(screen.getByTestId('three'));
        expect(screen.getByTestId('reference')).not.toHaveFocus();
      });

      test('when false', async () => {
        await render(() => <App returnFocus={false} />);

        screen.getByTestId('reference').focus();
        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        expect(screen.getByTestId('one')).toHaveFocus();

        fireEvent.click(screen.getByTestId('three'));
        expect(screen.getByTestId('reference')).not.toHaveFocus();
      });

      test('ref', async () => {
        function Test() {
          const ref: RefObject<HTMLInputElement | null> = { current: null };
          return (
            <div>
              <input />
              <input
                data-testid="focus-target"
                ref={(element) => {
                  ref.current = element;
                }}
              />
              <input />
              <App returnFocus={ref} />
            </div>
          );
        }

        await render(() => <Test />);
        screen.getByTestId('reference').focus();
        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        fireEvent.click(screen.getByTestId('three'));
        await flushMicrotasks();
        expect(screen.getByTestId('focus-target')).toHaveFocus();
      });

      test('always returns to the reference for nested elements', async () => {
        function NestedDialog(props: DialogProps) {
          const parentId = useFloatingParentNodeId();

          if (parentId == null) {
            // The parent node can't change, so the branch is decided once, like upstream.
            // eslint-disable-next-line solid/components-return-once
            return (
              <FloatingTree>
                <Dialog {...props} />
              </FloatingTree>
            );
          }

          return <Dialog {...props} />;
        }

        await render(() => (
          <NestedDialog
            render={({ close }) => (
              <>
                <NestedDialog
                  render={({ close: closeNested }) => (
                    <button onClick={closeNested} data-testid="close-nested-dialog" />
                  )}
                >
                  {(referenceProps) => (
                    <button data-testid="open-nested-dialog" {...referenceProps} />
                  )}
                </NestedDialog>
                <button onClick={close} data-testid="close-dialog" />
              </>
            )}
          >
            {(referenceProps) => <button data-testid="open-dialog" {...referenceProps} />}
          </NestedDialog>
        ));

        await userEvent.click(screen.getByTestId('open-dialog'));
        await userEvent.click(screen.getByTestId('open-nested-dialog'));

        expect(screen.getByTestId('close-nested-dialog')).toBeInTheDocument();

        fireEvent.pointerDown(document.body);
        await flushMicrotasks();

        expect(screen.queryByTestId('close-nested-dialog')).not.toBeInTheDocument();

        fireEvent.pointerDown(document.body);
        await flushMicrotasks();

        expect(screen.queryByTestId('close-dialog')).not.toBeInTheDocument();
      });

      test('return to the first focusable descendent of the reference, if the reference is not focusable', async () => {
        await render(() => (
          <Dialog render={({ close }) => <button onClick={close} data-testid="close-dialog" />}>
            {(referenceProps) => (
              <div data-testid="non-focusable-reference" {...referenceProps}>
                <button data-testid="open-dialog" />
              </div>
            )}
          </Dialog>
        ));
        screen.getByTestId('open-dialog').focus();
        await userEvent.keyboard('{Enter}');

        expect(screen.getByTestId('close-dialog')).toBeInTheDocument();

        // Port note: React normalizes the legacy `Esc` key value to `Escape`; native events don't.
        await userEvent.keyboard('{Escape}');

        expect(screen.queryByTestId('close-dialog')).not.toBeInTheDocument();

        expect(screen.getByTestId('open-dialog')).toHaveFocus();
      });

      test('preserves tabbable context next to reference element if removed (modal)', async () => {
        function App() {
          const [isOpen, setIsOpen] = createSignal(false);
          const [removed, setRemoved] = createSignal(false);

          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          const click = useClick(context.rootStore);

          const { getReferenceProps, getFloatingProps } = useTestInteractions([click]);

          return (
            <>
              {!removed() && (
                <button ref={refs.setReference} {...getReferenceProps()} data-testid="reference" />
              )}
              {isOpen() && (
                <FloatingPortal>
                  <FloatingFocusManager context={context.rootStore}>
                    <div ref={refs.setFloating} {...getFloatingProps()}>
                      <button
                        data-testid="remove"
                        onClick={() => {
                          setRemoved(true);
                          setIsOpen(false);
                        }}
                      >
                        remove
                      </button>
                    </div>
                  </FloatingFocusManager>
                </FloatingPortal>
              )}
              <button data-testid="fallback" />
            </>
          );
        }

        await render(() => <App />);

        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        fireEvent.click(screen.getByTestId('remove'));
        await flushMicrotasks();

        await userEvent.tab();

        expect(screen.getByTestId('fallback')).toHaveFocus();
      });

      test('preserves tabbable context next to reference element if removed (non-modal)', async () => {
        function App() {
          const [isOpen, setIsOpen] = createSignal(false);
          const [removed, setRemoved] = createSignal(false);

          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          const click = useClick(context.rootStore);

          const { getReferenceProps, getFloatingProps } = useTestInteractions([click]);

          return (
            <>
              {!removed() && (
                <button ref={refs.setReference} {...getReferenceProps()} data-testid="reference" />
              )}
              {isOpen() && (
                <FloatingPortal>
                  <FloatingFocusManager context={context.rootStore} modal={false}>
                    <div ref={refs.setFloating} {...getFloatingProps()}>
                      <button
                        data-testid="remove"
                        onClick={() => {
                          setRemoved(true);
                          setIsOpen(false);
                        }}
                      >
                        remove
                      </button>
                    </div>
                  </FloatingFocusManager>
                </FloatingPortal>
              )}
              <button data-testid="fallback" />
            </>
          );
        }

        await render(() => <App />);

        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        fireEvent.click(screen.getByTestId('remove'));
        await flushMicrotasks();

        await userEvent.tab();

        expect(screen.getByTestId('fallback')).toHaveFocus();
      });

      test.skipIf(!isJSDOM)(
        'does not return focus to reference on outside press when preventScroll is not supported',
        async () => {
          function App() {
            const [isOpen, setIsOpen] = createSignal(false);

            const { refs, context } = useFloating({
              get open() {
                return isOpen();
              },
              onOpenChange: setIsOpen,
            });

            const click = useClick(context.rootStore);
            const dismiss = useDismiss(context.rootStore);

            const { getReferenceProps, getFloatingProps } = useTestInteractions([click, dismiss]);

            return (
              <>
                <button ref={refs.setReference} {...getReferenceProps()}>
                  reference
                </button>
                {isOpen() && (
                  <FloatingFocusManager context={context.rootStore}>
                    <div ref={refs.setFloating} {...getFloatingProps()} data-testid="floating" />
                  </FloatingFocusManager>
                )}
              </>
            );
          }

          await render(() => <App />);

          await userEvent.click(screen.getByText('reference'));
          await flushMicrotasks();

          expect(screen.getByTestId('floating')).toHaveFocus();

          await userEvent.click(document.body);
          await flushMicrotasks();

          expect(screen.getByText('reference')).not.toHaveFocus();
        },
      );

      test('returns focus to reference on outside press when preventScroll is supported', async () => {
        const originalFocus = HTMLElement.prototype.focus;
        Object.defineProperty(HTMLElement.prototype, 'focus', {
          configurable: true,
          writable: true,
          value(options: any) {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            options && options.preventScroll;
            return originalFocus.call(this, options);
          },
        });

        function App() {
          const [isOpen, setIsOpen] = createSignal(false);

          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          const click = useClick(context.rootStore);
          const dismiss = useDismiss(context.rootStore);

          const { getReferenceProps, getFloatingProps } = useTestInteractions([click, dismiss]);

          return (
            <>
              <button ref={refs.setReference} {...getReferenceProps()}>
                reference
              </button>
              {isOpen() && (
                <FloatingFocusManager context={context.rootStore}>
                  <div ref={refs.setFloating} {...getFloatingProps()} data-testid="floating" />
                </FloatingFocusManager>
              )}
            </>
          );
        }

        await render(() => <App />);

        await userEvent.click(screen.getByText('reference'));
        await flushMicrotasks();

        expect(screen.getByTestId('floating')).toHaveFocus();

        await userEvent.click(document.body);
        await flushMicrotasks();

        expect(screen.getByText('reference')).toHaveFocus();

        HTMLElement.prototype.focus = originalFocus;
      });

      test('passes focusVisible when returning focus after keyboard close', async () => {
        function App() {
          const [isOpen, setIsOpen] = createSignal(false);

          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          const click = useClick(context.rootStore);
          const dismiss = useDismiss(context.rootStore);

          const { getReferenceProps, getFloatingProps } = useTestInteractions([click, dismiss]);

          return (
            <>
              <button ref={refs.setReference} {...getReferenceProps()}>
                reference
              </button>
              {isOpen() && (
                <FloatingFocusManager context={context.rootStore}>
                  <div ref={refs.setFloating} {...getFloatingProps()} data-testid="floating" />
                </FloatingFocusManager>
              )}
            </>
          );
        }

        await render(() => <App />);

        const reference = screen.getByText('reference');
        await userEvent.click(reference);
        await flushMicrotasks();

        expect(screen.getByTestId('floating')).toHaveFocus();

        const focusSpy = vi.spyOn(reference, 'focus');

        try {
          await userEvent.keyboard('{Escape}');

          await waitFor(() => {
            expect(focusSpy).toHaveBeenCalledWith({
              preventScroll: true,
              focusVisible: true,
            });
          });
        } finally {
          focusSpy.mockRestore();
        }
      });

      test('omits focusVisible when returning focus after pointer close', async () => {
        function App() {
          const [isOpen, setIsOpen] = createSignal(false);

          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          const click = useClick(context.rootStore);
          const dismiss = useDismiss(context.rootStore);

          const { getReferenceProps, getFloatingProps } = useTestInteractions([click, dismiss]);

          return (
            <>
              <button ref={refs.setReference} {...getReferenceProps()}>
                reference
              </button>
              {isOpen() && (
                <FloatingFocusManager context={context.rootStore}>
                  <div ref={refs.setFloating} {...getFloatingProps()} data-testid="floating" />
                </FloatingFocusManager>
              )}
            </>
          );
        }

        await render(() => <App />);

        const reference = screen.getByText('reference');
        await userEvent.click(reference);
        await flushMicrotasks();

        expect(screen.getByTestId('floating')).toHaveFocus();

        const focusSpy = vi.spyOn(reference, 'focus');

        try {
          // Closing with a pointer must not force `:focus-visible`; `focusVisible`
          // is omitted entirely so the browser's own heuristics decide.
          await userEvent.click(reference);

          await waitFor(() => {
            expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
          });
          expect(focusSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({ focusVisible: true }),
          );
        } finally {
          focusSpy.mockRestore();
        }
      });

      test('does not return focus while open when the reference changes', async () => {
        function App(props: { useSecond?: boolean }) {
          const [isOpen, setIsOpen] = createSignal(false);

          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          const click = useClick(context.rootStore);
          const { getReferenceProps, getFloatingProps } = useTestInteractions([click]);

          // Port note: Solid refs are only called once, so the reference is switched with an
          // effect instead of swapping the `ref` props.
          let first: HTMLButtonElement | null = null;
          let second: HTMLButtonElement | null = null;
          useIsoLayoutEffect(
            ([useSecond]) => {
              refs.setReference(useSecond ? second : first);
            },
            () => [props.useSecond],
          );

          return (
            <>
              <button
                data-testid="first"
                ref={(element) => {
                  first = element;
                }}
                {...getReferenceProps()}
              />
              <button
                data-testid="second"
                ref={(element) => {
                  second = element;
                }}
              />
              {isOpen() && (
                <FloatingFocusManager context={context.rootStore}>
                  <div ref={refs.setFloating} {...getFloatingProps()}>
                    <button data-testid="child" />
                    <button data-testid="close" onClick={() => setIsOpen(false)} />
                  </div>
                </FloatingFocusManager>
              )}
            </>
          );
        }

        const [useSecond, setUseSecond] = createSignal(false);
        await render(() => <App useSecond={useSecond()} />);

        await userEvent.click(screen.getByTestId('first'));
        await flushMicrotasks();

        const child = screen.getByTestId('child');
        child.focus();
        await flushMicrotasks();

        // The return-focus effect re-arms for the new reference while the popup stays open, so
        // the cleanup's queued return focus must be cancelled rather than yank focus mid-open.
        setUseSecond(true);
        await flushMicrotasks();

        expect(child).toHaveFocus();

        await userEvent.click(screen.getByTestId('close'));
        await flushMicrotasks();

        // The cancelled job must not have left return focus suppressed for the real close.
        expect(screen.getByTestId('second')).toHaveFocus();
      });

      test('does not insert fallback element when return element is falsy', async () => {
        function App() {
          const [isOpen, setIsOpen] = createSignal(false);

          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          const click = useClick(context.rootStore);
          const { getReferenceProps, getFloatingProps } = useTestInteractions([click]);

          return (
            <>
              <button data-testid="reference" ref={refs.setReference} {...getReferenceProps()} />
              <FloatingPortal>
                {isOpen() && (
                  <FloatingFocusManager context={context.rootStore} returnFocus={() => undefined}>
                    <div ref={refs.setFloating} {...getFloatingProps()}>
                      <button data-testid="close" onClick={() => setIsOpen(false)} />
                    </div>
                  </FloatingFocusManager>
                )}
              </FloatingPortal>
            </>
          );
        }

        await render(() => <App />);

        const reference = screen.getByTestId('reference');
        await userEvent.click(reference);
        await flushMicrotasks();

        expect(reference.nextElementSibling).toBeNull();

        await userEvent.click(screen.getByTestId('close'));

        await waitFor(() => {
          expect(screen.queryByTestId('close')).toBeNull();
        });

        expect(reference.nextElementSibling).toBeNull();
      });
    });

    describe('iframe focus navigation', () => {
      function App(props: { iframe: HTMLElement }) {
        return (
          <div>
            <a href="#">prev iframe link</a>
            <Popover
              portalRef={props.iframe}
              render={() => (
                <div data-testid="popover">
                  <a href="#">popover link 1</a>
                  <a href="#">popover link 2</a>
                </div>
              )}
            >
              {(referenceProps) => <button {...referenceProps}>Open</button>}
            </Popover>
            <a href="#">next iframe link</a>
          </div>
        );
      }

      // Port note: Solid can't clone the reference element, so `children` is a function that
      // receives the reference props to spread on it.
      function Popover(props: {
        children: (referenceProps: Record<string, unknown>) => JSX.Element;
        render: () => JSX.Element;
        portalRef?: HTMLElement;
      }) {
        const [open, setOpen] = createSignal(false);

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
            {props.children(getReferenceProps({ ref: refs.setReference }))}
            {open() && (
              <FloatingPortal container={props.portalRef}>
                <FloatingFocusManager context={context.rootStore} modal={false}>
                  <div
                    ref={refs.setFloating}
                    style={floating.floatingStyles}
                    {...getFloatingProps()}
                  >
                    {props.render()}
                  </div>
                </FloatingFocusManager>
              </FloatingPortal>
            )}
          </>
        );
      }

      function IframeApp() {
        useIsoLayoutEffect(
          () => {
            function createIframe() {
              const innerRoot = document.querySelector('#innerRoot');
              const iframe = document.createElement('iframe');
              iframe.setAttribute('data-testid', 'iframe');
              iframe.src = 'about:blank';
              iframe.style.height = '300px';

              innerRoot?.appendChild(iframe);

              // Properly open, write, and close the iframe document.
              const iframeDoc = iframe.contentWindow?.document;
              if (iframeDoc) {
                iframeDoc.open();
                iframeDoc.write(`<div id="rootIframe"></div>`);
                iframeDoc.close();
              }

              const rootIframe = iframe.contentWindow?.document.getElementById('rootIframe');
              return rootIframe;
            }

            const root = createIframe();
            if (root) {
              // Port note: a separate root, like upstream's `createRoot`.
              runWithOwner(null, () => renderSolid(() => <App iframe={root} />, root));
            }
          },
          () => [],
        );

        return (
          <>
            <a href="#">Outside link 1</a>
            <div id="innerRoot" />
            <a href="#">Outside link 2</a>
          </>
        );
      }

      /* eslint-disable testing-library/prefer-screen-queries */
      // "Should not already be working"(?) when trying to click within the iframe
      // https://github.com/react/react/pull/32441
      test.skipIf(!isJSDOM)('tabs from the popover to the next element in the iframe', async () => {
        await render(() => <IframeApp />);

        const iframe: HTMLIFrameElement = await screen.findByTestId('iframe');
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        const iframeWithin = iframeDoc ? within(iframeDoc.body) : screen;

        const user = userEvent.setup({ document: iframeDoc });

        await user.click(iframeWithin.getByRole('button', { name: 'Open' }));

        // Port note: Solid clones its templates from the main document, so the nodes keep the main
        // window's prototypes after adoption into the iframe, which `toBeInTheDocument` rejects.
        expect(iframeDoc?.contains(iframeWithin.getByTestId('popover'))).toBe(true);

        await user.tab();
        await user.tab();

        expect(isFocused(iframeWithin.getByText('next iframe link'))).toBe(true);
      });

      // "Should not already be working"(?) when trying to click within the iframe
      // https://github.com/react/react/pull/32441
      test.skipIf(!isJSDOM)(
        'shift+tab from the popover to the previous element in the iframe',
        async () => {
          await render(() => <IframeApp />);

          const iframe: HTMLIFrameElement = await screen.findByTestId('iframe');
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          const iframeWithin = iframeDoc ? within(iframeDoc.body) : screen;

          const user = userEvent.setup({ document: iframeDoc });

          await user.click(iframeWithin.getByRole('button', { name: 'Open' }));

          // Port note: Solid clones its templates from the main document, so the nodes keep the main
          // window's prototypes after adoption into the iframe, which `toBeInTheDocument` rejects.
          expect(iframeDoc?.contains(iframeWithin.getByTestId('popover'))).toBe(true);

          await user.tab({ shift: true });

          expect(isFocused(iframeWithin.getByRole('button', { name: 'Open' }))).toBe(true);
        },
      );
    });
    /* eslint-enable testing-library/prefer-screen-queries */

    describe('prop: modal', () => {
      test('when true', async () => {
        await render(() => <App modal />);

        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        await userEvent.tab();
        expect(screen.getByTestId('two')).toHaveFocus();

        await userEvent.tab();
        expect(screen.getByTestId('three')).toHaveFocus();

        await userEvent.tab();
        expect(screen.getByTestId('one')).toHaveFocus();

        await userEvent.tab({ shift: true });
        expect(screen.getByTestId('three')).toHaveFocus();

        await userEvent.tab({ shift: true });
        expect(screen.getByTestId('two')).toHaveFocus();

        await userEvent.tab({ shift: true });
        expect(screen.getByTestId('one')).toHaveFocus();

        await userEvent.tab({ shift: true });
        expect(screen.getByTestId('three')).toHaveFocus();

        await userEvent.tab();
        expect(screen.getByTestId('one')).toHaveFocus();
      });

      test('when false', async () => {
        await render(() => <App modal={false} />);

        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        await userEvent.tab();
        expect(screen.getByTestId('two')).toHaveFocus();

        await userEvent.tab();
        expect(screen.getByTestId('three')).toHaveFocus();

        await userEvent.tab();

        // Wait for the setTimeout that wraps onOpenChange(false).
        await new Promise((resolve) => setTimeout(resolve));
        await flushMicrotasks();

        // Focus leaving the floating element closes it.
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        expect(screen.getByTestId('last')).toHaveFocus();
      });

      test('closeOnFocusOut: false keeps a non-modal element open when focus leaves', async () => {
        await render(() => <App modal={false} closeOnFocusOut={false} />);

        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        expect(screen.getByTestId('floating')).toBeInTheDocument();

        await userEvent.tab();
        expect(screen.getByTestId('two')).toHaveFocus();

        await userEvent.tab();
        expect(screen.getByTestId('three')).toHaveFocus();

        // Move focus out of the floating element entirely.
        await userEvent.tab();

        // Wait for the (potential) setTimeout that wraps onOpenChange(false).
        await new Promise((resolve) => setTimeout(resolve));
        await flushMicrotasks();

        // With `closeOnFocusOut={false}`, focus leaving the floating element does not close it.
        expect(screen.getByTestId('floating')).toBeInTheDocument();
        expect(screen.getByTestId('last')).toHaveFocus();
      });

      test('clicking a nested click trigger does not suppress the next focus-out close', async () => {
        function App() {
          const [open, setOpen] = createSignal(false);
          const { refs, context } = useFloating({
            get open() {
              return open();
            },
            onOpenChange: setOpen,
          });

          return (
            <>
              <button
                data-testid="reference"
                ref={refs.setReference}
                onClick={() => setOpen(true)}
              />
              {open() && (
                <FloatingFocusManager context={context.rootStore} modal={false}>
                  <div role="dialog" ref={refs.setFloating} data-testid="floating">
                    <button data-base-ui-click-trigger="" data-testid="nested-trigger" />
                  </div>
                </FloatingFocusManager>
              )}
              <button data-testid="last" />
            </>
          );
        }

        await render(() => <App />);

        await userEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        await userEvent.click(screen.getByTestId('nested-trigger'));
        await new Promise((resolve) => setTimeout(resolve));
        await flushMicrotasks();

        await userEvent.tab();
        await new Promise((resolve) => setTimeout(resolve));
        await flushMicrotasks();

        expect(screen.queryByTestId('floating')).not.toBeInTheDocument();
        expect(screen.getByTestId('last')).toHaveFocus();
      });

      test('false - comboboxes do not hide all other nodes', async () => {
        function App() {
          const [open, setOpen] = createSignal(false);
          const { refs, context } = useFloating({
            get open() {
              return open();
            },
            onOpenChange: setOpen,
          });

          return (
            <>
              <input
                role="combobox"
                data-testid="reference"
                ref={refs.setReference}
                onFocus={() => setOpen(true)}
              />
              <button data-testid="btn-1" />
              <button data-testid="btn-2" />
              {open() && (
                <FloatingFocusManager context={context.rootStore} modal={false}>
                  <div role="listbox" ref={refs.setFloating} data-testid="floating" />
                </FloatingFocusManager>
              )}
            </>
          );
        }

        await render(() => <App />);

        fireEvent.focus(screen.getByTestId('reference'));
        await flushMicrotasks();

        expect(screen.getByTestId('reference')).not.toHaveAttribute('inert');
        expect(screen.getByTestId('floating')).not.toHaveAttribute('inert');
        expect(screen.getByTestId('btn-1')).not.toHaveAttribute('inert');
        expect(screen.getByTestId('btn-2')).not.toHaveAttribute('inert');
      });

      test('fallback to floating element when it has no tabbable content', async () => {
        function App() {
          const { refs, context } = useFloating({ open: true });
          return (
            <>
              <button data-testid="reference" ref={refs.setReference} />
              <FloatingFocusManager context={context.rootStore} modal>
                <div ref={refs.setFloating} data-testid="floating" tabindex={-1} />
              </FloatingFocusManager>
            </>
          );
        }

        await render(() => <App />);
        await flushMicrotasks();

        await waitFor(() => {
          expect(screen.getByTestId('floating')).toHaveFocus();
        });
        await userEvent.tab();
        expect(screen.getByTestId('floating')).toHaveFocus();
        await userEvent.tab({ shift: true });
        expect(screen.getByTestId('floating')).toHaveFocus();
      });

      test('mixed modality and nesting', async () => {
        interface Props {
          open?: boolean;
          modal?: boolean;
          render: (props: { close: () => void }) => JSX.Element;
          // Port note: Solid can't clone the reference element, so `children` is a function
          // that receives the reference props to spread on it.
          children?: (referenceProps: Record<string, unknown>) => JSX.Element;
          sideChildren?: JSX.Element;
        }

        const Dialog = (props: Props) => {
          const [internalOpen, setOpen] = createSignal(false);
          const nodeId = useFloatingNodeId();
          const open = () => (props.open !== undefined ? props.open : internalOpen());

          const { refs, context } = useFloating({
            get open() {
              return open();
            },
            onOpenChange: setOpen,
            nodeId,
          });

          const { getReferenceProps, getFloatingProps } = useTestInteractions([
            useClick(context.rootStore),
            useDismiss(context.rootStore, { bubbles: false }),
          ]);

          return (
            <FloatingNode id={nodeId}>
              {props.children && props.children(getReferenceProps({ ref: refs.setReference }))}
              <FloatingPortal>
                {open() && (
                  <FloatingFocusManager context={context.rootStore} modal={props.modal ?? true}>
                    <div {...getFloatingProps({ ref: refs.setFloating })}>
                      {props.render({
                        close: () => setOpen(false),
                      })}
                    </div>
                  </FloatingFocusManager>
                )}
              </FloatingPortal>
              {props.sideChildren}
            </FloatingNode>
          );
        };

        const NestedDialog = (props: Props) => {
          const parentId = useFloatingParentNodeId();

          if (parentId == null) {
            // The parent node can't change, so the branch is decided once, like upstream.
            // eslint-disable-next-line solid/components-return-once
            return (
              <FloatingTree>
                <Dialog {...props} />
              </FloatingTree>
            );
          }

          return <Dialog {...props} />;
        };

        const App = () => {
          const [sideDialogOpen, setSideDialogOpen] = createSignal(false);
          return (
            <NestedDialog
              modal={false}
              render={({ close }) => (
                <>
                  <button onClick={close} data-testid="close-dialog" />
                  <button
                    onClick={() => setSideDialogOpen(true)}
                    data-testid="open-nested-dialog"
                  />
                </>
              )}
              sideChildren={
                <NestedDialog
                  modal
                  open={sideDialogOpen()}
                  render={({ close }) => (
                    <button onClick={close} data-testid="close-nested-dialog" />
                  )}
                />
              }
            >
              {(referenceProps) => <button data-testid="open-dialog" {...referenceProps} />}
            </NestedDialog>
          );
        };

        await render(() => <App />);

        await userEvent.click(screen.getByTestId('open-dialog'));
        await userEvent.click(screen.getByTestId('open-nested-dialog'));

        expect(screen.getByTestId('close-dialog')).toBeInTheDocument();
        expect(screen.getByTestId('close-nested-dialog')).toBeInTheDocument();
      });

      test('true - applies aria-hidden to outside nodes', async () => {
        function App() {
          const [isOpen, setIsOpen] = createSignal(false);
          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          return (
            <>
              <input
                data-testid="reference"
                ref={refs.setReference}
                onClick={() => setIsOpen((v) => !v)}
              />
              <div data-testid="outside-wrapper">
                <div data-testid="aria-live" aria-live="polite" />
                <button data-testid="btn-1" />
                <button data-testid="btn-2" />
              </div>
              {isOpen() && (
                <FloatingFocusManager context={context.rootStore}>
                  <div ref={refs.setFloating} data-testid="floating" />
                </FloatingFocusManager>
              )}
            </>
          );
        }

        await render(() => <App />);

        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        expect(screen.getByTestId('reference')).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByTestId('floating')).not.toHaveAttribute('aria-hidden');
        expect(screen.getByTestId('aria-live')).not.toHaveAttribute('aria-hidden');
        expect(screen.getByTestId('btn-1')).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByTestId('btn-2')).toHaveAttribute('aria-hidden', 'true');

        fireEvent.click(screen.getByTestId('reference'));
        flush();

        expect(screen.getByTestId('reference')).not.toHaveAttribute('aria-hidden');
        expect(screen.getByTestId('aria-live')).not.toHaveAttribute('aria-hidden');
        expect(screen.getByTestId('btn-1')).not.toHaveAttribute('aria-hidden');
        expect(screen.getByTestId('btn-2')).not.toHaveAttribute('aria-hidden');
      });

      test('true - keeps supplied inside elements outside the floating node exposed to assistive tech', async () => {
        function App() {
          const [isOpen, setIsOpen] = createSignal(false);
          let dismissRef: HTMLButtonElement | null = null;
          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          return (
            <>
              <input
                data-testid="reference"
                ref={refs.setReference}
                onClick={() => setIsOpen((v) => !v)}
              />
              <div data-testid="outside-wrapper">
                <button data-testid="outside-button" />
              </div>
              {isOpen() && (
                <FloatingFocusManager
                  context={context.rootStore}
                  getInsideElements={() => [dismissRef]}
                >
                  <>
                    <div ref={refs.setFloating} data-testid="floating" />
                    <button
                      ref={(element) => {
                        dismissRef = element;
                      }}
                      data-testid="dismiss"
                    />
                  </>
                </FloatingFocusManager>
              )}
            </>
          );
        }

        await render(() => <App />);

        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        expect(screen.getByTestId('floating')).not.toHaveAttribute('aria-hidden');
        expect(screen.getByTestId('dismiss')).not.toHaveAttribute('aria-hidden');
        expect(screen.getByTestId('outside-wrapper')).toHaveAttribute('aria-hidden', 'true');
      });

      test('false - does not apply inert to outside nodes', async () => {
        function App() {
          const [isOpen, setIsOpen] = createSignal(false);
          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          return (
            <>
              <input
                data-testid="reference"
                ref={refs.setReference}
                onClick={() => setIsOpen((v) => !v)}
              />
              <div data-testid="outside-wrapper">
                <div data-testid="aria-live" aria-live="polite" />
                <button data-testid="btn-1" />
                <button data-testid="btn-2" />
              </div>
              {isOpen() && (
                <FloatingFocusManager context={context.rootStore} modal={false}>
                  <div role="listbox" ref={refs.setFloating} data-testid="floating" />
                </FloatingFocusManager>
              )}
            </>
          );
        }

        await render(() => <App />);

        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        expect(screen.getByTestId('floating')).not.toHaveAttribute('inert');
        expect(screen.getByTestId('aria-live')).not.toHaveAttribute('inert');
        expect(screen.getByTestId('btn-1')).not.toHaveAttribute('inert');
        expect(screen.getByTestId('btn-2')).not.toHaveAttribute('inert');
        expect(screen.getByTestId('reference')).toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('outside-wrapper')).toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('btn-1')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('btn-2')).not.toHaveAttribute('data-base-ui-inert');

        fireEvent.click(screen.getByTestId('reference'));
        flush();

        expect(screen.getByTestId('reference')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('outside-wrapper')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('btn-1')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('btn-2')).not.toHaveAttribute('data-base-ui-inert');
      });

      test('false - keeps marker on top-level outside ancestor when reference has siblings', async () => {
        function App() {
          const [isOpen, setIsOpen] = createSignal(false);
          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          return (
            <>
              <div data-testid="outside-wrapper">
                <input
                  data-testid="reference"
                  ref={refs.setReference}
                  onClick={() => setIsOpen((v) => !v)}
                />
                <button data-testid="btn-1" />
                <button data-testid="btn-2" />
                <div data-testid="nested-wrapper">
                  <button data-testid="nested-btn" />
                </div>
              </div>
              <div data-testid="outside-sibling" />
              {isOpen() && (
                <FloatingFocusManager context={context.rootStore} modal={false}>
                  <div role="listbox" ref={refs.setFloating} data-testid="floating" />
                </FloatingFocusManager>
              )}
            </>
          );
        }

        await render(() => <App />);

        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        expect(screen.getByTestId('floating')).not.toHaveAttribute('inert');
        expect(screen.getByTestId('outside-wrapper')).toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('outside-sibling')).toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('reference')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('btn-1')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('btn-2')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('nested-wrapper')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('nested-btn')).not.toHaveAttribute('data-base-ui-inert');

        fireEvent.click(screen.getByTestId('reference'));
        flush();

        expect(screen.getByTestId('outside-wrapper')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('outside-sibling')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('reference')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('btn-1')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('btn-2')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('nested-wrapper')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('nested-btn')).not.toHaveAttribute('data-base-ui-inert');
      });
    });

    describe('prop: disabled', () => {
      test('true -> false', async () => {
        function App() {
          const [isOpen, setIsOpen] = createSignal(false);
          const [disabled, setDisabled] = createSignal(true);

          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          return (
            <>
              <button
                data-testid="reference"
                ref={refs.setReference}
                onClick={() => setIsOpen((v) => !v)}
              />
              <button data-testid="toggle" onClick={() => setDisabled((v) => !v)} />
              {isOpen() && (
                <FloatingFocusManager context={context.rootStore} disabled={disabled()}>
                  <div ref={refs.setFloating} data-testid="floating" role="dialog" />
                </FloatingFocusManager>
              )}
            </>
          );
        }

        await render(() => <App />);

        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();
        expect(screen.getByTestId('floating')).not.toHaveFocus();
        fireEvent.click(screen.getByTestId('toggle'));
        await flushMicrotasks();
        await waitFor(() => {
          expect(screen.getByTestId('floating')).toHaveFocus();
        });
      });

      test('when false', async () => {
        function App() {
          const [isOpen, setIsOpen] = createSignal(false);
          const [disabled, setDisabled] = createSignal(false);

          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          const click = useClick(context.rootStore);

          const { getReferenceProps, getFloatingProps } = useTestInteractions([click]);

          return (
            <>
              <button data-testid="reference" ref={refs.setReference} {...getReferenceProps()} />
              <button data-testid="toggle" onClick={() => setDisabled((v) => !v)} />
              {isOpen() && (
                <FloatingFocusManager context={context.rootStore} disabled={disabled()}>
                  <div ref={refs.setFloating} data-testid="floating" {...getFloatingProps()} />
                </FloatingFocusManager>
              )}
            </>
          );
        }

        await render(() => <App />);

        fireEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();
        expect(screen.getByTestId('floating')).toHaveFocus();
      });

      test('supports keepMounted behavior', async () => {
        function App() {
          const [isOpen, setIsOpen] = createSignal(false);

          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          const click = useClick(context.rootStore);
          const dismiss = useDismiss(context.rootStore);

          const { getReferenceProps, getFloatingProps } = useTestInteractions([click, dismiss]);

          return (
            <>
              <button data-testid="reference" ref={refs.setReference} {...getReferenceProps()} />
              <FloatingFocusManager context={context.rootStore} disabled={!isOpen()} modal={false}>
                <div ref={refs.setFloating} data-testid="floating" {...getFloatingProps()}>
                  <button data-testid="child" />
                </div>
              </FloatingFocusManager>
              <button data-testid="after" />
            </>
          );
        }

        await render(() => <App />);

        await flushMicrotasks();

        expect(screen.getByTestId('floating')).not.toHaveFocus();

        fireEvent.click(screen.getByTestId('reference'));

        await flushMicrotasks();

        await waitFor(() => {
          expect(screen.getByTestId('child')).toHaveFocus();
        });

        await userEvent.tab();

        expect(screen.getByTestId('after')).toHaveFocus();

        await userEvent.tab({ shift: true });

        fireEvent.click(screen.getByTestId('reference'));
        flush();

        expect(screen.getByTestId('child')).toHaveFocus();

        await userEvent.keyboard('{Escape}');

        expect(screen.getByTestId('reference')).toHaveFocus();
      });

      test('treats a returnFocus resolver returning true as explicit', async () => {
        function App() {
          const [isOpen, setIsOpen] = createSignal(false);
          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          return (
            <>
              <button
                data-testid="reference"
                ref={refs.setReference}
                onClick={() => setIsOpen(true)}
              />
              <button data-testid="close" onClick={() => setIsOpen(false)} />
              {isOpen() && (
                <FloatingFocusManager context={context.rootStore} returnFocus={() => true}>
                  <div ref={refs.setFloating}>
                    <button data-testid="child" />
                  </div>
                </FloatingFocusManager>
              )}
            </>
          );
        }

        await render(() => <App />);

        await userEvent.click(screen.getByTestId('reference'));
        await waitFor(() => {
          expect(screen.getByTestId('child')).toHaveFocus();
        });

        await userEvent.click(screen.getByTestId('close'));

        await waitFor(() => {
          expect(screen.getByTestId('reference')).toHaveFocus();
        });
      });

      test('uses the latest explicitReturnFocus value without moving focus while open', async () => {
        function App(props: { explicitReturnFocus: boolean }) {
          const [isOpen, setIsOpen] = createSignal(false);
          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          return (
            <>
              <button
                data-testid="reference"
                ref={refs.setReference}
                onClick={() => setIsOpen(true)}
              />
              <button data-testid="close" onClick={() => setIsOpen(false)} />
              {isOpen() && (
                <FloatingFocusManager
                  context={context.rootStore}
                  explicitReturnFocus={props.explicitReturnFocus}
                  modal={false}
                >
                  <div ref={refs.setFloating}>
                    <button data-testid="child" />
                  </div>
                </FloatingFocusManager>
              )}
            </>
          );
        }

        const [explicitReturnFocus, setExplicitReturnFocus] = createSignal(true);
        await render(() => <App explicitReturnFocus={explicitReturnFocus()} />);

        await userEvent.click(screen.getByTestId('reference'));
        await waitFor(() => {
          expect(screen.getByTestId('child')).toHaveFocus();
        });

        setExplicitReturnFocus(false);
        flush();
        expect(screen.getByTestId('child')).toHaveFocus();

        const close = screen.getByTestId('close');
        await userEvent.click(close);
        expect(close).toHaveFocus();
      });

      test('resets close modality between keep-mounted open sessions', async () => {
        const finalFocus = vi.fn((_closeType: InteractionType) => true);

        function App() {
          const [isOpen, setIsOpen] = createSignal(false);

          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          const click = useClick(context.rootStore);
          const dismiss = useDismiss(context.rootStore);
          const { getReferenceProps, getFloatingProps } = useTestInteractions([click, dismiss]);

          return (
            <>
              <button data-testid="reference" ref={refs.setReference} {...getReferenceProps()} />
              <button data-testid="controlled-open" onClick={() => setIsOpen(true)} />
              <button data-testid="controlled-close" onClick={() => setIsOpen(false)} />
              <FloatingPortal>
                <FloatingFocusManager
                  context={context.rootStore}
                  disabled={!isOpen()}
                  returnFocus={finalFocus}
                >
                  <div ref={refs.setFloating} {...getFloatingProps()}>
                    <button data-testid="child" />
                  </div>
                </FloatingFocusManager>
              </FloatingPortal>
            </>
          );
        }

        await render(() => <App />);

        const reference = screen.getByTestId('reference');
        const focusSpy = vi.spyOn(reference, 'focus');

        try {
          await userEvent.click(reference);
          await waitFor(() => {
            expect(screen.getByTestId('child')).toHaveFocus();
          });

          await userEvent.keyboard('{Escape}');
          await waitFor(() => {
            expect(focusSpy).toHaveBeenCalledWith({
              preventScroll: true,
              focusVisible: true,
            });
          });
          expect(finalFocus).toHaveBeenLastCalledWith('keyboard');

          focusSpy.mockClear();

          await userEvent.click(reference);
          await waitFor(() => {
            expect(screen.getByTestId('child')).toHaveFocus();
          });

          fireEvent.click(screen.getByTestId('controlled-close'));

          await waitFor(() => {
            expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
          });
          expect(focusSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({ focusVisible: true }),
          );
          expect(finalFocus).toHaveBeenLastCalledWith('');

          focusSpy.mockClear();
          finalFocus.mockClear();

          fireEvent.click(screen.getByTestId('controlled-open'));
          await waitFor(() => {
            expect(screen.getByTestId('child')).toHaveFocus();
          });

          fireEvent.pointerDown(reference, { pointerType: 'mouse' });
          fireEvent.click(screen.getByTestId('controlled-close'));

          await waitFor(() => {
            expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
          });
          expect(focusSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({ focusVisible: true }),
          );
          expect(finalFocus).toHaveBeenCalledWith('');

          focusSpy.mockClear();
          finalFocus.mockClear();

          fireEvent.click(screen.getByTestId('controlled-open'));
          await waitFor(() => {
            expect(screen.getByTestId('child')).toHaveFocus();
          });

          fireEvent.click(reference, { detail: 0 });

          await waitFor(() => {
            expect(focusSpy).toHaveBeenCalledWith({
              preventScroll: true,
              focusVisible: true,
            });
          });
          expect(finalFocus).toHaveBeenCalledWith('keyboard');
        } finally {
          focusSpy.mockRestore();
        }
      });

      test.each<{
        name: string;
        pointerType: string | null;
        detail: number;
        expected: InteractionType;
      }>([
        {
          name: 'zero detail after a mouse pointerdown',
          pointerType: 'mouse',
          detail: 0,
          expected: 'keyboard',
        },
        {
          name: 'nonzero detail after a touch pointerdown',
          pointerType: 'touch',
          detail: 1,
          expected: 'touch',
        },
        {
          name: 'nonzero detail after a pen pointerdown',
          pointerType: 'pen',
          detail: 1,
          expected: 'pen',
        },
        {
          name: 'nonzero detail without a pointerdown',
          pointerType: null,
          detail: 1,
          expected: 'mouse',
        },
      ])(
        'classifies a click with an empty pointerType: $name',
        async ({ pointerType, detail, expected }) => {
          const finalFocus = vi.fn((_closeType: InteractionType) => true);

          function App() {
            const [isOpen, setIsOpen] = createSignal(true);

            const { refs, context } = useFloating({
              get open() {
                return isOpen();
              },
              onOpenChange: setIsOpen,
            });

            const click = useClick(context.rootStore);
            const { getReferenceProps, getFloatingProps } = useTestInteractions([click]);

            return (
              <>
                <button data-testid="reference" ref={refs.setReference} {...getReferenceProps()} />
                <FloatingPortal>
                  {isOpen() && (
                    <FloatingFocusManager context={context.rootStore} returnFocus={finalFocus}>
                      <div ref={refs.setFloating} {...getFloatingProps()}>
                        <button data-testid="child" />
                      </div>
                    </FloatingFocusManager>
                  )}
                </FloatingPortal>
              </>
            );
          }

          await render(() => <App />);

          const reference = screen.getByTestId('reference');

          if (pointerType) {
            fireEvent.pointerDown(reference, { pointerType });
          }
          // Synthesized click shape: `PointerEvent` with an empty `pointerType`.
          fireEvent(
            reference,
            new PointerEvent('click', { bubbles: true, cancelable: true, detail, pointerType: '' }),
          );

          await waitFor(() => {
            expect(finalFocus).toHaveBeenCalledWith(expected);
          });
        },
      );

      test('preserves keyboard close modality when reopening before focus restoration', async () => {
        function App() {
          const [isOpen, setIsOpen] = createSignal(false);
          const [reopenOnClose, setReopenOnClose] = createSignal(false);

          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          const click = useClick(context.rootStore);
          const dismiss = useDismiss(context.rootStore);
          const { getReferenceProps, getFloatingProps } = useTestInteractions([click, dismiss]);

          useIsoLayoutEffect(
            ([isOpenValue, reopenOnCloseValue]) => {
              if (!isOpenValue && reopenOnCloseValue) {
                setReopenOnClose(false);
                setIsOpen(true);
              }
            },
            () => [isOpen(), reopenOnClose()],
          );

          return (
            <>
              <span data-testid="open-state">{String(isOpen())}</span>
              <button data-testid="reference" ref={refs.setReference} {...getReferenceProps()} />
              <button data-testid="reopen-on-close" onClick={() => setReopenOnClose(true)} />
              <FloatingPortal>
                <FloatingFocusManager context={context.rootStore} disabled={!isOpen()}>
                  <div ref={refs.setFloating} {...getFloatingProps()}>
                    <button data-testid="child" />
                  </div>
                </FloatingFocusManager>
              </FloatingPortal>
            </>
          );
        }

        await render(() => <App />);

        const reference = screen.getByTestId('reference');
        const focusSpy = vi.spyOn(reference, 'focus');

        try {
          await userEvent.click(reference);
          await waitFor(() => {
            expect(screen.getByTestId('child')).toHaveFocus();
          });

          fireEvent.click(screen.getByTestId('reopen-on-close'));
          await userEvent.keyboard('{Escape}');

          await waitFor(() => {
            expect(focusSpy).toHaveBeenCalledWith({
              preventScroll: true,
              focusVisible: true,
            });
          });
          expect(screen.getByTestId('open-state')).toHaveTextContent('true');
        } finally {
          focusSpy.mockRestore();
        }
      });

      test('clears outside pointer state between keep-mounted open sessions', async () => {
        let readInsideReactTree = () => false;

        function App() {
          const [isOpen, setIsOpen] = createSignal(false);

          const { refs, context } = useFloating({
            get open() {
              return isOpen();
            },
            onOpenChange: setIsOpen,
          });

          readInsideReactTree = () => context.dataRef.current.insideReactTree;

          const click = useClick(context.rootStore);
          const dismiss = useDismiss(context.rootStore);

          const { getReferenceProps, getFloatingProps } = useTestInteractions([click, dismiss]);

          return (
            <>
              <span data-testid="open-state">{String(isOpen())}</span>
              <button data-testid="before" />
              <button data-testid="reference" ref={refs.setReference} {...getReferenceProps()} />
              <FloatingPortal>
                <FloatingFocusManager
                  context={context.rootStore}
                  disabled={!isOpen()}
                  modal={false}
                >
                  <div ref={refs.setFloating} data-testid="floating" {...getFloatingProps()}>
                    <button data-testid="child" />
                  </div>
                </FloatingFocusManager>
              </FloatingPortal>
              <button data-testid="after" />
            </>
          );
        }

        await render(() => <App />);

        await userEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        await waitFor(() => {
          expect(screen.getByTestId('child')).toHaveFocus();
        });

        fireEvent.pointerDown(screen.getByTestId('after'));
        await flushMicrotasks();

        expect(screen.getByTestId('open-state')).toHaveTextContent('false');

        await userEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        await waitFor(() => {
          expect(screen.getByTestId('child')).toHaveFocus();
        });

        fireEvent.focusOut(screen.getByTestId('child'), {
          relatedTarget: screen.getByTestId('after'),
        });

        expect(readInsideReactTree()).toBe(true);
      });
    });

    describe('non-modal + FloatingPortal', () => {
      test('focuses inside element, tabbing out focuses last document element', async () => {
        function App() {
          const [open, setOpen] = createSignal(false);
          const { refs, context } = useFloating({
            get open() {
              return open();
            },
            onOpenChange: setOpen,
          });

          return (
            <>
              <span tabindex={0} data-testid="first" />
              <button
                data-testid="reference"
                ref={refs.setReference}
                onClick={() => setOpen(true)}
              />
              <FloatingPortal>
                {open() && (
                  <FloatingFocusManager context={context.rootStore} modal={false}>
                    <div data-testid="floating" ref={refs.setFloating}>
                      <span tabindex={0} data-testid="inside" />
                    </div>
                  </FloatingFocusManager>
                )}
              </FloatingPortal>
              <span tabindex={0} data-testid="last" />
            </>
          );
        }

        await render(() => <App />);

        await userEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        expect(screen.getByTestId('inside')).toHaveFocus();

        await userEvent.tab();

        expect(screen.queryByTestId('floating')).not.toBeInTheDocument();
        expect(screen.getByTestId('last')).toHaveFocus();
      });

      test('does not mark reference siblings due to outside focus guards', async () => {
        function App() {
          const [open, setOpen] = createSignal(false);
          const { refs, context } = useFloating({
            get open() {
              return open();
            },
            onOpenChange: setOpen,
          });

          return (
            <>
              <div data-testid="reference-wrapper">
                <button
                  data-testid="reference"
                  ref={refs.setReference}
                  onClick={() => setOpen(true)}
                />
                <span data-testid="reference-sibling-1" />
                <span data-testid="reference-sibling-2" />
              </div>
              <FloatingPortal>
                {open() && (
                  <FloatingFocusManager context={context.rootStore} modal={false}>
                    <div data-testid="floating" ref={refs.setFloating}>
                      <span tabindex={0} data-testid="inside" />
                    </div>
                  </FloatingFocusManager>
                )}
              </FloatingPortal>
            </>
          );
        }

        await render(() => <App />);

        await userEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        expect(screen.getByTestId('floating')).toBeInTheDocument();
        expect(screen.getByTestId('reference')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('reference-sibling-1')).not.toHaveAttribute('data-base-ui-inert');
        expect(screen.getByTestId('reference-sibling-2')).not.toHaveAttribute('data-base-ui-inert');
      });

      test('renders the aria-owns owner without changing regular reference semantics', async () => {
        function App() {
          const [open, setOpen] = createSignal(false);
          const { refs, context } = useFloating({
            get open() {
              return open();
            },
            onOpenChange: setOpen,
          });

          return (
            <>
              <button
                data-testid="reference"
                ref={refs.setReference}
                onClick={() => setOpen(true)}
              />
              <FloatingPortal>
                {open() && (
                  <FloatingFocusManager context={context.rootStore} modal={false}>
                    <div data-testid="floating" ref={refs.setFloating}>
                      <span tabindex={0} data-testid="inside" />
                    </div>
                  </FloatingFocusManager>
                )}
              </FloatingPortal>
            </>
          );
        }

        await render(() => <App />);

        await userEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        const reference = screen.getByTestId('reference');
        const portalNode = screen.getByTestId('floating').closest('[data-base-ui-portal]');
        const portalNodeId = portalNode?.id ?? '';
        const owner = portalNode?.ownerDocument.querySelector('span[aria-owns]');

        expect(portalNodeId).not.toBe('');
        expect(owner).not.toHaveAttribute('role');
        expect(owner).toHaveAttribute('aria-owns', portalNodeId);
        expect(reference).not.toHaveAttribute('aria-owns');
      });

      test('supports setting the aria-owns owner role explicitly', async () => {
        function App() {
          const [open, setOpen] = createSignal(false);
          const { refs, context } = useFloating({
            get open() {
              return open();
            },
            onOpenChange: setOpen,
          });

          return (
            <>
              <button
                data-testid="reference"
                ref={refs.setReference}
                onClick={() => setOpen(true)}
              />
              <FloatingPortal portalOwnerRole="group">
                {open() && (
                  <FloatingFocusManager context={context.rootStore} modal={false}>
                    <div data-testid="floating" ref={refs.setFloating}>
                      <span tabindex={0} data-testid="inside" />
                    </div>
                  </FloatingFocusManager>
                )}
              </FloatingPortal>
            </>
          );
        }

        await render(() => <App />);

        await userEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        const portalNode = screen.getByTestId('floating').closest('[data-base-ui-portal]');
        const owner = portalNode?.ownerDocument.querySelector('span[aria-owns]');

        expect(portalNode).not.toBe(null);
        expect(owner).toHaveAttribute('role', 'group');
      });

      test('shift+tab', async () => {
        function App() {
          const [open, setOpen] = createSignal(false);
          const { refs, context } = useFloating({
            get open() {
              return open();
            },
            onOpenChange: setOpen,
          });

          return (
            <>
              <span tabindex={0} data-testid="first" />
              <button
                data-testid="reference"
                ref={refs.setReference}
                onClick={() => setOpen(true)}
              />
              <FloatingPortal>
                {open() && (
                  <FloatingFocusManager context={context.rootStore} modal={false}>
                    <div data-testid="floating" ref={refs.setFloating}>
                      <span tabindex={0} data-testid="inside" />
                    </div>
                  </FloatingFocusManager>
                )}
              </FloatingPortal>
              <span tabindex={0} data-testid="last" />
            </>
          );
        }

        await render(() => <App />);

        await userEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        await userEvent.tab({ shift: true });

        expect(screen.getByTestId('floating')).toBeInTheDocument();

        await userEvent.tab({ shift: true });

        expect(screen.queryByTestId('floating')).not.toBeInTheDocument();
      });
    });

    describe('Navigation', () => {
      test('does not focus reference when hovering it', async () => {
        await render(() => <Navigation />);
        await userEvent.hover(screen.getByText('Product'));
        await userEvent.unhover(screen.getByText('Product'));
        expect(screen.getByText('Product')).not.toHaveFocus();
      });

      test('returns focus to reference when floating element was opened by hover but is closed by esc key', async () => {
        await render(() => <Navigation />);
        await userEvent.hover(screen.getByText('Product'));
        await flushMicrotasks();
        await userEvent.keyboard('{Escape}');
        expect(screen.getByText('Product')).toHaveFocus();
      });

      test('returns focus to reference when floating element was opened by hover but is closed by an explicit close button', async () => {
        await render(() => <Navigation />);
        await userEvent.hover(screen.getByText('Product'));
        await flushMicrotasks();
        await userEvent.click(screen.getByText('Close').parentElement!);
        await userEvent.keyboard('{Tab}');
        expect(screen.getByText('Close')).toHaveFocus();
        await userEvent.keyboard('{Enter}');
        expect(screen.getByText('Product')).toHaveFocus();
      });

      test('does not re-open after closing via escape key', async () => {
        await render(() => <Navigation />);
        await userEvent.hover(screen.getByText('Product'));
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByText('Link 1')).not.toBeInTheDocument();
      });

      test('closes when unhovering floating element even when focus is inside it', async () => {
        await render(() => <Navigation />);
        await userEvent.hover(screen.getByText('Product'));
        await userEvent.click(screen.getByTestId('subnavigation'));
        await userEvent.unhover(screen.getByTestId('subnavigation'));
        await userEvent.hover(screen.getByText('Product'));
        await userEvent.unhover(screen.getByText('Product'));
        expect(screen.queryByTestId('subnavigation')).not.toBeInTheDocument();
      });
    });
  });

  describe('prop: restoreFocus', () => {
    function App(props: { restoreFocus?: boolean }) {
      const [isOpen, setIsOpen] = createSignal(false);
      const [removed, setRemoved] = createSignal(false);
      const twoRef: RefObject<HTMLButtonElement | null> = { current: null };

      const { refs, context } = useFloating({
        get open() {
          return isOpen();
        },
        onOpenChange: setIsOpen,
      });

      const click = useClick(context.rootStore);
      const { getReferenceProps, getFloatingProps } = useTestInteractions([click]);

      return (
        <>
          <button onClick={() => setRemoved(true)}>remove</button>
          <button ref={refs.setReference} {...getReferenceProps()} data-testid="reference" />
          {isOpen() && (
            <FloatingFocusManager
              context={context.rootStore}
              restoreFocus={props.restoreFocus ?? true}
              initialFocus={twoRef}
            >
              <div ref={refs.setFloating} {...getFloatingProps()} data-testid="floating">
                <button>one</button>
                {!removed() && (
                  <button
                    ref={(element) => {
                      twoRef.current = element;
                    }}
                  >
                    two
                  </button>
                )}
                <button>three</button>
              </div>
            </FloatingFocusManager>
          )}
        </>
      );
    }

    test.skipIf(isJSDOM)(
      'true: restores focus to nearest tabbable element if currently focused element is removed',
      async () => {
        await render(() => <App />);

        await userEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        const two = screen.getByRole('button', { name: 'two' });
        const three = screen.getByRole('button', { name: 'three' });
        const remove = screen.getByText('remove');

        expect(two).toHaveFocus();

        fireEvent.click(remove);

        await waitFor(() => {
          expect(three).toHaveFocus();
        });
      },
    );

    test.skipIf(isJSDOM)(
      'false: does not restore focus to nearest tabbable element if currently focused element is removed',
      async () => {
        await render(() => <App restoreFocus={false} />);

        await userEvent.click(screen.getByTestId('reference'));
        await flushMicrotasks();

        const two = screen.getByRole('button', { name: 'two' });
        const remove = screen.getByText('remove');

        expect(two).toHaveFocus();

        fireEvent.click(remove);
        await flushMicrotasks();

        await waitFor(() => {
          expect(document.body).toHaveFocus();
        });
      },
    );

    test('restores focus to the nearest tabbable element when the focused element becomes hidden', async () => {
      await render(() => <App />);

      await userEvent.click(screen.getByTestId('reference'));
      await flushMicrotasks();

      const two = screen.getByRole('button', { name: 'two' });
      const three = screen.getByRole('button', { name: 'three' });

      expect(two).toHaveFocus();

      document.body.tabIndex = -1;
      two.style.visibility = 'hidden';
      document.body.focus();

      await waitFor(() => {
        expect(three).toHaveFocus();
      });
    });
  });

  describe.skipIf(!isJSDOM)('JSDOM-only combobox and focus return coverage', () => {
    test('trapped combobox prevents focus moving outside floating element', async () => {
      function App() {
        const [isOpen, setIsOpen] = createSignal(false);

        const floating = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });
        const { refs, context } = floating;

        const role = {
          reference: {
            // Port note: Solid's `aria-*` types take strings (React stringifies booleans).
            get 'aria-expanded'() {
              return isOpen() ? 'true' : 'false';
            },
            get 'aria-controls'() {
              return isOpen() ? 'floating' : undefined;
            },
          },
          floating: {
            id: 'floating',
            role: 'listbox' as const,
          },
        };
        const dismiss = useDismiss(context.rootStore);
        const click = useClick(context.rootStore);

        const { getReferenceProps, getFloatingProps } = useTestInteractions([role, dismiss, click]);

        return (
          <div class="App">
            <input
              ref={refs.setReference}
              {...getReferenceProps()}
              data-testid="input"
              role="combobox"
            />
            {isOpen() && (
              <FloatingFocusManager context={context.rootStore}>
                <div ref={refs.setFloating} style={floating.floatingStyles} {...getFloatingProps()}>
                  <button>one</button>
                  <button>two</button>
                </div>
              </FloatingFocusManager>
            )}
          </div>
        );
      }

      await render(() => <App />);
      await userEvent.click(screen.getByTestId('input'));
      await flushMicrotasks();
      expect(screen.getByTestId('input')).not.toHaveFocus();
      expect(screen.getByRole('button', { name: 'one' })).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByRole('button', { name: 'two' })).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByRole('button', { name: 'one' })).toHaveFocus();
      await flushMicrotasks();
    });

    test('untrapped combobox creates non-modal focus management', async () => {
      function App() {
        const [isOpen, setIsOpen] = createSignal(false);

        const floating = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });
        const { refs, context } = floating;

        const role = {
          reference: {
            // Port note: Solid's `aria-*` types take strings (React stringifies booleans).
            get 'aria-expanded'() {
              return isOpen() ? 'true' : 'false';
            },
            get 'aria-controls'() {
              return isOpen() ? 'floating' : undefined;
            },
          },
          floating: {
            id: 'floating',
            role: 'listbox' as const,
          },
        };
        const dismiss = useDismiss(context.rootStore);
        const click = useClick(context.rootStore);

        const { getReferenceProps, getFloatingProps } = useTestInteractions([role, dismiss, click]);

        return (
          <>
            <input
              ref={refs.setReference}
              {...getReferenceProps()}
              data-testid="input"
              role="combobox"
            />
            {isOpen() && (
              <FloatingPortal>
                <FloatingFocusManager
                  context={context.rootStore}
                  initialFocus={false}
                  modal={false}
                >
                  <div
                    ref={refs.setFloating}
                    style={floating.floatingStyles}
                    {...getFloatingProps()}
                  >
                    <button>one</button>
                    <button>two</button>
                  </div>
                </FloatingFocusManager>
              </FloatingPortal>
            )}
            <button>outside</button>
          </>
        );
      }

      await render(() => <App />);
      await userEvent.click(screen.getByTestId('input'));
      await flushMicrotasks();
      expect(screen.getByTestId('input')).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByRole('button', { name: 'one' })).toHaveFocus();
      await userEvent.tab({ shift: true });
      expect(screen.getByTestId('input')).toHaveFocus();
    });

    test('returns focus to last connected element', async () => {
      function Drawer(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
        const { refs, context } = useFloating({
          get open() {
            return props.open;
          },
          onOpenChange: (open) => props.onOpenChange(open),
        });
        const dismiss = useDismiss(context.rootStore);
        const { getFloatingProps } = useTestInteractions([dismiss]);

        return (
          <FloatingFocusManager context={context.rootStore}>
            <div ref={refs.setFloating} {...getFloatingProps()}>
              <button data-testid="child-reference" />
            </div>
          </FloatingFocusManager>
        );
      }

      function Parent() {
        const [isOpen, setIsOpen] = createSignal(false);
        const [isDrawerOpen, setIsDrawerOpen] = createSignal(false);

        const { refs, context } = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });

        const dismiss = useDismiss(context.rootStore);
        const click = useClick(context.rootStore);

        const { getReferenceProps, getFloatingProps } = useTestInteractions([click, dismiss]);

        return (
          <>
            <button
              ref={refs.setReference}
              data-testid="parent-reference"
              {...getReferenceProps()}
            />
            {isOpen() && (
              <FloatingFocusManager context={context.rootStore}>
                <div ref={refs.setFloating} {...getFloatingProps()}>
                  Parent Floating
                  <button
                    data-testid="parent-floating-reference"
                    onClick={() => {
                      setIsDrawerOpen(true);
                      setIsOpen(false);
                    }}
                  />
                </div>
              </FloatingFocusManager>
            )}
            {isDrawerOpen() && <Drawer open={isDrawerOpen()} onOpenChange={setIsDrawerOpen} />}
          </>
        );
      }

      await render(() => <Parent />);
      await userEvent.click(screen.getByTestId('parent-reference'));
      await flushMicrotasks();
      expect(screen.getByTestId('parent-floating-reference')).toHaveFocus();
      await userEvent.click(screen.getByTestId('parent-floating-reference'));
      await flushMicrotasks();
      expect(screen.getByTestId('child-reference')).toHaveFocus();
      await userEvent.keyboard('{Escape}');
      expect(screen.getByTestId('parent-reference')).toHaveFocus();
    });

    test('focus is placed on element with floating props when floating element is a wrapper', async () => {
      function App() {
        const [isOpen, setIsOpen] = createSignal(false);

        const { refs, context } = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });

        const role = {
          reference: {
            'aria-haspopup': 'dialog' as const,
            // Port note: Solid's `aria-*` types take strings (React stringifies booleans).
            get 'aria-expanded'() {
              return isOpen() ? 'true' : 'false';
            },
            get 'aria-controls'() {
              return isOpen() ? 'floating' : undefined;
            },
          },
          floating: {
            id: 'floating',
            role: 'dialog' as const,
          },
        };

        const { getReferenceProps, getFloatingProps } = useTestInteractions([role]);

        return (
          <>
            <button
              ref={refs.setReference}
              {...getReferenceProps({
                onClick: () => setIsOpen((v) => !v),
              })}
            />
            {isOpen() && (
              <FloatingFocusManager context={context.rootStore}>
                <div ref={refs.setFloating} data-testid="outer">
                  <div {...getFloatingProps()} data-testid="inner" />
                </div>
              </FloatingFocusManager>
            )}
          </>
        );
      }

      await render(() => <App />);

      await userEvent.click(screen.getByRole('button'));
      await flushMicrotasks();

      expect(screen.getByTestId('inner')).toHaveFocus();
    });

    test('floating element closes upon tabbing out of modal combobox', async () => {
      function App() {
        const [isOpen, setIsOpen] = createSignal(false);

        const { refs, context } = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });

        const click = useClick(context.rootStore);

        const { getReferenceProps, getFloatingProps } = useTestInteractions([click]);

        return (
          <>
            <input
              ref={refs.setReference}
              {...getReferenceProps()}
              data-testid="input"
              role="combobox"
            />
            {isOpen() && (
              <FloatingFocusManager context={context.rootStore} initialFocus={false}>
                <div ref={refs.setFloating} {...getFloatingProps()} data-testid="floating">
                  <button tabindex={-1}>one</button>
                </div>
              </FloatingFocusManager>
            )}
            <button data-testid="after" />
          </>
        );
      }

      await render(() => <App />);
      await userEvent.click(screen.getByTestId('input'));
      await flushMicrotasks();
      expect(screen.getByTestId('input')).toHaveFocus();
      await userEvent.tab();
      await flushMicrotasks();
      expect(screen.getByTestId('after')).toHaveFocus();
    });

    test('untrapped typeable combobox closes on second tab sequence (click -> tab -> click -> tab)', async () => {
      function App() {
        const [isOpen, setIsOpen] = createSignal(false);

        const { refs, context } = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });

        const click = useClick(context.rootStore);
        const { getReferenceProps, getFloatingProps } = useTestInteractions([click]);

        return (
          <>
            <input
              ref={refs.setReference}
              {...getReferenceProps()}
              data-testid="input"
              role="combobox"
            />
            {isOpen() && (
              <FloatingFocusManager context={context.rootStore} initialFocus={false} modal>
                <div ref={refs.setFloating} {...getFloatingProps()} data-testid="floating">
                  <button tabindex={-1}>one</button>
                </div>
              </FloatingFocusManager>
            )}
            <button data-testid="after" />
          </>
        );
      }

      await render(() => <App />);

      await userEvent.click(screen.getByTestId('input'));
      await flushMicrotasks();

      expect(screen.getByTestId('input')).toHaveFocus();

      await userEvent.tab();
      await flushMicrotasks();

      expect(screen.getByTestId('after')).toHaveFocus();
      expect(screen.queryByTestId('floating')).not.toBeInTheDocument();

      await userEvent.click(screen.getByTestId('input'));
      await flushMicrotasks();

      expect(screen.getByTestId('input')).toHaveFocus();

      await userEvent.tab();
      await flushMicrotasks();

      expect(screen.getByTestId('after')).toHaveFocus();
      expect(screen.queryByTestId('floating')).not.toBeInTheDocument();
    });

    test('focus does not return to reference when floating element is triggered by hover', async () => {
      function App() {
        const [isOpen, setIsOpen] = createSignal(false);

        const { refs, context } = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });

        const hover = useHover(context);

        const { getReferenceProps, getFloatingProps } = useTestInteractions([hover]);

        return (
          <>
            <button ref={refs.setReference} {...getReferenceProps()} data-testid="reference" />
            {isOpen() && (
              <FloatingFocusManager context={context.rootStore}>
                <div ref={refs.setFloating} {...getFloatingProps()} data-testid="floating" />
              </FloatingFocusManager>
            )}
          </>
        );
      }

      await render(() => <App />);

      const reference = screen.getByTestId('reference');

      reference.focus();
      await flushMicrotasks();

      await userEvent.hover(reference);
      await flushMicrotasks();

      expect(screen.getByTestId('floating')).toHaveFocus();

      await userEvent.unhover(screen.getByTestId('floating'));

      expect(screen.getByTestId('reference')).not.toHaveFocus();
    });

    test('uses aria-hidden instead of inert on outside nodes if opened with hover and modal=true', async () => {
      function App() {
        const [isOpen, setIsOpen] = createSignal(false);

        const { refs, context } = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });

        const hover = useHover(context);

        const { getReferenceProps, getFloatingProps } = useTestInteractions([hover]);

        return (
          <>
            <button ref={refs.setReference} {...getReferenceProps()} data-testid="reference" />
            {isOpen() && (
              <FloatingFocusManager context={context.rootStore}>
                <div ref={refs.setFloating} {...getFloatingProps()} data-testid="floating" />
              </FloatingFocusManager>
            )}
            <button>outside</button>
          </>
        );
      }

      await render(() => <App />);

      await userEvent.hover(screen.getByTestId('reference'));
      await flushMicrotasks();

      expect(screen.getByText('outside')).not.toHaveAttribute('inert');
      expect(screen.getByText('outside')).toHaveAttribute('aria-hidden', 'true');
    });

    test('floating element with no focusable elements and no listbox role gets tabIndex=0 when initialFocus is -1', async () => {
      function App() {
        const [isOpen, setIsOpen] = createSignal(false);

        const { refs, context } = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });

        return (
          <>
            <button
              data-testid="reference"
              ref={refs.setReference}
              onClick={() => setIsOpen(true)}
            />
            {isOpen() && (
              <FloatingFocusManager context={context.rootStore} initialFocus={false} modal={false}>
                <div ref={refs.setFloating} data-testid="floating" role="dialog" />
              </FloatingFocusManager>
            )}
          </>
        );
      }

      await render(() => <App />);

      const reference = screen.getByTestId('reference');
      await userEvent.click(reference);
      await flushMicrotasks();
      fireEvent.focusOut(reference);
      await flushMicrotasks();

      expect(screen.getByTestId('floating')).toHaveAttribute('tabindex', '0');
    });

    test('floating element with managed tabIndex is downgraded once content becomes tabbable', async () => {
      function App(props: { hasTabbableContent?: boolean }) {
        const { refs, context } = useFloating({
          open: true,
          onOpenChange() {},
        });

        return (
          <>
            <button data-testid="reference" ref={refs.setReference} />
            <FloatingFocusManager context={context.rootStore} initialFocus={false} modal={false}>
              <div ref={refs.setFloating} data-testid="floating" role="dialog">
                {props.hasTabbableContent && <button data-testid="inside" />}
              </div>
            </FloatingFocusManager>
          </>
        );
      }

      const [hasTabbableContent, setHasTabbableContent] = createSignal(false);
      await render(() => <App hasTabbableContent={hasTabbableContent()} />);
      await flushMicrotasks();

      const reference = screen.getByTestId('reference');
      reference.focus();

      expect(screen.getByTestId('floating')).toHaveAttribute('tabindex', '0');
      expect(screen.getByTestId('floating')).toHaveAttribute('data-tabindex', '0');

      setHasTabbableContent(true);
      await flushMicrotasks();

      fireEvent.focusOut(reference, { relatedTarget: screen.getByTestId('inside') });
      await flushMicrotasks();

      expect(screen.getByTestId('floating')).toHaveAttribute('tabindex', '-1');
      expect(screen.getByTestId('floating')).toHaveAttribute('data-tabindex', '-1');
    });

    test('floating element with listbox role ignores tabIndex setting', async () => {
      function App() {
        const [isOpen, setIsOpen] = createSignal(false);

        const { refs, context } = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });

        const click = useClick(context.rootStore);
        const { getReferenceProps, getFloatingProps } = useTestInteractions([click]);

        return (
          <>
            <button
              data-testid="reference"
              ref={refs.setReference}
              onClick={() => setIsOpen(true)}
              {...getReferenceProps()}
            >
              ref
            </button>
            {isOpen() && (
              <FloatingFocusManager context={context.rootStore} initialFocus={false} modal={false}>
                <div
                  ref={refs.setFloating}
                  role="listbox"
                  data-testid="floating"
                  {...getFloatingProps()}
                >
                  floating
                </div>
              </FloatingFocusManager>
            )}
          </>
        );
      }

      await render(() => <App />);
      await userEvent.click(screen.getByTestId('reference'));
      await flushMicrotasks();

      expect(screen.getByTestId('floating')).toHaveAttribute('tabindex', '-1');
    });

    test('handles manual tabindex on dialog floating element', async () => {
      function App() {
        const [isOpen, setIsOpen] = createSignal(false);

        const { refs, context } = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });

        return (
          <>
            <button
              data-testid="reference"
              ref={refs.setReference}
              onClick={() => setIsOpen(true)}
            />
            {isOpen() && (
              <FloatingFocusManager context={context.rootStore} modal={false}>
                <div ref={refs.setFloating} data-testid="floating" role="dialog" />
              </FloatingFocusManager>
            )}
          </>
        );
      }

      await render(() => <App />);

      await userEvent.click(screen.getByTestId('reference'));
      await flushMicrotasks();

      expect(screen.getByTestId('floating')).toHaveAttribute('tabindex', '0');
      await userEvent.tab({ shift: true });
      expect(screen.getByTestId('reference')).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByTestId('floating')).toHaveFocus();
    });

    test('standard tabbing back and forth of a non-modal floating element', async () => {
      function App() {
        const [isOpen, setIsOpen] = createSignal(false);

        const { refs, context } = useFloating({
          get open() {
            return isOpen();
          },
          onOpenChange: setIsOpen,
        });

        const click = useClick(context.rootStore);
        const { getReferenceProps, getFloatingProps } = useTestInteractions([click]);

        return (
          <>
            <button data-testid="reference" ref={refs.setReference} {...getReferenceProps()} />
            {isOpen() && (
              <FloatingPortal>
                <FloatingFocusManager context={context.rootStore} modal={false}>
                  <div
                    ref={refs.setFloating}
                    data-testid="floating"
                    role="dialog"
                    {...getFloatingProps()}
                  >
                    <button data-testid="inner">inner</button>
                  </div>
                </FloatingFocusManager>
              </FloatingPortal>
            )}
          </>
        );
      }
      await render(() => <App />);

      await userEvent.click(screen.getByTestId('reference'));
      await flushMicrotasks();

      expect(screen.getByTestId('floating')).toHaveAttribute('tabindex', '-1');
      expect(screen.getByTestId('inner')).toHaveFocus();
      await userEvent.tab({ shift: true });
      expect(screen.getByTestId('reference')).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByTestId('inner')).toHaveFocus();
    });
  });
});
