import { expect, vi, describe, it } from 'vitest';
import { createSignal, Errored } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Toolbar } from 'base-ui-solid/toolbar';
import {
  createRenderer,
  describeConformance,
  fireEvent,
  flushMicrotasks,
  isJSDOM,
  screen,
  waitFor,
  waitSingleFrame,
} from '#test-utils';
import { Popover } from '..';

// Port note: `fireEvent` doesn't flush Solid, so assertions after it are preceded by
// `flushMicrotasks()`; `act(async () => {...})` runs its body and then awaits `flushMicrotasks()`.
// `React.useRef` becomes a `{ current }` object set by a ref callback.

describe('<Popover.Popup />', () => {
  const { render, clock } = createRenderer();

  describeConformance(Popover.Popup, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>{node()}</Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ),
  });

  it('throws a descriptive error when rendered outside <Popover.Root>', async () => {
    // Port note: contain intentional render errors so Solid's reactive graph keeps running.
    let caughtError: Error | undefined;
    await render(() => (
      <Errored
        fallback={(error) => {
          caughtError = error() as Error;
          return null;
        }}
      >
        {(() => <Popover.Popup />)()}
      </Errored>
    ));
    expect(caughtError?.message).toBe(
      'Base UI: PopoverRootContext is missing. Popover parts must be placed within <Popover.Root>.',
    );
  });

  it('throws a descriptive error when rendered outside <Popover.Positioner>', async () => {
    // Port note: contain intentional render errors so Solid's reactive graph keeps running.
    let caughtError: Error | undefined;
    await render(() => (
      <Errored
        fallback={(error) => {
          caughtError = error() as Error;
          return null;
        }}
      >
        {(() => (
          <Popover.Root open>
            <Popover.Portal>
              <Popover.Popup />
            </Popover.Portal>
          </Popover.Root>
        ))()}
      </Errored>
    ));
    expect(caughtError?.message).toBe(
      'Base UI: PopoverPositionerContext is missing. PopoverPositioner parts must be placed within <Popover.Positioner>.',
    );
  });

  it('should render the children', async () => {
    await render(() => (
      <Popover.Root open>
        <Popover.Trigger>Trigger</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup>Content</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    expect(screen.getByText('Content')).not.toBe(null);
  });

  describe('prop: initialFocus', () => {
    it('should focus the first focusable element within the popup by default', async () => {
      await render(() => (
        <div>
          <input />
          <Popover.Root>
            <Popover.Trigger>Open</Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup data-testid="popover">
                  <input data-testid="popover-input" />
                  <button>Close</button>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          <input />
        </div>
      ));

      const trigger = screen.getByText('Open');
      trigger.click();
      await flushMicrotasks();

      await waitFor(() => {
        const innerInput = screen.getByTestId('popover-input');
        expect(innerInput).to.toHaveFocus();
      });
    });

    it('should focus the element provided to `initialFocus` as a ref when open', async () => {
      function TestComponent() {
        const input2Ref: { current: HTMLInputElement | null } = { current: null };
        return (
          <div>
            <input />
            <Popover.Root>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup initialFocus={input2Ref}>
                    <input data-testid="input-1" />
                    <input
                      data-testid="input-2"
                      ref={(el) => {
                        input2Ref.current = el;
                      }}
                    />
                    <input data-testid="input-3" />
                    <button>Close</button>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <input />
          </div>
        );
      }

      await render(() => <TestComponent />);

      const trigger = screen.getByText('Open');
      trigger.click();
      await flushMicrotasks();

      await waitFor(() => {
        const input2 = screen.getByTestId('input-2');
        expect(input2).to.toHaveFocus();
      });
    });

    it('should focus the element provided to `initialFocus` as a function when open', async () => {
      function TestComponent() {
        let input2Ref: HTMLInputElement | null = null;

        const getRef = () => input2Ref;

        return (
          <div>
            <input />
            <Popover.Root>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup initialFocus={getRef}>
                    <input data-testid="input-1" />
                    <input
                      data-testid="input-2"
                      ref={(el) => {
                        input2Ref = el;
                      }}
                    />
                    <input data-testid="input-3" />
                    <button>Close</button>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <input />
          </div>
        );
      }

      const { user } = await render(() => <TestComponent />);

      const trigger = screen.getByText('Open');
      await user.click(trigger);

      await waitFor(() => {
        const input2 = screen.getByTestId('input-2');
        expect(input2).to.toHaveFocus();
      });
    });

    it('should support element-returning function and no-op via false/void for initialFocus', async () => {
      function TestComponent() {
        let input2Ref: HTMLInputElement | null = null;

        const getEl = (type: string) => {
          if (type === 'keyboard') {
            return input2Ref;
          }
          return undefined;
        };

        return (
          <div>
            <Popover.Root>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup data-testid="popover" initialFocus={getEl}>
                    <input data-testid="input-1" />
                    <input
                      data-testid="input-2"
                      ref={(el) => {
                        input2Ref = el;
                      }}
                    />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        );
      }

      const { user } = await render(() => <TestComponent />);

      const trigger = screen.getByText('Open');
      await user.click(trigger);

      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });

      await user.keyboard('{Escape}');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('input-2')).toHaveFocus();
      });
    });

    it('passes the latest interaction type to initialFocus after reopening', async () => {
      const initialFocus = vi.fn(() => false);

      const { user } = await render(() => (
        <Popover.Root>
          <Popover.Trigger>Open</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup initialFocus={initialFocus}>Content</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      const trigger = screen.getByText('Open');
      trigger.focus();
      await flushMicrotasks();
      await user.keyboard('[Enter]');

      await waitFor(() => {
        expect(initialFocus).toHaveBeenLastCalledWith('keyboard');
      });

      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBe(null);
      });

      fireEvent.pointerDown(trigger, { pointerType: 'touch' });
      fireEvent.click(trigger, { detail: 1 });

      await waitFor(() => {
        expect(initialFocus).toHaveBeenLastCalledWith('touch');
      });
    });

    it('should not move focus when initialFocus is false', async () => {
      function TestComponent() {
        return (
          <div>
            <Popover.Root>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup data-testid="popover" initialFocus={false}>
                    <input data-testid="input-1" />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        );
      }

      const { user } = await render(() => <TestComponent />);
      const trigger = screen.getByText('Open');
      await user.click(trigger);
      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
    });

    it('should default focus when initialFocus returns true', async () => {
      function TestComponent() {
        return (
          <div>
            <Popover.Root>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup data-testid="popover" initialFocus={() => true}>
                    <input data-testid="input-1" />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        );
      }

      const { user } = await render(() => <TestComponent />);
      await user.click(screen.getByText('Open'));
      await waitFor(() => {
        expect(screen.getByTestId('input-1')).toHaveFocus();
      });
    });

    it('uses default behavior when initialFocus returns null', async () => {
      function TestComponent() {
        return (
          <div>
            <Popover.Root>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup data-testid="popover" initialFocus={() => null}>
                    <input data-testid="input-1" />
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        );
      }

      const { user } = await render(() => <TestComponent />);
      await user.click(screen.getByText('Open'));
      await waitFor(() => {
        expect(screen.getByTestId('input-1')).toHaveFocus();
      });
    });
  });

  it.skipIf(isJSDOM)('focuses the popup when the active element becomes display:none', async () => {
    function TestComponent() {
      const [hidden, setHidden] = createSignal(false);

      return (
        <Popover.Root open>
          <Popover.Trigger>Open</Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup data-testid="popup">
                <button
                  data-testid="hide-button"
                  style={{ display: hidden() ? 'none' : undefined }}
                  onClick={() => setHidden(true)}
                >
                  Hide
                </button>
                <input />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      );
    }

    const { user } = await render(() => <TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('hide-button')).toHaveFocus();
    });

    await user.click(screen.getByTestId('hide-button'));

    await waitFor(() => {
      expect(screen.getByTestId('popup')).toHaveFocus();
    });
  });

  describe('openOnHover: delay + click', () => {
    clock.withFakeTimers();

    it('returns focus to the trigger if opened by click before the hover delay completes', async () => {
      await render(() => (
        <Popover.Root>
          <Popover.Trigger openOnHover delay={300}>
            Open
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup>
                <Popover.Close>Close</Popover.Close>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      ));

      const trigger = screen.getByText('Open');

      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);

      clock.tick(100);

      fireEvent.click(trigger);
      await flushMicrotasks();

      expect(screen.getByText('Close')).not.toBe(null);

      clock.tick(1000);
      await flushMicrotasks();

      fireEvent.click(screen.getByText('Close'));
      await flushMicrotasks();

      expect(trigger).toHaveFocus();
    });
  });

  describe('prop: finalFocus', () => {
    it('should focus the trigger by default when closed', async () => {
      await render(() => (
        <div>
          <input />
          <Popover.Root>
            <Popover.Trigger>Open</Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>
                  <Popover.Close>Close</Popover.Close>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          <input />
        </div>
      ));

      const trigger = screen.getByText('Open');
      trigger.click();
      await flushMicrotasks();

      const closeButton = screen.getByText('Close');
      closeButton.click();
      await flushMicrotasks();

      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
    });

    it('should focus the element provided to the prop when closed', async () => {
      function TestComponent() {
        const inputRef: { current: HTMLInputElement | null } = { current: null };
        return (
          <div>
            <input />
            <Popover.Root>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup finalFocus={inputRef}>
                    <Popover.Close>Close</Popover.Close>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <input />
            <input
              data-testid="input-to-focus"
              ref={(el) => {
                inputRef.current = el;
              }}
            />
            <input />
          </div>
        );
      }

      await render(() => <TestComponent />);

      const trigger = screen.getByText('Open');
      trigger.click();
      await flushMicrotasks();

      const closeButton = screen.getByText('Close');
      closeButton.click();
      await flushMicrotasks();

      const inputToFocus = screen.getByTestId('input-to-focus');

      await waitFor(() => {
        expect(inputToFocus).toHaveFocus();
      });
    });

    it('should focus the element provided to `finalFocus` as a function when closed', async () => {
      function TestComponent() {
        let ref: HTMLInputElement | null = null;
        const getRef = () => ref;
        return (
          <div>
            <Popover.Root>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup finalFocus={getRef}>
                    <Popover.Close>Close</Popover.Close>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <input
              data-testid="input-to-focus"
              ref={(el) => {
                ref = el;
              }}
            />
          </div>
        );
      }

      const { user } = await render(() => <TestComponent />);

      const trigger = screen.getByText('Open');
      await user.click(trigger);

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.getByTestId('input-to-focus')).toHaveFocus();
      });
    });

    it('should not move focus when finalFocus is false', async () => {
      function TestComponent() {
        return (
          <div>
            <Popover.Root>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup finalFocus={false}>
                    <Popover.Close>Close</Popover.Close>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        );
      }

      const { user } = await render(() => <TestComponent />);
      const trigger = screen.getByText('Open');

      await user.click(trigger);
      await user.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(trigger).not.toHaveFocus();
      });
    });

    it('should move focus to the trigger when finalFocus returns true', async () => {
      function TestComponent() {
        return (
          <div>
            <Popover.Root>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup finalFocus={() => true}>
                    <Popover.Close>Close</Popover.Close>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        );
      }

      const { user } = await render(() => <TestComponent />);
      const trigger = screen.getByText('Open');

      await user.click(trigger);
      await user.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
    });

    it('should support element-returning function and default via true + no-op via void for finalFocus based on closeType', async () => {
      function TestComponent() {
        let inputRef: HTMLInputElement | null = null;
        const getEl = (type: string) => {
          if (type === 'keyboard') {
            return inputRef;
          }
          return true;
        };

        return (
          <div>
            <Popover.Root>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup finalFocus={getEl}>
                    <Popover.Close>Close</Popover.Close>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
            <input
              data-testid="final-input"
              ref={(el) => {
                inputRef = el;
              }}
            />
          </div>
        );
      }

      const { user } = await render(() => <TestComponent />);

      const trigger = screen.getByText('Open');

      // Close via pointer: true => default, should move focus to trigger
      await user.click(trigger);
      await user.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });

      // Close via keyboard: should move focus to final-input
      await user.click(trigger);
      await waitSingleFrame();
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.getByTestId('final-input')).toHaveFocus();
      });
    });

    it('uses default behavior when finalFocus returns null', async () => {
      function TestComponent() {
        return (
          <div>
            <Popover.Root>
              <Popover.Trigger>Open</Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner>
                  <Popover.Popup finalFocus={() => null}>
                    <Popover.Close>Close</Popover.Close>
                  </Popover.Popup>
                </Popover.Positioner>
              </Popover.Portal>
            </Popover.Root>
          </div>
        );
      }

      const { user } = await render(() => <TestComponent />);
      const trigger = screen.getByText('Open');
      await user.click(trigger);
      await user.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
    });
  });

  describe('inside a toolbar', () => {
    function ToolbarPopover(props: { children: JSX.Element }) {
      return (
        <Toolbar.Root>
          <Toolbar.Button>First</Toolbar.Button>
          <Popover.Root>
            {/* Port note: `render={<Popover.Trigger />}` (React element) becomes a render function. */}
            <Toolbar.Button render={(props) => <Popover.Trigger {...(props as any)} />}>
              Open
            </Toolbar.Button>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>{props.children}</Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          <Toolbar.Button>Last</Toolbar.Button>
        </Toolbar.Root>
      );
    }

    // The popup is portaled but still bubbles React events up to `Toolbar.Root`, whose composite
    // handler would move the roving highlight and pull focus out of the open popup.
    it('does not relay composite keys from the popup to the toolbar', async () => {
      const { user } = await render(() => (
        <ToolbarPopover>
          <button type="button">Inside</button>
        </ToolbarPopover>
      ));

      // The toolbar itself still navigates with the same key, so a passing assertion below can't
      // come from an inert toolbar.
      await user.keyboard('[Tab]');
      expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
      await user.keyboard('[ArrowRight]');
      const trigger = screen.getByRole('button', { name: 'Open' });
      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });

      await user.keyboard('[Enter]');
      const insideButton = screen.getByRole('button', { name: 'Inside' });
      await waitFor(() => {
        expect(insideButton).toHaveFocus();
      });

      await user.keyboard('[ArrowRight]');
      await flushMicrotasks();

      expect(insideButton).toHaveFocus();
      expect(screen.getByRole('button', { name: 'Last' })).not.toHaveFocus();
    });

    // Shielding the toolbar must not disable the keys inside the popup: only propagation is
    // stopped, so native caret movement in popup content keeps working.
    it('keeps composite keys working inside the popup content', async () => {
      const { user } = await render(() => (
        <ToolbarPopover>
          <input defaultValue="ab" />
        </ToolbarPopover>
      ));

      await user.click(screen.getByRole('button', { name: 'Open' }));

      const input = screen.getByRole('textbox') as HTMLInputElement;
      await waitFor(() => {
        expect(input).toHaveFocus();
      });

      input.setSelectionRange(0, 0);
      await flushMicrotasks();
      await user.keyboard('[ArrowRight]');

      expect(input.selectionStart).toBe(1);
      expect(screen.getByRole('button', { name: 'Last' })).not.toHaveFocus();
    });
  });
});
