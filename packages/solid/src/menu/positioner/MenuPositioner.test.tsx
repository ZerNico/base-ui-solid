import { createSignal, untrack } from 'solid-js';

import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';

import { afterEach, beforeEach, expect, vi, describe, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
  flushMicrotasks,
  screen,
  waitFor,
  isJSDOM,
  resetBrowserPointer,
  waitForPositioned,
} from '#test-utils';
import { Menu } from 'base-ui-solid/menu';
import {
  portRef,
  portCallback,
  portForwardRef,
  createRenderer,
} from '../../../test/menuPortHelpers';
import { act } from '../../../test/utils';
import { describeMenuConformance } from '../../../test/menuConformance';

type Ref<T> = (element: T) => void;
let ContextMenu: any;
let Menubar: any;
const useAnchorPositioningSpy = vi.hoisted(() => vi.fn());
vi.mock('../../internals/useAnchorPositioning', async () => {
  const actual = await vi.importActual<typeof import('../../internals/useAnchorPositioning')>(
    '../../internals/useAnchorPositioning',
  );
  return {
    ...actual,
    useAnchorPositioning: ((...args: Parameters<typeof actual.useAnchorPositioning>) => {
      useAnchorPositioningSpy(...args);
      return actual.useAnchorPositioning(...args);
    }) satisfies typeof actual.useAnchorPositioning,
  };
});
const Trigger = portForwardRef(function Trigger(props: Menu.Trigger.Props, ref: Ref<any>) {
  return (
    <Menu.Trigger
      {...props}
      ref={ref}
      render={(renderProps) => <div {...renderProps} />}
      nativeButton={false}
    />
  );
});
describe('<Menu.Positioner />', () => {
  beforeEach(resetBrowserPointer);
  const { render } = createRenderer();
  beforeEach(() => {
    useAnchorPositioningSpy.mockClear();
  });
  it('throws when rendered outside Menu.Portal', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(
        render(
          (testProps: any) => <Menu.Root {...testProps} />,
          () => ({
            open: true,
            get children() {
              return (
                <>
                  <Menu.Positioner />
                </>
              );
            },
          }),
        ),
      ).rejects.toThrow('Base UI: <Menu.Portal> is missing.');
    } finally {
      errorSpy.mockRestore();
    }
  });
  it('enables lazy flipping for a filter menu', async () => {
    await render(
      (testProps: any) => <Menu.FilterProvider {...testProps} />,
      () => ({
        get children() {
          return (
            <>
              <Menu.Root open>
                <Menu.Trigger>Actions</Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.Input aria-label="Filter" />
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            </>
          );
        },
      }),
    );
    // `'placement'` and not `true`: the filter menu locks the alignment as well as the side, so a
    // popup that flipped once does not jitter back while typing resizes it. Combobox stays on
    // `true` (side only), which is what it shipped with.
    expect(useAnchorPositioningSpy.mock.lastCall?.[0].lazyFlip).toBe('placement');
  });
  it('leaves lazy flipping off for a plain menu', async () => {
    await render(
      (testProps: any) => <Menu.Root {...testProps} />,
      () => ({
        open: true,
        get children() {
          return (
            <>
              <Menu.Trigger>Actions</Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup />
                </Menu.Positioner>
              </Menu.Portal>
            </>
          );
        },
      }),
    );
    expect(useAnchorPositioningSpy.mock.lastCall?.[0].lazyFlip).toBe(false);
  });
  describeMenuConformance(Menu.Positioner, {
    render: (node: () => JSX.Element) => {
      return render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Portal>{node()}</Menu.Portal>
              </>
            );
          },
        }),
      );
    },
    refInstanceof: window.HTMLDivElement,
  });
  describe('layout viewport', () => {
    beforeEach(async () => {
      const modulePath = '../../context-menu/index';
      ({ ContextMenu } = await import(/* @vite-ignore */ modulePath));
    });
    it('uses the layout viewport for a root context menu', async () => {
      await render(
        (testProps: any) => <ContextMenu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <ContextMenu.Portal>
                  <ContextMenu.Positioner>
                    <ContextMenu.Popup>Popup</ContextMenu.Popup>
                  </ContextMenu.Positioner>
                </ContextMenu.Portal>
              </>
            );
          },
        }),
      );
      expect(useAnchorPositioningSpy.mock.lastCall?.[0].shift).toEqual({
        crossAxis: true,
        rootBoundary: 'layoutViewport',
      });
    });
    it('disables cross-axis shifting when side collision avoidance is flip', async () => {
      await render(
        (testProps: any) => <ContextMenu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <ContextMenu.Portal>
                  <ContextMenu.Positioner collisionAvoidance={{ side: 'flip' }}>
                    <ContextMenu.Popup>Popup</ContextMenu.Popup>
                  </ContextMenu.Positioner>
                </ContextMenu.Portal>
              </>
            );
          },
        }),
      );
      expect(useAnchorPositioningSpy.mock.lastCall?.[0].shift).toEqual({
        crossAxis: false,
        rootBoundary: 'layoutViewport',
      });
    });
    it('preserves explicit context-menu placement and offsets', async () => {
      await render(
        (testProps: any) => <ContextMenu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <ContextMenu.Portal>
                  <ContextMenu.Positioner
                    side="right"
                    align="center"
                    sideOffset={11}
                    alignOffset={13}
                  >
                    <ContextMenu.Popup>Popup</ContextMenu.Popup>
                  </ContextMenu.Positioner>
                </ContextMenu.Portal>
              </>
            );
          },
        }),
      );
      expect(useAnchorPositioningSpy.mock.lastCall?.[0]).toMatchObject({
        side: 'right',
        align: 'center',
        sideOffset: 11,
        alignOffset: 13,
      });
    });
    it('uses the visual viewport for a context menu submenu', async () => {
      await render(
        (testProps: any) => <ContextMenu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <ContextMenu.SubmenuRoot defaultOpen>
                  <ContextMenu.Portal>
                    <ContextMenu.Positioner>
                      <ContextMenu.Popup>Popup</ContextMenu.Popup>
                    </ContextMenu.Positioner>
                  </ContextMenu.Portal>
                </ContextMenu.SubmenuRoot>
              </>
            );
          },
        }),
      );
      expect(useAnchorPositioningSpy).toHaveBeenCalled();
      expect(useAnchorPositioningSpy.mock.lastCall?.[0].shift).toBe(undefined);
    });
  });
  it('closes an open submenu with a sibling reason when its controlled parent closes', async () => {
    const onSubmenuOpenChange = vi.fn();
    let closeParent = () => {};
    function Test() {
      const [open, setOpen] = createSignal(untrack(() => true));
      closeParent = () => setOpen(false);
      return (
        <Menu.Root open={open()}>
          <Menu.Trigger>Open</Menu.Trigger>
          <Menu.Portal keepMounted>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.SubmenuRoot defaultOpen onOpenChange={onSubmenuOpenChange}>
                  <Menu.SubmenuTrigger>More</Menu.SubmenuTrigger>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup data-testid="submenu-popup" />
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.SubmenuRoot>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      );
    }
    await render(
      (testProps: any) => <Test {...testProps} />,
      () => ({}),
    );
    expect(screen.queryByTestId('submenu-popup')).not.toBe(null);
    await act(async () => {
      closeParent();
    });
    await waitFor(() => {
      expect(onSubmenuOpenChange.mock.lastCall?.[0]).toBe(false);
    });
    expect(onSubmenuOpenChange.mock.lastCall?.[1].reason).toBe('sibling-open');
  });
  describe.skipIf(isJSDOM)('prop: anchor', () => {
    it('should be placed near the specified element when a ref is passed', async () => {
      function TestComponent() {
        const anchor = portRef<HTMLDivElement | null>(null);
        return (
          <div style={{ margin: '50px' }}>
            <Menu.Root open>
              <Menu.Portal>
                <Menu.Positioner
                  side="bottom"
                  align="start"
                  anchor={anchor}
                  arrowPadding={0}
                  data-testid="positioner"
                >
                  <Menu.Popup>
                    <Menu.Item>1</Menu.Item>
                    <Menu.Item>2</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            <div
              data-testid="anchor"
              style={{ 'margin-top': '100px' }}
              ref={(el) => {
                anchor.current = el;
              }}
            />
          </div>
        );
      }
      await render(
        (testProps: any) => <TestComponent {...testProps} />,
        () => ({}),
      );
      const positioner = screen.getByTestId('positioner');
      const anchor = screen.getByTestId('anchor');
      const anchorPosition = anchor.getBoundingClientRect();
      await flushMicrotasks();
      expect(positioner.style.getPropertyValue('transform')).toBe(
        `translate(${anchorPosition.left}px, ${anchorPosition.bottom}px)`,
      );
    });
    it('should be placed near the specified element when an element is passed', async () => {
      function TestComponent() {
        const [anchor, setAnchor] = createSignal<HTMLDivElement | null>(untrack(() => null));
        const handleRef = portCallback((element: HTMLDivElement | null) => {
          setAnchor(element);
        }, []);
        return (
          <div style={{ margin: '50px' }}>
            <Menu.Root open>
              <Menu.Portal>
                <Menu.Positioner
                  side="bottom"
                  align="start"
                  anchor={anchor()}
                  arrowPadding={0}
                  data-testid="positioner"
                >
                  <Menu.Popup>
                    <Menu.Item>1</Menu.Item>
                    <Menu.Item>2</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            <div data-testid="anchor" style={{ 'margin-top': '100px' }} ref={handleRef} />
          </div>
        );
      }
      await render(
        (testProps: any) => <TestComponent {...testProps} />,
        () => ({}),
      );
      const positioner = screen.getByTestId('positioner');
      const anchor = screen.getByTestId('anchor');
      const anchorPosition = anchor.getBoundingClientRect();
      await flushMicrotasks();
      expect(positioner.style.getPropertyValue('transform')).toBe(
        `translate(${anchorPosition.left}px, ${anchorPosition.bottom}px)`,
      );
    });
    it('should be placed near the specified element when a function returning an element is passed', async () => {
      function TestComponent() {
        const [anchor, setAnchor] = createSignal<HTMLDivElement | null>(untrack(() => null));
        const handleRef = portCallback((element: HTMLDivElement | null) => {
          setAnchor(element);
        }, []);
        // Port note: Solid callbacks are stable closures that read the latest signal.
        const getAnchor = () => anchor();
        return (
          <div style={{ margin: '50px' }}>
            <Menu.Root open>
              <Menu.Portal>
                <Menu.Positioner
                  side="bottom"
                  align="start"
                  anchor={getAnchor}
                  arrowPadding={0}
                  data-testid="positioner"
                >
                  <Menu.Popup>
                    <Menu.Item>1</Menu.Item>
                    <Menu.Item>2</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            <div data-testid="anchor" style={{ 'margin-top': '100px' }} ref={handleRef} />
          </div>
        );
      }
      await render(
        (testProps: any) => <TestComponent {...testProps} />,
        () => ({}),
      );
      const positioner = screen.getByTestId('positioner');
      const anchor = screen.getByTestId('anchor');
      const anchorPosition = anchor.getBoundingClientRect();
      await flushMicrotasks();
      expect(positioner.style.getPropertyValue('transform')).toBe(
        `translate(${anchorPosition.left}px, ${anchorPosition.bottom}px)`,
      );
    });
    it('should be placed at the specified position', async () => {
      const boundingRect = {
        x: 200,
        y: 100,
        top: 100,
        left: 200,
        bottom: 100,
        right: 200,
        height: 0,
        width: 0,
        toJSON: () => {},
      };
      const virtualElement = { getBoundingClientRect: () => boundingRect };
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Portal>
                  <Menu.Positioner
                    side="bottom"
                    align="start"
                    anchor={virtualElement}
                    arrowPadding={0}
                    data-testid="positioner"
                  >
                    <Menu.Popup>
                      <Menu.Item>1</Menu.Item>
                      <Menu.Item>2</Menu.Item>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const positioner = screen.getByTestId('positioner');
      expect(positioner.style.getPropertyValue('transform')).toBe(`translate(200px, 100px)`);
    });
    it('should accept a non-memoized function as an anchor', async () => {
      function TestComponent() {
        return (
          <div style={{ margin: '50px' }}>
            <Menu.Root open>
              <Menu.Portal>
                <Menu.Positioner
                  side="bottom"
                  align="start"
                  anchor={() => null}
                  arrowPadding={0}
                  data-testid="positioner"
                >
                  <Menu.Popup>
                    <Menu.Item>1</Menu.Item>
                    <Menu.Item>2</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>
        );
      }
      await render(
        (testProps: any) => <TestComponent {...testProps} />,
        () => ({}),
      );
      expect(screen.getByTestId('positioner')).not.toBe(null);
    });
    it('should react to the anchor changing from a ref to undefined and back', async () => {
      function TestComponent() {
        const anchorRef = portRef<HTMLDivElement | null>(null);
        const [currentAnchor, setCurrentAnchor] = createSignal<
          RefObject<HTMLDivElement | null> | undefined
        >(untrack(() => anchorRef));
        return (
          <div style={{ margin: '50px' }}>
            <button type="button" onClick={() => setCurrentAnchor(undefined)}>
              undefined
            </button>
            <button type="button" onClick={() => setCurrentAnchor(anchorRef)}>
              ref
            </button>
            <Menu.Root open>
              <Menu.Trigger>trigger</Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner
                  side="bottom"
                  align="start"
                  anchor={currentAnchor()}
                  arrowPadding={0}
                  data-testid="positioner"
                >
                  <Menu.Popup>
                    <Menu.Item>1</Menu.Item>
                    <Menu.Item>2</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            <div
              data-testid="anchor"
              style={{ 'margin-top': '100px', width: '10px', height: '10px' }}
              ref={(el) => {
                anchorRef.current = el;
              }}
            />
          </div>
        );
      }
      await render(
        (testProps: any) => <TestComponent {...testProps} />,
        () => ({}),
      );
      const positioner = screen.getByTestId('positioner');
      const anchorElement = screen.getByTestId('anchor');
      const setUndefinedButton = screen.getByRole('button', { name: 'undefined' });
      const setRefButton = screen.getByRole('button', { name: 'ref' });
      const trigger = screen.getByRole('button', { name: 'trigger' });
      let anchorRect = anchorElement.getBoundingClientRect();
      await flushMicrotasks();
      expect(positioner.style.getPropertyValue('transform')).toBe(
        `translate(${anchorRect.left}px, ${anchorRect.bottom}px)`,
      );
      await userEvent.click(setUndefinedButton);
      await flushMicrotasks();
      const triggerRect = trigger.getBoundingClientRect();
      expect(positioner.style.getPropertyValue('transform')).toBe(
        `translate(${Math.floor(triggerRect.left)}px, ${triggerRect.bottom}px)`,
      );
      await userEvent.click(setRefButton);
      await flushMicrotasks();
      anchorRect = anchorElement.getBoundingClientRect();
      expect(positioner.style.getPropertyValue('transform')).toBe(
        `translate(${anchorRect.left}px, ${anchorRect.bottom}px)`,
      );
    });
  });
  describe.skipIf(isJSDOM)('prop: keepMounted', () => {
    afterEach(async () => {
      const { cleanup } = await import('../../../test/menuBrowserRender');
      await cleanup();
    });
    it('when keepMounted=true, should keep the content mounted when closed', async () => {
      const { userEvent: user } = await import('vitest/browser');
      const { render: vbrRender } = await import('../../../test/menuBrowserRender');
      await vbrRender(() => (
        <Menu.Root modal={false}>
          <Menu.Trigger>Toggle</Menu.Trigger>
          <Menu.Portal keepMounted>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item>1</Menu.Item>
                <Menu.Item>2</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));
      const trigger = screen.getByRole('button', { name: 'Toggle' });
      expect(screen.queryByRole('menu', { hidden: true })).not.toBe(null);
      expect(screen.queryByRole('menu', { hidden: true })).toBeInaccessible();
      await user.click(trigger, { delay: 20 });
      await waitFor(() => {
        expect(screen.queryByRole('menu', { hidden: false })).not.toBe(null);
      });
      expect(screen.queryByRole('menu', { hidden: false })).not.toBeInaccessible();
      await user.click(trigger, { delay: 20 });
      await waitFor(() => {
        expect(screen.queryByRole('menu', { hidden: true })).not.toBe(null);
      });
      await waitFor(() => {
        expect(screen.queryByRole('menu', { hidden: true })).toBeInaccessible();
      });
    });
    it('when keepMounted=false, should unmount the content when closed', async () => {
      const { userEvent: user } = await import('vitest/browser');
      const { render: vbrRender } = await import('../../../test/menuBrowserRender');
      await vbrRender(() => (
        <Menu.Root modal={false}>
          <Menu.Trigger>Toggle</Menu.Trigger>
          <Menu.Portal keepMounted={false}>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.Item>1</Menu.Item>
                <Menu.Item>2</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      ));
      const trigger = screen.getByRole('button', { name: 'Toggle' });
      expect(screen.queryByRole('menu', { hidden: true })).toBe(null);
      await user.click(trigger, { delay: 20 });
      await flushMicrotasks();
      await waitFor(() => {
        expect(screen.queryByRole('menu', { hidden: false })).not.toBe(null);
      });
      expect(screen.queryByRole('menu', { hidden: false })).not.toBeInaccessible();
      await user.click(trigger, { delay: 20 });
      await waitFor(() => {
        expect(screen.queryByRole('menu', { hidden: true })).toBe(null);
      });
    });
  });
  const baselineX = 10;
  const baselineY = 36;
  const popupWidth = 52;
  const popupHeight = 24;
  const anchorWidth = 72;
  const anchorHeight = 36;
  const triggerStyle = { width: `${anchorWidth}px`, height: `${anchorHeight}px` };
  const popupStyle = { width: `${popupWidth}px`, height: `${popupHeight}px` };
  describe('Menubar parent', () => {
    beforeEach(async () => {
      const modulePath = '../../menubar/index';
      ({ Menubar } = await import(/* @vite-ignore */ modulePath));
    });
    it('uses bottom as the default side when the menubar is horizontal', async () => {
      let side = 'none';
      await render(
        (testProps: any) => <Menubar {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Root open>
                  <Trigger style={triggerStyle}>File</Trigger>
                  <Menu.Portal>
                    <Menu.Positioner
                      sideOffset={(data) => {
                        side = data.side;
                        return 0;
                      }}
                    >
                      <Menu.Popup style={popupStyle}>Open</Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </>
            );
          },
        }),
      );
      expect(side).toBe('bottom');
    });
    it('uses inline-end as the default side when the menubar is vertical', async () => {
      let side = 'none';
      await render(
        (testProps: any) => <Menubar {...testProps} />,
        () => ({
          orientation: 'vertical',
          get children() {
            return (
              <>
                <Menu.Root open>
                  <Trigger style={triggerStyle}>File</Trigger>
                  <Menu.Portal>
                    <Menu.Positioner
                      sideOffset={(data) => {
                        side = data.side;
                        return 0;
                      }}
                    >
                      <Menu.Popup style={popupStyle}>Open</Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </>
            );
          },
        }),
      );
      expect(side).toBe('inline-end');
    });
  });
  describe.skipIf(isJSDOM)('prop: sideOffset', () => {
    it('offsets the side when a number is specified', async () => {
      const sideOffset = 7;
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Trigger style={triggerStyle}>Trigger</Trigger>
                <Menu.Portal>
                  <Menu.Positioner data-testid="positioner" sideOffset={sideOffset}>
                    <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      expect(screen.getByTestId('positioner').style.transform).toBe(
        `translate(${baselineX}px, ${baselineY + sideOffset}px)`,
      );
    });
    it('offsets the side when a function is specified', async () => {
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Trigger style={triggerStyle}>Trigger</Trigger>
                <Menu.Portal>
                  <Menu.Positioner
                    data-testid="positioner"
                    sideOffset={(data) => data.positioner.width + data.anchor.width}
                  >
                    <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      expect(screen.getByTestId('positioner').style.transform).toBe(
        `translate(${baselineX}px, ${baselineY + popupWidth + anchorWidth}px)`,
      );
    });
    it('can read the latest side inside sideOffset', async () => {
      let side = 'none';
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Trigger style={triggerStyle}>Trigger</Trigger>
                <Menu.Portal>
                  <Menu.Positioner
                    side="left"
                    data-testid="positioner"
                    sideOffset={(data) => {
                      side = data.side;
                      return 0;
                    }}
                  >
                    <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      // correctly flips the side in the browser
      expect(side).toBe('right');
    });
    it('can read the latest align inside sideOffset', async () => {
      let align = 'none';
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Trigger style={triggerStyle}>Trigger</Trigger>
                <Menu.Portal>
                  <Menu.Positioner
                    side="right"
                    align="start"
                    data-testid="positioner"
                    sideOffset={(data) => {
                      align = data.align;
                      return 0;
                    }}
                  >
                    <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      // correctly flips the align in the browser
      expect(align).toBe('end');
    });
    it('reads logical side inside sideOffset', async () => {
      let side = 'none';
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Trigger style={triggerStyle}>Trigger</Trigger>
                <Menu.Portal>
                  <Menu.Positioner
                    side="inline-start"
                    data-testid="positioner"
                    sideOffset={(data) => {
                      side = data.side;
                      return 0;
                    }}
                  >
                    <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      // correctly flips the side in the browser
      expect(side).toBe('inline-end');
    });
  });
  describe.skipIf(isJSDOM)('prop: alignOffset', () => {
    it('offsets the align when a number is specified', async () => {
      const alignOffset = 7;
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Trigger style={triggerStyle}>Trigger</Trigger>
                <Menu.Portal>
                  <Menu.Positioner data-testid="positioner" alignOffset={alignOffset}>
                    <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      expect(screen.getByTestId('positioner').style.transform).toBe(
        `translate(${baselineX + alignOffset}px, ${baselineY}px)`,
      );
    });
    it('offsets the align when a function is specified', async () => {
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Trigger style={triggerStyle}>Trigger</Trigger>
                <Menu.Portal>
                  <Menu.Positioner
                    data-testid="positioner"
                    alignOffset={(data) => data.positioner.width}
                  >
                    <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      expect(screen.getByTestId('positioner').style.transform).toBe(
        `translate(${baselineX + popupWidth}px, ${baselineY}px)`,
      );
    });
    it('can read the latest side inside alignOffset', async () => {
      let side = 'none';
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Trigger style={triggerStyle}>Trigger</Trigger>
                <Menu.Portal>
                  <Menu.Positioner
                    side="left"
                    data-testid="positioner"
                    alignOffset={(data) => {
                      side = data.side;
                      return 0;
                    }}
                  >
                    <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      // correctly flips the side in the browser
      expect(side).toBe('right');
    });
    it('can read the latest align inside alignOffset', async () => {
      let align = 'none';
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Trigger style={triggerStyle}>Trigger</Trigger>
                <Menu.Portal>
                  <Menu.Positioner
                    side="right"
                    align="start"
                    data-testid="positioner"
                    alignOffset={(data) => {
                      align = data.align;
                      return 0;
                    }}
                  >
                    <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      // correctly flips the align in the browser
      expect(align).toBe('end');
    });
    it('reads logical side inside alignOffset', async () => {
      let side = 'none';
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Trigger style={triggerStyle}>Trigger</Trigger>
                <Menu.Portal>
                  <Menu.Positioner
                    side="inline-start"
                    data-testid="positioner"
                    alignOffset={(data) => {
                      side = data.side;
                      return 0;
                    }}
                  >
                    <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      // correctly flips the side in the browser
      expect(side).toBe('inline-end');
    });
  });
  it.skipIf(isJSDOM)('uses transform positioning without Viewport', async () => {
    const { unmount } = await render(
      (testProps: any) => <Menu.Root {...testProps} />,
      () => ({
        open: true,
        get children() {
          return (
            <>
              <Trigger style={triggerStyle}>Trigger</Trigger>
              <Menu.Portal>
                <Menu.Positioner data-testid="positioner">
                  <Menu.Popup style={popupStyle}>Popup</Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </>
          );
        },
      }),
    );
    const positioner = screen.getByTestId('positioner');
    await waitFor(() => {
      expect(positioner.style.transform).not.toBe('');
    });
    unmount();
  });
  it.skipIf(isJSDOM)('uses top/left positioning with Viewport', async () => {
    const { unmount } = await render(
      (testProps: any) => <Menu.Root {...testProps} />,
      () => ({
        open: true,
        get children() {
          return (
            <>
              <Trigger style={triggerStyle}>Trigger</Trigger>
              <Menu.Portal>
                <Menu.Positioner data-testid="positioner">
                  <Menu.Popup style={popupStyle}>
                    <Menu.Viewport>Popup</Menu.Viewport>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </>
          );
        },
      }),
    );
    const positioner = screen.getByTestId('positioner');
    await waitForPositioned(positioner);
    expect(positioner.style.transform).toBe('');
    unmount();
  });
});
