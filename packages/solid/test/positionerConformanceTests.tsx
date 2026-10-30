import { createEffect, createSignal, flush } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { expect, it, describe } from 'vitest';
import { DirectionProvider } from 'base-ui-solid/direction-provider';
import { isJSDOM } from '@base-ui-solid/utils/testUtils';
import { flushMicrotasks, screen, waitFor } from './utils';
import type { createRenderer } from './createRenderer';
import { waitForPositioned } from './waitForPositioned';
import type {
  Align,
  CollisionAvoidance,
  OffsetFunction,
  Side,
} from '../src/internals/useAnchorPositioning';
import type { HTMLProps } from '../src/internals/types';

// The anchor sits at the viewport origin and the popup is centered below it, so the positioner
// starts at x = (anchorWidth - popupWidth) / 2 and y = anchorHeight.
const anchorWidth = 72;
const anchorHeight = 36;
const popupWidth = 52;
const popupHeight = 24;
const baselineX = (anchorWidth - popupWidth) / 2;
const baselineY = anchorHeight;

// Port note: Solid style objects are kebab-case, and Solid doesn't add `px` to numeric values.
const triggerStyle: JSX.CSSProperties = {
  width: `${anchorWidth}px`,
  height: `${anchorHeight}px`,
  'box-sizing': 'border-box',
};
const popupStyle: JSX.CSSProperties = { width: `${popupWidth}px`, height: `${popupHeight}px` };

const offsetCases = [
  {
    prop: 'sideOffset',
    numberPosition: (offset: number) => ({ x: baselineX, y: baselineY + offset }),
    offsetFunction: ((data) => data.positioner.width + data.anchor.width) as OffsetFunction,
    functionPosition: { x: baselineX, y: baselineY + popupWidth + anchorWidth },
  },
  {
    prop: 'alignOffset',
    numberPosition: (offset: number) => ({ x: baselineX + offset, y: baselineY }),
    offsetFunction: ((data) => data.positioner.width) as OffsetFunction,
    functionPosition: { x: baselineX + popupWidth, y: baselineY },
  },
] as const;

const callbackDataCases: Array<{
  description: string;
  positioner: Pick<PositionerTestProps, 'side' | 'align'>;
  key: 'side' | 'align';
  direction: 'ltr' | 'rtl';
  expected: string;
}> = [
  {
    description: 'the latest side after a flip',
    positioner: { side: 'left' },
    key: 'side',
    direction: 'ltr',
    expected: 'right',
  },
  {
    description: 'the latest align after a flip',
    positioner: { side: 'right', align: 'start' },
    key: 'align',
    direction: 'ltr',
    expected: 'end',
  },
  {
    description: 'the logical side after a flip',
    positioner: { side: 'inline-start' },
    key: 'side',
    direction: 'ltr',
    expected: 'inline-end',
  },
  {
    description: 'the logical side in RTL mode',
    positioner: { side: 'inline-start' },
    key: 'side',
    direction: 'rtl',
    expected: 'inline-start',
  },
];

// Port note: React's `act` lets Floating UI's async position computation settle during `render`.
// Here it lands a few microtasks later, so the tests wait for the positioner first.
async function waitForPositioner() {
  const positioner = screen.getByTestId('positioner');
  await waitForPositioned(positioner);
  return positioner;
}

/**
 * Tests the anchor positioning behavior that every `*.Positioner` part shares through
 * `useAnchorPositioning`. All cases need real layout, so they run in the browser only.
 */
