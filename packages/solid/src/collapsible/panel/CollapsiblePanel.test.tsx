import { expect, describe, it } from 'vitest';
import { createSignal, flush } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import {
  fireEvent,
  flushMicrotasks,
  render,
  screen,
  waitFor,
  waitForAnimationFrame,
  describeConformance,
  isJSDOM,
  renderToString,
} from '#test-utils';
import { Collapsible } from '..';
import {
  OpenPanelWithInlineAnimation,
  OpenPanelWithStylesheetAnimation,
} from './CollapsiblePanel.fixtures';
import { REASONS } from '../../internals/reasons';

const PANEL_CONTENT = 'This is panel content';

function fireBeforeMatch(element: Element) {
  fireEvent(
    element,
    new window.Event('beforematch', {
      bubbles: true,
      cancelable: false,
    }),
  );
}

/**
 * Counterpart of the `act` that wraps upstream's `await waitForAnimationFrame()`: React applies
 * the updates made in an animation frame in a later task, which `act` waits for.
 */
async function flushFrameUpdates() {
  await new Promise((resolve) => {
    setTimeout(resolve);
  });
  await flushMicrotasks();
}

// Port note: upstream's `fireEvent` is wrapped in React's `act`, which applies the resulting
// updates synchronously. Solid batches them until the next microtask, so tests that assert
// synchronously after an event call `flush()` (the `act` equivalent).

