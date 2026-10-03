import { createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { expect, vi } from 'vitest';
import { isJSDOM } from '@base-ui-solid/utils/testUtils';
import { flushMicrotasks, screen, waitFor } from './utils';
import type { createRenderer } from './createRenderer';

export function popupConformanceTests(config: PopupTestConfig) {
  const {
    createComponent,
    triggerMouseAction,
    render: renderElement,
    expectedPopupRole,
    expectedAriaHasPopupValue = expectedPopupRole,
    alwaysMounted: alwaysMountedParam = false,
    combobox = false,
  } = config;

  const alwaysMounted = alwaysMountedParam === 'only-after-open' ? false : alwaysMountedParam;

  // Port note: the props are read lazily (getters), so `rerender` updates the rendered component
  // in place, like React re-rendering it with new props.
  const prepareComponent = (props: TestedComponentProps) => {
    return createComponent({
      get root() {
        return props.root;
      },
      get portal() {
        return props.portal;
      },
      get trigger() {
        return {
          'data-testid': 'trigger',
          ...props.trigger,
        };
      },
      get popup() {
        return {
          'data-testid': 'popup',
          ...props.popup,
        };
      },
    });
  };

  // Port note: counterpart of upstream's `render(prepareComponent(props))`, whose `rerender`
  // re-renders the element with new props. The props are held in a signal.
  async function render(initialProps: TestedComponentProps) {
    const [currentProps, setCurrentProps] = createSignal({ value: initialProps });
    const props: TestedComponentProps = {
      get root() {
        return currentProps().value.root;
      },
      get portal() {
        return currentProps().value.portal;
      },
      get trigger() {
        return currentProps().value.trigger;
      },
      get popup() {
        return currentProps().value.popup;
      },
    };

    const result = await renderElement(() => prepareComponent(props));

    return {
      ...result,
      async rerender(nextProps: TestedComponentProps) {
        setCurrentProps({ value: nextProps });
        await flushMicrotasks();
      },
    };
  }

  describe('Popup conformance', () => {
    describe('controlled mode', () => {
      it('opens the popup with the `open` prop', async () => {
        const { rerender } = await render({ root: { open: false } });
        if (!alwaysMounted) {
          expect(getPopup()).toBe(null);
        } else {
          expect(getPopup()).toBeInaccessible();
        }

        await rerender({ root: { open: true } });
        expect(getPopup()).not.toBe(null);
      });
    });

    if (triggerMouseAction === 'click') {
      describe('uncontrolled mode', () => {
        it('opens the popup when clicking on the trigger', async () => {
          const { user } = await render({});

          const trigger = getTrigger();
          if (!alwaysMounted) {
            expect(getPopup()).toBe(null);
          } else {
            expect(getPopup()).toBeInaccessible();
          }

          await user.click(trigger);
          await waitFor(() => {
            expect(getPopup()).not.toBe(null);
          });
        });
      });
    }

    if (expectedPopupRole || triggerMouseAction === 'click') {
      describe('ARIA attributes', () => {
        if (expectedPopupRole) {
          it(`has the ${expectedPopupRole} role on the popup`, async () => {
            await render({ root: { open: true } });
            const popup = getPopup();
            expect(popup).not.toBe(null);
            expect(popup).toHaveAttribute('role', expectedPopupRole);
          });
        }

        if (triggerMouseAction === 'click') {
          it('has the `aria-controls` attribute on the trigger', async () => {
            await render({ root: { open: true } });
            const trigger = getTrigger();
            const popup = getPopup();
            expect(trigger).toHaveAttribute('aria-controls', popup?.id);
          });

          it('has the `aria-expanded` attribute on the trigger when open', async () => {
            const { user } = await render({});
            const trigger = getTrigger();
            if (!alwaysMounted) {
              expect(getPopup()).toBe(null);
            } else {
              expect(getPopup()).toBeInaccessible();
            }
            expect(trigger).toHaveAttribute('aria-expanded', 'false');
            await user.click(trigger);
            await waitFor(() => {
              if (combobox) {
                expect(getPopup()).toHaveAttribute('role', 'listbox');
              } else {
                expect(getPopup()).toHaveAttribute('data-open');
              }
            });
            expect(trigger).toHaveAttribute('aria-expanded', 'true');
          });

          if (expectedAriaHasPopupValue) {
            it('has the `aria-haspopup` attribute on the trigger', async () => {
              await render({ root: { open: true } });
              const trigger = getTrigger();
              expect(trigger).toHaveAttribute('aria-haspopup', expectedAriaHasPopupValue);
            });
          }

          it('allows a custom `id` prop', async () => {
            await render({ root: { open: true }, popup: { id: 'TestId' } });
            const trigger = getTrigger();
            const popup = getPopup();
            expect(trigger.getAttribute('aria-controls')).toBe(popup?.getAttribute('id'));
          });
        }
      });
    }

    describe('animations', () => {
      beforeEach(() => {
        globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
      });

      afterEach(() => {
        globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
      });

      it('removes the popup when there is no exit animation defined', async ({ skip }) => {
        if (isJSDOM) {
          skip();
        }

        const { rerender } = await render({ root: { open: true } });

        await waitFor(() => {
          expect(getPopup()).not.toBe(null);
        });

        await rerender({ root: { open: false } });
        await waitFor(() => {
          if (!alwaysMounted && alwaysMountedParam !== 'only-after-open') {
            expect(getPopup()).toBe(null);
          } else {
            expect(getPopup()).toBeInaccessible();
          }
        });
      });

      it('removes the popup when the animation finishes', async ({ skip }) => {
        // XXX: revisit after feedback from the team
        skip();

        if (isJSDOM) {
          skip();
        }

        const handleAnimationEnd = vi.fn();
        const animationName = `anim-${randomStringValue()}`;

        function Test(props: { open: boolean }) {
          const style = `
            @keyframes ${animationName} {
              to {
                opacity: 0;
              }
            }

            .animation-test-popup-${animationName}[data-open] {
              opacity: 1;
            }

            .animation-test-popup-${animationName}[data-ending-style] {
              animation: ${animationName} 150ms;
            }
          `;

          return (
            <div>
              {/* eslint-disable-next-line solid/no-innerhtml */}
              <style innerHTML={style} />
              {prepareComponent({
                get root() {
                  return { open: props.open };
                },
                portal: { keepMounted: true },
                popup: {
                  class: `animation-test-popup-${animationName}`,
                  onAnimationEnd: handleAnimationEnd,
                },
              })}
            </div>
          );
        }

        // Port note: `setProps` is a signal update.
        const [open, setOpen] = createSignal(true);
        await renderElement(() => <Test open={open()} />);
        setOpen(false);
        await flushMicrotasks();

        await waitFor(() => {
          const popup = getPopup();
          expect(popup).not.toBe(null);
          expect(popup).toBeInaccessible();
        });

        await waitFor(() => {
          expect(handleAnimationEnd).toHaveBeenCalledTimes(1);
        });
      });
    });
  });
}

function getTrigger() {
  return screen.getByTestId('trigger');
}

function getPopup() {
  return screen.queryByTestId('popup');
}

// Port note: counterpart of `@mui/internal-test-utils`' `randomStringValue`.
function randomStringValue() {
  return `s${Math.random().toString(36).slice(2)}`;
}

export interface PopupTestConfig {
  /**
   * A function that returns a JSX tree with a component to test.
   * Its parameters contain props to be spread on the component's parts.
   *
   * Port note: the parts' props are getters (`props.root`, …) that may change when the test
   * re-renders: read them in JSX (`<Menu.Root {...props.root} />`), don't destructure them.
   */
  createComponent: (props: TestedComponentProps) => JSX.Element;
  /**
   * How the popup is triggered.
   */
  triggerMouseAction: 'click' | 'hover';
  /**
   * Render function returned from `createRenderer`.
   */
  render: ReturnType<typeof createRenderer>['render'];
  /**
   * Expected `role` attribute of the popup element.
   */
  expectedPopupRole?: string;
  /**
   * Expected `aria-haspopup` attribute of the trigger element.
   */
  expectedAriaHasPopupValue?: string;
  /**
   * Whether the popup contents are always present in the DOM.
   */
  alwaysMounted?: boolean | 'only-after-open';
  /**
   * Whether the popup is a combobox.
   */
  combobox?: boolean;
}

interface RootProps {
  open?: boolean;
  onOpenChange?: (open: boolean | null) => void;
}

interface TriggerProps {
  'data-testid'?: string;
}

// Port note: `class` instead of React's `className`.
interface PopupProps {
  class?: string;
  id?: string;
  'data-testid'?: string;
  onAnimationEnd?: () => void;
}

interface PortalProps {
  keepMounted?: boolean;
}

interface TestedComponentProps {
  root?: RootProps;
  popup?: PopupProps;
  trigger?: TriggerProps;
  portal?: PortalProps;
}