export function positionerConformanceTests(config: PositionerTestConfig) {
  const {
    render,
    createComponent,
    viewport: hasViewport = false,
    defaultSide = 'bottom',
    defaultCollisionAvoidance = 'dropdown',
    stableState = true,
  } = config;

  // Port note: the options are read lazily (pass getters for `open` and `viewport` to change
  // them), and so are the props passed to `createComponent`.
  function prepareComponent(options: {
    positioner?: Partial<PositionerTestProps>;
    popup?: { style?: JSX.CSSProperties };
    open?: boolean;
    viewport?: boolean;
  }) {
    const root = {
      get open() {
        return options.open ?? true;
      },
    };
    const trigger = { style: triggerStyle };
    const positioner: PositionerTestProps = { 'data-testid': 'positioner', ...options.positioner };
    const popup = {
      get style() {
        return options.popup?.style ?? popupStyle;
      },
    };

    return createComponent({
      root,
      trigger,
      positioner,
      popup,
      get viewport() {
        return options.viewport ?? false;
      },
    });
  }

  describe.skipIf(isJSDOM)('Positioner conformance', () => {
    describe.each(offsetCases)(
      'prop: $prop',
      ({ prop, numberPosition, offsetFunction, functionPosition }) => {
        it('offsets the positioner when a number is specified', async () => {
          const offset = 7;
          await render(() => prepareComponent({ positioner: { [prop]: offset } }));

          const positioner = await waitForPositioner();
          const { x, y } = numberPosition(offset);
          expect(positioner.style.transform).toBe(`translate(${x}px, ${y}px)`);
          expect(positioner.getBoundingClientRect()).toMatchObject({ x, y });
        });

        it('offsets the positioner when a function is specified', async () => {
          await render(() => prepareComponent({ positioner: { [prop]: offsetFunction } }));

          const positioner = await waitForPositioner();
          const { x, y } = functionPosition;
          expect(positioner.style.transform).toBe(`translate(${x}px, ${y}px)`);
          expect(positioner.getBoundingClientRect()).toMatchObject({ x, y });
        });

        it.each(callbackDataCases)(
          'reads $description inside the function',
          async ({ positioner, key, direction, expected }) => {
            let value = 'none';

            await render(() => (
              <DirectionProvider direction={direction}>
                {prepareComponent({
                  positioner: {
                    ...positioner,
                    [prop]: ((data) => {
                      value = data[key];
                      return 0;
                    }) satisfies OffsetFunction,
                  },
                })}
              </DirectionProvider>
            ));
            await waitForPositioner();

            expect(value).toBe(expected);
            expect(screen.getByTestId('positioner')).toHaveAttribute(`data-${key}`, expected);
          },
        );
      },
    );

    // https://github.com/mui/base-ui/issues/5131
    it('rests exactly at collisionPadding from the colliding edge', async () => {
      const collisionPadding = 12;
      let setOpen!: (open: boolean) => void;

      function App() {
        const [open, setOpenState] = createSignal(false);
        setOpen = setOpenState;

        return (
          // Anchor pinned near the bottom so the bottom-side popup flips to the top and
          // collides with the top viewport edge.
          <div style={{ position: 'fixed', bottom: '8px', left: '16px' }}>
            {prepareComponent({
              get open() {
                return open();
              },
              positioner: {
                side: 'bottom',
                sideOffset: 8,
                collisionPadding,
                collisionAvoidance: { fallbackAxisSide: 'none' },
              },
              popup: {
                style: {
                  width: '200px',
                  height: '1000px',
                  'max-height': 'var(--available-height)',
                },
              },
            })}
          </div>
        );
      }

      await render(() => <App />);
      // Port note: `act(() => setOpen(true))` is a signal write followed by a flush.
      setOpen(true);
      await flushMicrotasks();

      const positioner = screen.getByTestId('positioner');
      await waitFor(() => {
        expect(positioner).toHaveAttribute('data-side', 'top');
      });

      // The preferred-side bias used by flip() must not leak into the resting position:
      // the popup should sit exactly `collisionPadding` away from the top edge, not +1px.
      await waitFor(() => {
        expect(Math.round(positioner.getBoundingClientRect().top)).toBe(collisionPadding);
      });
    });

    it('places the popup on the default side when it fits', async () => {
      await render(() => (
        <div style={{ position: 'fixed', top: '200px', left: '200px' }}>{prepareComponent({})}</div>
      ));

      expect(screen.getByTestId('positioner')).toHaveAttribute('data-side', defaultSide);
    });

    describe('prop: collisionAvoidance', () => {
      // The popup fits neither above nor below the anchor, but fits beside it, so only a fallback to
      // the perpendicular axis moves it to the side.
      function prepareTallPopup(collisionAvoidance?: CollisionAvoidance) {
        return (
          <div style={{ position: 'fixed', top: '50%', left: '16px' }}>
            {prepareComponent({
              positioner: { side: 'bottom', collisionAvoidance },
              popup: { style: { width: `${popupWidth}px`, height: '75vh' } },
            })}
          </div>
        );
      }

      const collisionDefaults = {
        popup: { collisionAvoidance: { fallbackAxisSide: 'end' }, side: /^right$/ },
        dropdown: { collisionAvoidance: { fallbackAxisSide: 'none' }, side: /^(top|bottom)$/ },
      } as const;

      it(`uses the ${defaultCollisionAvoidance} default when the prop is not set`, async () => {
        await render(() => prepareTallPopup());

        const positioner = screen.getByTestId('positioner');
        await waitForPositioned(positioner);
        expect(positioner.getAttribute('data-side')).toMatch(
          collisionDefaults[defaultCollisionAvoidance].side,
        );
      });

      it('uses the prop over the default', async () => {
        const other =
          collisionDefaults[defaultCollisionAvoidance === 'popup' ? 'dropdown' : 'popup'];
        await render(() => prepareTallPopup(other.collisionAvoidance));

        const positioner = screen.getByTestId('positioner');
        await waitForPositioned(positioner);
        expect(positioner.getAttribute('data-side')).toMatch(other.side);
      });
    });

    // Port note: `render` runs once and its `state` is reactive, so a new state object isn't
    // observable as a re-render. An effect that reads every state key counts the state's updates
    // instead, and a change of something the state doesn't hold must not update it.
    it.skipIf(!stableState)(
      'passes the same state object while nothing it holds changes',
      async () => {
        let stateUpdates = 0;
        const [color, setColor] = createSignal('red');

        function App() {
          return prepareComponent({
            positioner: {
              render: (props, state) => {
                const stateRecord = state as Record<string, unknown>;
                createEffect(
                  () => Object.keys(stateRecord).map((key) => stateRecord[key]),
                  () => {
                    stateUpdates += 1;
                  },
                );
                return <div {...props} />;
              },
            },
            popup: {
              get style() {
                return { ...popupStyle, color: color() };
              },
            },
          });
        }

        await render(() => <App />);
        await waitForPositioned(screen.getByTestId('positioner'));
        await flushMicrotasks();
        const updatesBefore = stateUpdates;

        setColor('blue');
        flush();
        await flushMicrotasks();

        expect(stateUpdates).toBe(updatesBefore);
      },
    );

    it('uses transform positioning without Viewport', async () => {
      await render(() => prepareComponent({}));

      const positioner = screen.getByTestId('positioner');
      await waitFor(() => {
        expect(positioner.style.transform).toBe(`translate(${baselineX}px, ${baselineY}px)`);
      });
    });

    if (hasViewport) {
      it('uses top/left positioning with Viewport', async () => {
        await render(() => prepareComponent({ viewport: true }));

        const positioner = screen.getByTestId('positioner');
        await waitForPositioned(positioner);
        expect(positioner.style.transform).toBe('');
        // A pass can measure the popup before it has a size, so wait for the final coordinates.
        await waitFor(() => {
          expect(positioner.style.left).toBe(`${baselineX}px`);
        });
        await waitFor(() => {
          expect(positioner.style.top).toBe(`${baselineY}px`);
        });
      });

      it('updates positioning when Viewport mounts and unmounts', async () => {
        function App() {
          const [showViewport, setShowViewport] = createSignal(false);

          return (
            <>
              {prepareComponent({
                get viewport() {
                  return showViewport();
                },
              })}
              {/* Rendered after the anchor to keep the anchor at the viewport origin. */}
              <button type="button" onClick={() => setShowViewport((value) => !value)}>
                Toggle Viewport
              </button>
            </>
          );
        }

        const { user } = await render(() => <App />);
        const positioner = await waitForPositioner();
        const toggle = screen.getByRole('button', { name: 'Toggle Viewport' });

        expect(positioner.style.transform).toBe(`translate(${baselineX}px, ${baselineY}px)`);

        await user.click(toggle);
        await waitFor(() => {
          expect(positioner.style.transform).toBe('');
        });
        await waitFor(() => {
          expect(positioner.style.top).toBe(`${baselineY}px`);
        });

        await user.click(toggle);
        await waitFor(() => {
          expect(positioner.style.transform).toBe(`translate(${baselineX}px, ${baselineY}px)`);
        });
      });
    }
  });
}

