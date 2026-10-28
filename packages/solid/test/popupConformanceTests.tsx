import { createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { UserEvent } from '@testing-library/user-event';
import { expect, vi, describe, it, afterEach, beforeEach } from 'vitest';
import { isJSDOM } from '@base-ui-solid/utils/testUtils';
import { flushMicrotasks, screen, waitFor } from './utils';
import type { createRenderer } from './createRenderer';
import { enterWithMouse } from './pointer';
import { REASONS } from '../src/internals/reasons';

// Port note: upstream renders the `onOpenChangeComplete` tests without React's StrictMode, whose
// effect replays report an instant open completion twice. Solid has no StrictMode, so every test
// renders the same way.

export function popupConformanceTests(config: PopupTestConfig) {
  const {
    createComponent,
    triggerMouseAction,
    render: renderElement,
    expectedPopupRole,
    expectedAriaHasPopupValue = expectedPopupRole,
    alwaysMounted,
    combobox = false,
    exitAnimation = true,
    openReason = triggerMouseAction === 'click' ? REASONS.triggerPress : REASONS.triggerHover,
  } = config;

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
          // Hover-opened popups open right away, so the tests don't depend on timers.
          ...(triggerMouseAction === 'hover' ? { delay: 0 } : {}),
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

    const utils = await renderElement(() => prepareComponent(props));

    return {
      ...utils,
      async rerender(nextProps: TestedComponentProps) {
        setCurrentProps({ value: nextProps });
        await flushMicrotasks();
      },
    };
  }

  const openWithTrigger = async (user: UserEvent) => {
    const trigger = getTrigger();
    if (triggerMouseAction === 'click') {
      await user.click(trigger);
    } else {
      enterWithMouse(trigger);
      await flushMicrotasks();
    }
  };

  // Popups that stay mounted after opening are hidden instead of removed when they close.
  const expectPopupClosed = () => {
    if (alwaysMounted) {
      expect(getPopup()).toBeInaccessible();
    } else {
      expect(getPopup()).toBe(null);
    }
  };

  describe('Popup conformance', () => {
    describe('controlled mode', () => {
      it('opens the popup with the `open` prop', async () => {
        const { rerender } = await render({ root: { open: false } });
        expect(getPopup()).toBe(null);

        await rerender({ root: { open: true } });
        expect(getPopup()).not.toBe(null);
      });
    });

    describe('prop: defaultOpen', () => {
      it('opens initially and remains uncontrolled', async () => {
        const { user } = await render({ root: { defaultOpen: true } });
        // Port note: Floating UI resolves positioning asynchronously after Solid mounts the popup.
        expect(getPopup()).not.toBe(null);
        await waitFor(() => {
          expect(getPopup()).toBeVisible();
        });

        await user.keyboard('[Escape]');
        await waitFor(expectPopupClosed);
      });

      it('is ignored when `open={false}` is passed', async () => {
        await render({ root: { defaultOpen: true, open: false } });
        expect(getPopup()).toBe(null);
      });

      it('is ignored when `open={true}` is passed, so Escape cannot close', async () => {
        const { user } = await render({ root: { defaultOpen: true, open: true } });
        // Port note: Floating UI resolves positioning asynchronously after Solid mounts the popup.
        expect(getPopup()).not.toBe(null);
        await waitFor(() => {
          expect(getPopup()).toBeVisible();
        });

        await user.keyboard('[Escape]');
        await flushMicrotasks();
        expect(getPopup()).toBeVisible();
      });
    });

    describe('prop: onOpenChange', () => {
      it('is called with the new open state and the change details', async () => {
        const handleOpenChange = vi.fn();
        const { user } = await render({ root: { onOpenChange: handleOpenChange } });
        expect(handleOpenChange).not.toHaveBeenCalled();

        await openWithTrigger(user);
        await waitFor(() => {
          expect(handleOpenChange).toHaveBeenCalledTimes(1);
        });
        await waitFor(() => {
          expect(getPopup()).toBeVisible();
        });
        expect(handleOpenChange).toHaveBeenCalledTimes(1);
        expect(handleOpenChange).toHaveBeenNthCalledWith(
          1,
          true,
          expect.objectContaining({ reason: openReason, trigger: getTrigger() }),
        );

        await user.keyboard('[Escape]');
        await waitFor(expectPopupClosed);
        expect(handleOpenChange).toHaveBeenCalledTimes(2);
        expect(handleOpenChange).toHaveBeenNthCalledWith(
          2,
          false,
          expect.objectContaining({ reason: REASONS.escapeKey }),
        );
      });

      it('keeps the popup closed when the open change is canceled', async () => {
        const handleOpenChange = vi.fn(
          (nextOpen: boolean, eventDetails: OpenChangeEventDetails) => {
            if (nextOpen) {
              eventDetails.cancel();
            }
          },
        );
        const { user } = await render({ root: { onOpenChange: handleOpenChange } });

        await openWithTrigger(user);
        await waitFor(() => {
          expect(handleOpenChange).toHaveBeenCalledTimes(1);
        });
        await flushMicrotasks();

        // The open request was made, so a missing popup proves `cancel()` prevented it.
        expect(handleOpenChange).toHaveBeenCalledTimes(1);
        expect(handleOpenChange).toHaveBeenNthCalledWith(
          1,
          true,
          expect.objectContaining({ reason: openReason }),
        );
        expectPopupClosed();
        expect(getTrigger()).not.toHaveAttribute('data-popup-open');
      });
    });

    if (expectedPopupRole || triggerMouseAction === 'click') {
      describe('ARIA attributes', () => {
        if (expectedPopupRole) {
          it(`has the ${expectedPopupRole} role on the popup`, async () => {
            await render({ root: { open: true } });
            expect(getPopup()).toHaveAttribute('role', expectedPopupRole);
          });
        }

        if (triggerMouseAction === 'click') {
          it('has the `aria-controls` attribute on the trigger', async () => {
            await render({ root: { open: true } });
            const trigger = getTrigger();
            const popup = getPopup();
            expect(trigger).toHaveAttribute('aria-controls', popup?.id);
          });

          it('opens on trigger click and sets `aria-expanded` on the trigger', async () => {
            const { user } = await render({});
            const trigger = getTrigger();
            expect(getPopup()).toBe(null);
            expect(trigger).toHaveAttribute('aria-expanded', 'false');
            await user.click(trigger);
            // A combobox popup is the listbox itself; other popups mark the open state.
            const [openAttribute, openValue] = combobox ? ['role', 'listbox'] : ['data-open', ''];
            await waitFor(() => {
              expect(getPopup()).toHaveAttribute(openAttribute, openValue);
            });
            expect(trigger).toHaveAttribute('aria-expanded', 'true');
          });

          if (expectedAriaHasPopupValue) {
            it('has the `aria-haspopup` attribute on the trigger', async () => {
              const { rerender } = await render({ root: { open: false } });
              expect(getTrigger()).toHaveAttribute('aria-haspopup', expectedAriaHasPopupValue);

              await rerender({ root: { open: true } });
              expect(getTrigger()).toHaveAttribute('aria-haspopup', expectedAriaHasPopupValue);
            });
          }

          it('allows a custom `id` prop', async () => {
            await render({ root: { open: true }, popup: { id: 'TestId' } });
            expect(getPopup()).toHaveAttribute('id', 'TestId');
            expect(getTrigger()).toHaveAttribute('aria-controls', 'TestId');
          });
        }
      });
    }

    describe('prop: onOpenChangeComplete without animations', () => {
      it('is called on open in the commit that mounts the popup', async () => {
        // Port note: upstream counts React commits with `React.Profiler`. A Solid flush applies the
        // DOM update and runs its effects in one task, and a mutation observer is notified after
        // it, so the completion must have been reported by the time the popup is seen in the DOM.
        let completedWhenMounted: boolean | null = null;
        const onOpenChangeComplete = vi.fn();

        const { rerender } = await render({ root: { open: false, onOpenChangeComplete } });
        const observer = new MutationObserver(() => {
          if (completedWhenMounted === null && getPopup() !== null) {
            completedWhenMounted = onOpenChangeComplete.mock.calls.some(([open]) => open);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        try {
          await rerender({ root: { open: true, onOpenChangeComplete } });
          await waitFor(() => {
            expect(onOpenChangeComplete).toHaveBeenCalledWith(true);
          });
        } finally {
          observer.disconnect();
        }

        expect(completedWhenMounted).toBe(true);
      });
    });

    describe.skipIf(isJSDOM)('prop: onOpenChangeComplete', () => {
      afterEach(() => {
        globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
      });

      it('is not called on mount when closed', async () => {
        const onOpenChangeComplete = vi.fn();
        await render({ root: { onOpenChangeComplete } });

        expect(onOpenChangeComplete).not.toHaveBeenCalled();
      });

      it('is called on open when there is no enter animation', async () => {
        const onOpenChangeComplete = vi.fn();
        const { rerender } = await render({ root: { open: false, onOpenChangeComplete } });

        await rerender({ root: { open: true, onOpenChangeComplete } });
        await waitFor(() => {
          expect(onOpenChangeComplete).toHaveBeenCalled();
        });
        await flushMicrotasks();
        expect(onOpenChangeComplete.mock.calls).toEqual([[true]]);
      });

      it('is called on close when there is no exit animation', async () => {
        const onOpenChangeComplete = vi.fn();
        const { rerender } = await render({ root: { open: true, onOpenChangeComplete } });

        await rerender({ root: { open: false, onOpenChangeComplete } });
        await waitFor(expectPopupClosed);
        await waitFor(() => {
          expect(onOpenChangeComplete).toHaveBeenLastCalledWith(false);
        });
        expect(onOpenChangeComplete.mock.calls).toEqual([[true], [false]]);
      });

      if (exitAnimation) {
        const animationName = `anim-${randomStringValue()}`;
        const className = `open-change-complete-${animationName}`;

        function AnimatedPopup(props: { open: boolean; onOpenChangeComplete: () => void }) {
          // Enter and exit use different keyframes: swapping the selector while keeping the
          // same animation name doesn't restart the animation.
          const style = `
            @keyframes ${animationName}-enter {
              from {
                opacity: 0;
              }
            }

            @keyframes ${animationName}-exit {
              to {
                opacity: 0;
              }
            }

            .${className}[data-open] {
              animation: ${animationName}-enter 200ms;
            }

            .${className}[data-ending-style] {
              animation: ${animationName}-exit 200ms;
            }
          `;

          return (
            <div>
              {/* eslint-disable-next-line solid/no-innerhtml */}
              <style innerHTML={style} />
              {prepareComponent({
                get root() {
                  return { open: props.open, onOpenChangeComplete: props.onOpenChangeComplete };
                },
                popup: { class: className },
              })}
            </div>
          );
        }

        // Port note: counterpart of upstream's `render(<AnimatedPopup />)` and `setProps`: the
        // `open` prop is held in a signal.
        async function renderAnimatedPopup(initialOpen: boolean, onOpenChangeComplete: () => void) {
          const [open, setOpen] = createSignal(initialOpen);
          const utils = await renderElement(() => (
            <AnimatedPopup open={open()} onOpenChangeComplete={onOpenChangeComplete} />
          ));
          return {
            ...utils,
            async setProps(nextProps: { open: boolean }) {
              setOpen(nextProps.open);
              await flushMicrotasks();
            },
          };
        }

        const isAnimating = () =>
          getPopup()!
            .getAnimations()
            .some((animation) => animation.playState === 'running');

        it('is called on open once the enter animation finishes', async () => {
          globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
          const onOpenChangeComplete = vi.fn();
          const { setProps } = await renderAnimatedPopup(false, onOpenChangeComplete);

          await setProps({ open: true });
          await waitFor(() => {
            expect(isAnimating()).toBe(true);
          });
          // Read synchronously after the check above: the animation is still running.
          expect(onOpenChangeComplete).not.toHaveBeenCalled();

          await waitFor(() => {
            expect(onOpenChangeComplete).toHaveBeenCalled();
          });
          expect(onOpenChangeComplete.mock.calls).toEqual([[true]]);
        });

        it('is called on close once the exit animation finishes', async () => {
          globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
          const onOpenChangeComplete = vi.fn();
          const { setProps } = await renderAnimatedPopup(true, onOpenChangeComplete);
          await waitFor(() => {
            expect(onOpenChangeComplete).toHaveBeenCalled();
          });
          onOpenChangeComplete.mockClear();

          await setProps({ open: false });
          await waitFor(() => {
            expect(getPopup()).toHaveAttribute('data-ending-style');
          });
          await waitFor(() => {
            expect(isAnimating()).toBe(true);
          });
          expect(onOpenChangeComplete).not.toHaveBeenCalled();

          await waitFor(expectPopupClosed);
          expect(onOpenChangeComplete.mock.calls).toEqual([[false]]);
        });
      }
    });

    describe('animations', () => {
      beforeEach(() => {
        globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
      });

      afterEach(() => {
        globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
      });

      it.skipIf(isJSDOM)('removes the popup when there is no exit animation defined', async () => {
        const { rerender } = await render({ root: { open: true } });

        await waitFor(() => {
          expect(getPopup()).not.toBe(null);
        });

        await rerender({ root: { open: false } });
        await waitFor(expectPopupClosed);
      });

      it.skipIf(isJSDOM || !exitAnimation)(
        'hides the kept-mounted popup once the exit animation finishes',
        async () => {
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
                  // Popups that stay mounted after opening don't accept `keepMounted`.
                  portal: alwaysMounted ? {} : { keepMounted: true },
                  popup: {
                    class: `animation-test-popup-${animationName}`,
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

          // The popup stays visible while the exit animation runs...
          await waitFor(() => {
            expect(getPopup()).toHaveAttribute('data-ending-style');
          });
          expect(getPopup()!.getAnimations()).not.toHaveLength(0);
          expect(getPopup()).not.toBeInaccessible();

          // ...and is hidden once it finishes.
          await waitFor(() => {
            expect(getPopup()).toBeInaccessible();
          });
        },
      );
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
   * Set to `'only-after-open'` when the popup stays mounted (inaccessible) after it first closes.
   */
  alwaysMounted?: 'only-after-open';
  /**
   * Whether the popup is a combobox.
   */
  combobox?: boolean;
  /**
   * Whether the element receiving the `popup` props plays the enter and exit animations.
   * @default true
   */
  exitAnimation?: boolean;
  /**
   * The `reason` passed to `onOpenChange` when the trigger opens the popup.
   * @default 'trigger-press' for click triggers, 'trigger-hover' for hover triggers
   */
  openReason?: string;
}

interface OpenChangeEventDetails {
  reason: string;
  cancel: () => void;
}

interface RootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
}

interface TriggerProps {
  'data-testid'?: string;
  delay?: number;
}

// Port note: `class` instead of React's `className`.
interface PopupProps {
  class?: string;
  id?: string;
  'data-testid'?: string;
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