describe('<Collapsible.Panel />', () => {
  describeConformance(Collapsible.Panel, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => <Collapsible.Root defaultOpen>{node()}</Collapsible.Root>,
  });

  it('warns when hiddenUntilFound overrides keepMounted={false}', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      await render(() => (
        <Collapsible.Root>
          <Collapsible.Panel hiddenUntilFound keepMounted={false}>
            {PANEL_CONTENT}
          </Collapsible.Panel>
        </Collapsible.Root>
      ));

      expect(warnSpy).toHaveBeenCalledWith(
        'Base UI: The `keepMounted={false}` prop on `Collapsible.Panel` is ignored when `hiddenUntilFound` is enabled, since the panel must remain mounted while closed.',
      );
      expect(screen.getByText(PANEL_CONTENT).getAttribute('hidden')).toBe('until-found');
    } finally {
      warnSpy.mockRestore();
    }
  });

  describe('prop: keepMounted', () => {
    it('does not unmount the panel when true', async () => {
      const [open, setOpen] = createSignal(false);

      await render(() => (
        <Collapsible.Root open={open()} onOpenChange={setOpen}>
          <Collapsible.Trigger />
          <Collapsible.Panel keepMounted>{PANEL_CONTENT}</Collapsible.Panel>
        </Collapsible.Root>
      ));

      const trigger = screen.getByRole('button');

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT)).not.toBe(null);
      expect(screen.queryByText(PANEL_CONTENT)).not.toBeVisible();
      expect(screen.queryByText(PANEL_CONTENT)).toHaveAttribute('data-closed');

      fireEvent.click(trigger);
      await flushMicrotasks();

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger.getAttribute('aria-controls')).toBe(
        screen.queryByText(PANEL_CONTENT)?.getAttribute('id'),
      );
      expect(screen.queryByText(PANEL_CONTENT)).toBeVisible();
      expect(screen.queryByText(PANEL_CONTENT)).toHaveAttribute('data-open');
      expect(trigger).toHaveAttribute('data-panel-open');

      fireEvent.click(trigger);
      await flushMicrotasks();

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger.getAttribute('aria-controls')).toBe(null);
      expect(screen.queryByText(PANEL_CONTENT)).not.toBeVisible();
      expect(screen.queryByText(PANEL_CONTENT)).toHaveAttribute('data-closed');
    });

    it.skipIf(isJSDOM)(
      'hides the panel after external controlled close when true and no animations are applied',
      async () => {
        const [open, setOpen] = createSignal(false);

        const { user } = await render(() => (
          <>
            <Collapsible.Root open={open()} onOpenChange={setOpen}>
              <Collapsible.Trigger>Trigger</Collapsible.Trigger>
              <Collapsible.Panel keepMounted>{PANEL_CONTENT}</Collapsible.Panel>
            </Collapsible.Root>

            <button type="button" onClick={() => setOpen(!open())}>
              toggle externally
            </button>
          </>
        ));

        const trigger = screen.getByRole('button', { name: 'Trigger' });
        const externalTrigger = screen.getByRole('button', {
          name: 'toggle externally',
        });
        const panel = screen.getByText(PANEL_CONTENT);

        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(panel).toHaveAttribute('hidden');
        expect(panel).toHaveAttribute('data-closed');
        expect(panel).not.toHaveAttribute('data-ending-style');

        await user.click(externalTrigger);

        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(panel).not.toHaveAttribute('hidden');
        expect(panel).toHaveAttribute('data-open');

        await user.click(externalTrigger);

        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(panel).toHaveAttribute('hidden');
        expect(panel).toHaveAttribute('data-closed');
        expect(panel).not.toHaveAttribute('data-ending-style');
      },
    );
  });

  it('unmounts a panel that mounts after the close has already entered the ending phase', async () => {
    const renderedStatuses: Array<Collapsible.Panel.State['transitionStatus']> = [];

    await render(() => (
      <Collapsible.Root defaultOpen>
        <Collapsible.Trigger>Trigger</Collapsible.Trigger>
        <Collapsible.Panel
          render={(props, state) => {
            // Solid renders once, so track the statuses reactively instead of per render.
            return (
              <>
                {(renderedStatuses.push(state.transitionStatus), null)}
                {state.open || state.transitionStatus === 'ending' ? <div {...props} /> : null}
              </>
            );
          }}
        >
          {PANEL_CONTENT}
        </Collapsible.Panel>
      </Collapsible.Root>
    ));

    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }));

    await waitForAnimationFrame();
    await flushFrameUpdates();

    expect(renderedStatuses).toContain('ending');
    expect(screen.queryByText(PANEL_CONTENT)).toBe(null);
  });

  describe.skipIf(isJSDOM)('CSS transitions', () => {
    it('applies data-starting-style while opening', async () => {
      await render(() => (
        <>
          <style>{`
            .transition-test-panel {
              overflow: hidden;
              height: var(--collapsible-panel-height);
              transition: height 100ms linear;
            }

            .transition-test-panel[data-starting-style],
            .transition-test-panel[data-ending-style] {
              height: 0;
            }
          `}</style>

          <Collapsible.Root>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel class="transition-test-panel" data-testid="panel">
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });

      // Keep this synchronous so the transient starting-style render is observable.
      fireEvent.click(trigger);
      flush();

      const panel = screen.getByTestId('panel');

      expect(panel).toHaveAttribute('data-starting-style');
      expect(panel).toHaveAttribute('data-open');
    });

    it('restores a measured height before applying closing transition styles', async () => {
      const { user } = await render(() => (
        <>
          <style>{`
            .transition-test-panel {
              overflow: hidden;
              height: var(--collapsible-panel-height);
              transition: height 100ms linear;
            }

            .transition-test-panel[data-ending-style] {
              height: 0;
            }
          `}</style>

          <Collapsible.Root defaultOpen>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel class="transition-test-panel" data-testid="panel">
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      const panel = screen.getByTestId('panel');

      await waitFor(() => {
        expect(panel.style.getPropertyValue('--collapsible-panel-height')).toBe('auto');
      });

      await user.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-ending-style');
        expect(panel.style.getPropertyValue('--collapsible-panel-height')).toMatch(/px$/);
      });
    });

    it('unmounts a zero-size panel without waiting for unrelated transitions', async () => {
      await render(() => (
        <>
          <style>{`
            .zero-size-panel {
              overflow: hidden;
              width: 0;
              height: 0;
              opacity: 1;
              transition: opacity 10s linear;
            }

            .zero-size-panel[data-ending-style] {
              opacity: 0;
            }
          `}</style>

          <Collapsible.Root defaultOpen>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel class="zero-size-panel" data-testid="panel" />
          </Collapsible.Root>
        </>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });

      expect(screen.getByTestId('panel')).toHaveAttribute('data-open');

      fireEvent.click(trigger);
      await waitForAnimationFrame();
      await flushFrameUpdates();

      expect(screen.queryByTestId('panel')).toBe(null);
    });

    it('supports removing the rendered panel as it closes', async () => {
      const onOpenChange = vi.fn();

      const { user } = await render(() => (
        <Collapsible.Root defaultOpen onOpenChange={onOpenChange}>
          <Collapsible.Trigger>Trigger</Collapsible.Trigger>
          <Collapsible.Panel
            render={(props, state) => <>{state.open ? <div {...props} /> : null}</>}
            style={{ transition: 'height 100ms linear' }}
          >
            {PANEL_CONTENT}
          </Collapsible.Panel>
        </Collapsible.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });

      expect(screen.getByText(PANEL_CONTENT)).toHaveAttribute('data-open');

      await user.click(trigger);
      await waitForAnimationFrame();
      await flushFrameUpdates();

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(PANEL_CONTENT)).toBe(null);
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    });

    it('preserves inline alignment styles while measuring an opening panel', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        await render(() => (
          <>
            <style>{`
              @keyframes panel-fade-in {
                from {
                  opacity: 0;
                }

                to {
                  opacity: 1;
                }
              }

              .mixed-motion-panel {
                height: var(--collapsible-panel-height);
                transition: height 100ms linear;
                animation: panel-fade-in 100ms linear;
              }

              .mixed-motion-panel[data-starting-style] {
                height: 0;
              }
            `}</style>

            <Collapsible.Root>
              <Collapsible.Trigger>Trigger</Collapsible.Trigger>
              <Collapsible.Panel
                class="mixed-motion-panel"
                data-testid="panel"
                keepMounted
                style={{ 'justify-content': 'center' }}
              >
                {PANEL_CONTENT}
              </Collapsible.Panel>
            </Collapsible.Root>
          </>
        ));

        const trigger = screen.getByRole('button', { name: 'Trigger' });
        const panel = screen.getByTestId('panel');

        fireEvent.click(trigger);
        flush();

        expect(panel).toHaveAttribute('data-starting-style');
        expect(panel.style.getPropertyValue('justify-content')).toBe('initial');
        expect(panel.style.getPropertyPriority('justify-content')).toBe('important');
        expect(warnSpy).toHaveBeenCalledWith(
          'Base UI: CSS transitions and CSS animations both detected on Collapsible or Accordion panel. Only one of either animation type should be used.',
        );

        await waitForAnimationFrame();
        await flushFrameUpdates();

        expect(panel.style.justifyContent).toBe('center');
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('keeps exit transitions working after a close is interrupted by reopening', async () => {
      // Keep the close running long enough for a slow run to interrupt it. Without animations,
      // `data-ending-style` only lasts a frame and `waitFor` can miss it.
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
      const { user } = await render(() => (
        <>
          <style>{`
            .interruptible-panel {
              overflow: hidden;
              height: var(--collapsible-panel-height);
              transition: height 10s linear;
            }

            .interruptible-panel[data-starting-style],
            .interruptible-panel[data-ending-style] {
              height: 0;
            }
          `}</style>

          <Collapsible.Root defaultOpen>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel class="interruptible-panel" data-testid="panel">
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      const panel = screen.getByTestId('panel');

      await user.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-ending-style');
      });

      await user.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-open');
      });
      await waitFor(() => {
        expect(panel).not.toHaveAttribute('data-starting-style');
      });

      fireEvent.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-ending-style');
      });
      expect(screen.getByTestId('panel')).toBe(panel);
    });

    it('keeps the measured size when an open animation finishes during a close commit', async () => {
      const animationsDisabled = globalThis.BASE_UI_ANIMATIONS_DISABLED;
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort').mockImplementation(() => {});
      let animationStarted = false;
      const animation = new Animation(new KeyframeEffect(null, [], 10_000), document.timeline);
      animation.play();

      function ResolveAnimationOnClose(props: { open: boolean }) {
        useIsoLayoutEffect(
          ([open]) => {
            if (!open && animationStarted) {
              animation.finish();
            }
          },
          () => [props.open],
        );

        return null;
      }

      const setPanelRef = (node: HTMLDivElement | null) => {
        if (node) {
          node.getAnimations = () => {
            if (node.hasAttribute('data-open')) {
              animationStarted = true;
              return [animation];
            }

            return [];
          };
        }
      };

      try {
        await render(() => (
          <Collapsible.Root defaultOpen>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel
              ref={setPanelRef}
              keepMounted
              render={(props, state) => (
                <div {...props}>
                  <ResolveAnimationOnClose open={state.open} />
                  {props.children}
                </div>
              )}
              style={{ transition: 'height 10s linear' }}
            >
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        ));

        const panel = screen.getByText(PANEL_CONTENT);

        await waitForAnimationFrame();
        await flushFrameUpdates();
        expect(animationStarted).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: 'Trigger' }));
        await flushMicrotasks();

        expect(panel.style.getPropertyValue('--collapsible-panel-height')).toMatch(/px$/);
      } finally {
        animation.cancel();
        abortSpy.mockRestore();
        globalThis.BASE_UI_ANIMATIONS_DISABLED = animationsDisabled;
      }
    });

    it('does not restart the entrance transition when a close animation finishes after reopening', async () => {
      const animationsDisabled = globalThis.BASE_UI_ANIMATIONS_DISABLED;
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort').mockImplementation(() => {});
      let closeAnimationStarted = false;
      const closeAnimation = new Animation(new KeyframeEffect(null, [], 10_000), document.timeline);
      closeAnimation.play();

      const setPanelRef = (node: HTMLDivElement | null) => {
        if (node) {
          node.getAnimations = () => {
            if (node.hasAttribute('data-ending-style')) {
              closeAnimationStarted = true;
              return [closeAnimation];
            }

            return [];
          };
        }
      };

      try {
        await render(() => (
          <Collapsible.Root defaultOpen>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel ref={setPanelRef} style={{ transition: 'height 10s linear' }}>
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        ));

        const trigger = screen.getByRole('button', { name: 'Trigger' });
        const panel = screen.getByText(PANEL_CONTENT);

        fireEvent.click(trigger);
        await waitFor(() => {
          expect(closeAnimationStarted).toBe(true);
        });

        fireEvent.click(trigger);
        await waitFor(() => {
          expect(panel).toHaveAttribute('data-open');
        });
        await waitFor(() => {
          expect(panel).not.toHaveAttribute('data-starting-style');
        });

        closeAnimation.finish();
        await flushMicrotasks();

        expect(panel).toHaveAttribute('data-open');
        expect(panel).not.toHaveAttribute('data-starting-style');
        expect(screen.getByText(PANEL_CONTENT)).toBe(panel);
      } finally {
        closeAnimation.cancel();
        abortSpy.mockRestore();
        globalThis.BASE_UI_ANIMATIONS_DISABLED = animationsDisabled;
      }
    });
  });

  describe.skipIf(isJSDOM)('CSS animations', () => {
    it('does not run the mount animation when initially open', async () => {
      await render(() => (
        <>
          <style>{`
            @keyframes panel-slide-down {
              from {
                height: 0;
              }

              to {
                height: var(--collapsible-panel-height);
              }
            }

            .animation-test-panel[data-open] {
              overflow: hidden;
              animation: panel-slide-down 100ms linear;
            }
          `}</style>

          <Collapsible.Root defaultOpen>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel class="animation-test-panel" data-testid="panel">
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const panel = screen.getByTestId('panel');

      expect(panel).toHaveAttribute('data-open');
      expect(panel.getAnimations().length).toBe(0);
      expect(getComputedStyle(panel).animationName).toBe('none');
    });

    it('still animates on close and reopen after being initially open', async () => {
      const { user } = await render(() => (
        <>
          <style>{`
            @keyframes panel-slide-down {
              from {
                height: 0;
              }

              to {
                height: var(--collapsible-panel-height);
              }
            }

            @keyframes panel-slide-up {
              from {
                height: var(--collapsible-panel-height);
              }

              to {
                height: 0;
              }
            }

            .animation-test-panel[data-open] {
              overflow: hidden;
              animation: panel-slide-down 100ms linear;
            }

            .animation-test-panel[data-closed] {
              overflow: hidden;
              animation: panel-slide-up 100ms linear;
            }
          `}</style>

          <Collapsible.Root defaultOpen>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel class="animation-test-panel" data-testid="panel" keepMounted>
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      const panel = screen.getByTestId('panel');

      expect(panel.getAnimations().length).toBe(0);

      await user.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-closed');
        expect(panel.getAnimations().length).toBe(1);
      });

      await user.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-open');
        expect(panel.getAnimations().length).toBe(1);
      });
    });

    it('restores measured dimensions before applying a closing keyframe animation', async () => {
      const { user } = await render(() => (
        <>
          <style>{`
            @keyframes panel-slide-up {
              from {
                height: var(--collapsible-panel-height);
              }

              to {
                height: 0;
              }
            }

            .closing-animation-panel[data-closed] {
              overflow: hidden;
              animation: panel-slide-up 100ms linear;
            }
          `}</style>

          <Collapsible.Root defaultOpen>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel class="closing-animation-panel" data-testid="panel">
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      const panel = screen.getByTestId('panel');

      await waitFor(() => {
        expect(panel.style.getPropertyValue('--collapsible-panel-height')).toBe('auto');
      });

      await user.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-ending-style');
        expect(panel.style.getPropertyValue('--collapsible-panel-height')).toMatch(/px$/);
        expect(panel.getAnimations().length).toBe(1);
      });
    });

    it('still animates on reopen after being initially open when only open keyframes are defined', async () => {
      const { user } = await render(() => (
        <>
          <style>{`
            @keyframes panel-slide-down {
              from {
                height: 0;
              }

              to {
                height: var(--collapsible-panel-height);
              }
            }

            .animation-test-panel[data-open] {
              overflow: hidden;
              animation: panel-slide-down 100ms linear;
            }
          `}</style>

          <Collapsible.Root defaultOpen>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel class="animation-test-panel" data-testid="panel" keepMounted>
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      const panel = screen.getByTestId('panel');

      expect(panel.getAnimations().length).toBe(0);

      await user.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-closed');
      });

      await user.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-open');
        expect(panel.getAnimations().length).toBe(1);
      });
    });
  });

  describe('server-side rendering', () => {
    it('suppresses the initial keyframe animation when rendered open', async () => {
      await renderToString(OpenPanelWithStylesheetAnimation);

      expect(screen.getByTestId('panel').style.animationName).toBe('none');
    });

    it('suppresses the initial keyframe animation from inline styles when rendered open', async () => {
      await renderToString(OpenPanelWithInlineAnimation);

      const panel = screen.getByTestId('panel');

      expect(panel.style.animationName).toBe('none');
      expect(panel.style.animationDuration).toBe('100ms');
    });
  });

  describe('React.Activity', () => {
    // React-only: React.Activity has no Solid equivalent.
    it.skip('does not replay open transitions when revealing an initially open panel', () => {});
    // React-only: React.Activity has no Solid equivalent.
    it.skip('does not replay open transitions when revealing a panel opened by the user', () => {});
    // React-only: React.Activity has no Solid equivalent.
    it.skip('does not replay open keyframe animations when revealing an initially open panel', () => {});
    // React-only: React.Activity has no Solid equivalent.
    it.skip('does not replay open keyframe animations when revealing a panel opened by the user', () => {});
    // React-only: React.Activity has no Solid equivalent.
    it.skip('does not replay open keyframe animations from inline styles when revealing a panel opened by the user', () => {});
  });

  // Port note: upstream condition `reactMajor < 19` is React-only (React < 19 lacks `hidden="until-found"` support).
  describe.skipIf(isJSDOM || !('onbeforematch' in window))('interrupted beforematch opens', () => {
    it('keeps the temporary zero animation duration until the panel closes', async () => {
      const { user } = await render(() => (
        <>
          <style>{`
            @keyframes panel-slide-down {
              from {
                height: 0;
              }

              to {
                height: var(--collapsible-panel-height);
              }
            }

            @keyframes panel-slide-up {
              from {
                height: var(--collapsible-panel-height);
              }

              to {
                height: 0;
              }
            }

            .animation-test-panel {
              overflow: hidden;
              animation-duration: 123ms;
            }

            .animation-test-panel[data-open] {
              animation-name: panel-slide-down;
            }

            .animation-test-panel[data-closed] {
              animation-name: panel-slide-up;
            }
          `}</style>

          <Collapsible.Root>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel
              class="animation-test-panel"
              data-testid="panel"
              hiddenUntilFound
              keepMounted
            >
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const panel = screen.getByTestId('panel');
      const trigger = screen.getByRole('button', { name: 'Trigger' });

      fireBeforeMatch(panel);
      flush();

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-open');
      });

      await waitForAnimationFrame();
      await waitForAnimationFrame();
      await flushFrameUpdates();

      expect(getComputedStyle(panel).animationDuration).toBe('0s');

      await user.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-closed');
        expect(panel.getAnimations().length).toBe(1);
      });

      expect(getComputedStyle(panel).animationDuration).toBe('0.123s');
    });

    it('restores the transition duration before the first close after a beforematch open', async () => {
      const { user } = await render(() => (
        <>
          <style>{`
            .transition-test-panel {
              overflow: hidden;
              height: var(--collapsible-panel-height);
              transition-property: height;
              transition-duration: 999ms;
              transition-timing-function: linear;
            }

            .transition-test-panel[data-starting-style],
            .transition-test-panel[data-ending-style] {
              height: 0;
            }
          `}</style>

          <Collapsible.Root>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel
              class="transition-test-panel"
              data-testid="panel"
              hiddenUntilFound
              keepMounted
              style={{ 'transition-duration': '123ms' }}
            >
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const panel = screen.getByTestId('panel');
      const trigger = screen.getByRole('button', { name: 'Trigger' });

      fireBeforeMatch(panel);
      flush();

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-open');
      });

      await waitForAnimationFrame();
      await waitForAnimationFrame();
      await flushFrameUpdates();

      expect(getComputedStyle(panel).transitionDuration).toBe('0s');

      await user.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-ending-style');
        expect(panel.style.transitionDuration).toBe('123ms');
        expect(panel.getAnimations().length).toBe(1);
      });
    });

    it('does not suppress a later animated open after a no-motion beforematch open', async () => {
      const [motionEnabled, setMotionEnabled] = createSignal(false);

      const { user } = await render(() => (
        <>
          <style>{`
            .transition-test-panel {
              overflow: hidden;
              height: var(--collapsible-panel-height);
              transition: height 100ms linear;
            }

            .transition-test-panel[data-starting-style],
            .transition-test-panel[data-ending-style] {
              height: 0;
            }
          `}</style>

          <button type="button" onClick={() => setMotionEnabled(true)}>
            enable motion
          </button>

          <Collapsible.Root>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel
              class={motionEnabled() ? 'transition-test-panel' : undefined}
              data-testid="panel"
              hiddenUntilFound
              keepMounted
              style={motionEnabled() ? { 'transition-duration': '123ms' } : undefined}
            >
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const panel = screen.getByTestId('panel');
      const trigger = screen.getByRole('button', { name: 'Trigger' });
      const enableMotion = screen.getByRole('button', {
        name: 'enable motion',
      });

      fireBeforeMatch(panel);
      flush();

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-open');
      });

      await user.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-closed');
      });

      await user.click(enableMotion);
      fireEvent.click(trigger);
      flush();

      expect(panel).toHaveAttribute('data-open');
      expect(panel.style.transitionDuration).toBe('123ms');
    });

    // React-only: React.Activity has no Solid equivalent.
    it.skip('restores the inline transition duration when an instant open is interrupted', () => {});

    it('does not keep a hidden transition running after a hiddenUntilFound panel closes', async () => {
      const { user } = await render(() => (
        <>
          <style>{`
            .transition-test-panel {
              overflow: hidden;
              height: var(--collapsible-panel-height);
              opacity: 1;
              transition:
                height 1000ms linear,
                opacity 1000ms linear;
            }

            .transition-test-panel[data-starting-style],
            .transition-test-panel[data-ending-style] {
              height: 0;
              opacity: 0;
            }
          `}</style>

          <Collapsible.Root>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel class="transition-test-panel" data-testid="panel" hiddenUntilFound>
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const panel = screen.getByTestId('panel');
      const trigger = screen.getByRole('button', { name: 'Trigger' });

      await user.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('data-open');
      });

      await user.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('hidden', 'until-found');
      });

      await waitForAnimationFrame();
      await waitForAnimationFrame();
      await flushFrameUpdates();

      expect(
        panel.getAnimations().filter((animation) => animation.playState !== 'finished').length,
      ).toBe(0);
      expect(getComputedStyle(panel).opacity).toBe('0');
    });
  });

  // we test firefox in browserstack which does not support this yet
  describe.skipIf(!('onbeforematch' in window) || isJSDOM)('prop: hiddenUntilFound', () => {
    it('does not open or suppress the next trigger open when beforematch is canceled', async () => {
      const handleOpenChange = vi.fn(
        (nextOpen: boolean, eventDetails: Collapsible.Root.ChangeEventDetails) => {
          if (eventDetails.reason === REASONS.none) {
            eventDetails.cancel();
          }
        },
      );

      const { user } = await render(() => (
        <>
          <style>{`
            .transition-test-panel {
              overflow: hidden;
              height: var(--collapsible-panel-height);
              transition-property: height;
              transition-duration: 999ms;
              transition-timing-function: linear;
            }

            .transition-test-panel[data-starting-style],
            .transition-test-panel[data-ending-style] {
              height: 0;
            }
          `}</style>

          <Collapsible.Root onOpenChange={handleOpenChange}>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel
              class="transition-test-panel"
              data-testid="panel"
              hiddenUntilFound
              keepMounted
              // Verifies canceled beforematch does not install the temporary 0s override.
              style={{ 'transition-duration': '123ms' }}
            >
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const panel = screen.getByTestId('panel');
      const trigger = screen.getByRole('button', { name: 'Trigger' });

      fireBeforeMatch(panel);
      flush();
      // The browser drops `hidden` as part of revealing the match, regardless of
      // what the event handler decided.
      panel.removeAttribute('hidden');

      expect(handleOpenChange).toHaveBeenCalledOnce();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(panel).toHaveAttribute('data-closed');
      // A canceled reveal must leave the collapsed styles in place.
      expect(panel).toHaveAttribute('data-starting-style');
      expect(getComputedStyle(panel).height).toBe('0px');

      // A canceled reveal must also stay hidden and searchable.
      await waitFor(() => {
        expect(panel).toHaveAttribute('hidden', 'until-found');
      });

      await user.click(trigger);

      expect(handleOpenChange).toHaveBeenCalledTimes(2);
      expect(panel).toHaveAttribute('data-open');
      expect(panel.style.transitionDuration).toBe('123ms');
    });

    it('expands the panel while beforematch is being dispatched', async () => {
      await render(() => (
        <>
          <style>{`
            .transition-test-panel {
              overflow: hidden;
              height: var(--collapsible-panel-height);
              transition-property: height;
              transition-duration: 999ms;
              transition-timing-function: linear;
            }

            .transition-test-panel[data-starting-style],
            .transition-test-panel[data-ending-style] {
              height: 0;
            }
          `}</style>

          <Collapsible.Root>
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel class="transition-test-panel" data-testid="panel" hiddenUntilFound>
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const panel = screen.getByTestId('panel');

      expect(panel).toHaveAttribute('data-starting-style');

      let startingStyleWhenRevealed: boolean | undefined;
      let heightWhenRevealed: string | undefined;

      // Registered after the component's own listener, so this observes the panel
      // from where the browser does: the same task, once `beforematch` handling is
      // done. The browser drops `hidden` and measures the match there, and a panel
      // still holding its collapsed starting styles measures as zero-sized.
      panel.addEventListener('beforematch', () => {
        startingStyleWhenRevealed = panel.hasAttribute('data-starting-style');
        panel.removeAttribute('hidden');
        heightWhenRevealed = getComputedStyle(panel).height;
      });

      fireBeforeMatch(panel);

      expect(startingStyleWhenRevealed).toBe(false);
      expect(heightWhenRevealed).not.toBe('0px');
    });

    it('re-collapses the panel when the open state never arrives', async () => {
      const [open, setOpen] = createSignal(false);
      const [renderCount, forceRender] = createSignal(0);

      const { user } = await render(() => (
        <>
          <style>{`
            .transition-test-panel {
              overflow: hidden;
              height: var(--collapsible-panel-height);
              transition-property: height;
              transition-duration: 999ms;
              transition-timing-function: linear;
            }

            .transition-test-panel[data-starting-style],
            .transition-test-panel[data-ending-style] {
              height: 0;
            }
          `}</style>

          <button type="button" onClick={() => forceRender((value) => value + 1)}>
            Rerender
          </button>

          <Collapsible.Root
            // Port note: Solid has no re-render, so the "rerender" re-evaluates the `open` prop
            // expression (with the same value) instead.
            open={(renderCount(), open())}
            onOpenChange={(nextOpen, eventDetails) => {
              // Opts out of find-in-page reveals while still honoring the trigger.
              if (eventDetails.reason === REASONS.none) {
                return;
              }

              setOpen(nextOpen);
            }}
          >
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel
              class="transition-test-panel"
              data-testid="panel"
              hiddenUntilFound
              style={{ 'transition-duration': '123ms' }}
            >
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const panel = screen.getByTestId('panel');

      expect(panel).toHaveAttribute('data-starting-style');

      fireBeforeMatch(panel);
      flush();
      // The browser drops `hidden` as part of revealing the match.
      panel.removeAttribute('hidden');

      // The renderer keeps the same props while the panel stays closed, so it cannot
      // restore the collapsed styles or the `hidden` state on its own.
      await waitFor(() => {
        expect(panel).toHaveAttribute('hidden', 'until-found');
      });
      expect(panel).toHaveAttribute('data-starting-style');
      expect(getComputedStyle(panel).height).toBe('0px');

      await user.click(screen.getByRole('button', { name: 'Rerender' }));

      expect(panel).toHaveAttribute('data-starting-style');
      expect(getComputedStyle(panel).height).toBe('0px');

      // The reveal never opened the panel, so it must not consume the motion of the
      // next ordinary open.
      await user.click(screen.getByRole('button', { name: 'Trigger' }));

      expect(panel).toHaveAttribute('data-open');
      expect(getComputedStyle(panel).transitionDuration).toBe('0.123s');
    });

    it('re-collapses a keyframe panel when the open state never arrives', async () => {
      const [open, setOpen] = createSignal(false);

      const { user } = await render(() => (
        <>
          <style>{`
            @keyframes test-panel-slide-down {
              from { height: 0; }
              to { height: var(--collapsible-panel-height); }
            }

            @keyframes test-panel-slide-up {
              from { height: var(--collapsible-panel-height); }
              to { height: 0; }
            }

            .animation-test-panel {
              overflow: hidden;
            }

            .animation-test-panel[data-open] {
              animation: test-panel-slide-down 100ms ease-out;
            }

            .animation-test-panel[data-closed] {
              animation: test-panel-slide-up 100ms ease-in;
            }
          `}</style>

          <Collapsible.Root
            open={open()}
            onOpenChange={(nextOpen, eventDetails) => {
              // Opts out of find-in-page reveals while still honoring the trigger.
              if (eventDetails.reason === REASONS.none) {
                return;
              }

              setOpen(nextOpen);
            }}
          >
            <Collapsible.Trigger>Trigger</Collapsible.Trigger>
            <Collapsible.Panel class="animation-test-panel" data-testid="panel" hiddenUntilFound>
              {PANEL_CONTENT}
            </Collapsible.Panel>
          </Collapsible.Root>
        </>
      ));

      const panel = screen.getByTestId('panel');
      const trigger = screen.getByRole('button', { name: 'Trigger' });

      // A full open/close cycle reaches the steady state where the closed panel
      // no longer carries `data-starting-style` (keyframe panels only hold it
      // until the animation type has been detected).
      await user.click(trigger);
      await user.click(trigger);

      await waitFor(() => {
        expect(panel).toHaveAttribute('hidden', 'until-found');
      });
      expect(panel).not.toHaveAttribute('data-starting-style');

      fireBeforeMatch(panel);
      flush();
      // The browser drops `hidden` as part of revealing the match.
      panel.removeAttribute('hidden');

      // The panel returns to the fully closed state without gaining attributes
      // the renderer does not render for it.
      await waitFor(() => {
        expect(panel).toHaveAttribute('hidden', 'until-found');
      });
      expect(panel).not.toHaveAttribute('data-starting-style');

      // The reveal never opened the panel, so it must not consume the motion of
      // the next ordinary open.
      await user.click(trigger);

      expect(panel).toHaveAttribute('data-open');
      expect(getComputedStyle(panel).animationDuration).toBe('0.1s');
      expect(panel.getAnimations().length).toBeGreaterThan(0);
    });

    it('uses `hidden="until-found" to hide panel when true', async () => {
      const handleOpenChange = vi.fn();

      await render(() => (
        <Collapsible.Root defaultOpen={false} onOpenChange={handleOpenChange}>
          <Collapsible.Trigger />
          <Collapsible.Panel hiddenUntilFound keepMounted>
            {PANEL_CONTENT}
          </Collapsible.Panel>
        </Collapsible.Root>
      ));

      const panel = screen.getByText(PANEL_CONTENT);

      fireBeforeMatch(panel);
      flush();

      expect(handleOpenChange.mock.calls.length).toBe(1);
      expect(panel).toHaveAttribute('data-open');
    });
  });

  describe('children', () => {
    it('creates the children once across state changes', async () => {
      let created = 0;
      const Child = () => {
        created += 1;
        return <span>{PANEL_CONTENT}</span>;
      };

      const { user } = await render(() => (
        <Collapsible.Root>
          <Collapsible.Trigger>Trigger</Collapsible.Trigger>
          <Collapsible.Panel keepMounted>
            <Child />
          </Collapsible.Panel>
        </Collapsible.Root>
      ));

      const trigger = screen.getByRole('button', { name: 'Trigger' });
      await user.click(trigger);
      await user.click(trigger);

      expect(created).toBe(1);
    });
  });
});