export interface PositionerTestProps {
  'data-testid': string;
  side?: Side;
  align?: Align;
  sideOffset?: number | OffsetFunction;
  alignOffset?: number | OffsetFunction;
  collisionPadding?: number;
  collisionAvoidance?: CollisionAvoidance | undefined;
  render?: (props: HTMLProps, state: unknown) => JSX.Element;
}

/**
 * Port note: `root.open` and `viewport` are getters that may change during a test. Spread the
 * part objects (`<Popover.Root {...props.root}>`) and read `props.viewport` in JSX, but don't
 * destructure `viewport` from the props.
 */
export interface PositionerTestComponentProps {
  /**
   * Props to spread on the Root part.
   */
  root: { open: boolean };
  /**
   * Props to spread on the element the positioner is anchored to.
   */
  trigger: { style: JSX.CSSProperties };
  /**
   * Props to spread on the Positioner part.
   */
  positioner: PositionerTestProps;
  /**
   * Props to spread on the Popup part.
   */
  popup: { style: JSX.CSSProperties };
  /**
   * Whether to wrap the popup content in the component's Viewport part.
   */
  viewport: boolean;
}

export interface PositionerTestConfig {
  /**
   * Render function returned from `createRenderer`.
   */
  render: ReturnType<typeof createRenderer>['render'];
  /**
   * Returns an open popup whose Positioner is anchored to an element at the viewport origin.
   * Its parameters contain props to be spread on the component's parts.
   */
  createComponent: (props: PositionerTestComponentProps) => JSX.Element;
  /**
   * Whether the component has a Viewport part, which switches the positioner to top/left
   * positioning.
   * @default false
   */
  viewport?: boolean;
  /**
   * The side the Positioner places the popup on when `side` isn't set.
   * @default 'bottom'
   */
  defaultSide?: Side;
  /**
   * The `collisionAvoidance` default the Positioner uses: `'popup'` falls back to the
   * perpendicular axis when neither side fits, `'dropdown'` doesn't.
   * @default 'dropdown'
   */
  defaultCollisionAvoidance?: 'popup' | 'dropdown';
  /**
   * Whether the Positioner passes the same state object to `render` while nothing in it changes.
   * @default true
   */
  stableState?: boolean;
}
