import { createSignal, For } from 'solid-js';
import { Checkbox } from '..';
import { CheckboxRootContext } from '../root/CheckboxRootContext';
import type { CheckboxRootState } from '../root/CheckboxRoot';
import { isJSDOM, render, screen, waitFor, describeConformance } from '#test-utils';

const testContext: CheckboxRootState = {
  checked: true,
  disabled: false,
  readOnly: false,
  required: false,
  indeterminate: false,
  dirty: false,
  touched: false,
  valid: null,
  filled: false,
  focused: false,
};

describe('<Checkbox.Indicator />', () => {
  beforeEach(() => {
    (globalThis as any).BASE_UI_ANIMATIONS_DISABLED = true;
  });

  describeConformance(Checkbox.Indicator, {
    refInstanceof: window.HTMLSpanElement,
    wrap: (node) => <CheckboxRootContext value={() => testContext}>{node()}</CheckboxRootContext>,
  });

  it('throws a descriptive error when rendered outside <Checkbox.Root>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(() => <Checkbox.Indicator />)).rejects.toThrow(
        'Base UI: CheckboxRootContext is missing. Checkbox parts must be placed within <Checkbox.Root>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('should not render indicator by default', async () => {
    await render(() => (
      <Checkbox.Root>
        <Checkbox.Indicator data-testid="indicator" />
      </Checkbox.Root>
    ));
    const indicator = screen.queryByTestId('indicator');
    expect(indicator).toBe(null);
  });

  it('should render indicator when checked', async () => {
    await render(() => (
      <Checkbox.Root checked>
        <Checkbox.Indicator data-testid="indicator" />
      </Checkbox.Root>
    ));
    const indicator = screen.getByTestId('indicator');
    expect(indicator).not.toBe(null);
  });

  it('should spread extra props', async () => {
    await render(() => (
      <Checkbox.Root defaultChecked>
        <Checkbox.Indicator data-testid="indicator" data-extra-prop="Lorem ipsum" />
      </Checkbox.Root>
    ));
    const indicator = screen.getByTestId('indicator');
    expect(indicator).toHaveAttribute('data-extra-prop', 'Lorem ipsum');
  });

  describe('prop: keepMounted', () => {
    it('should keep indicator mounted when unchecked', async () => {
      await render(() => (
        <Checkbox.Root>
          <Checkbox.Indicator data-testid="indicator" keepMounted />
        </Checkbox.Root>
      ));
      const indicator = screen.getByTestId('indicator');
      expect(indicator).not.toBe(null);
    });

    it('should keep indicator mounted when checked', async () => {
      await render(() => (
        <Checkbox.Root checked>
          <Checkbox.Indicator data-testid="indicator" keepMounted />
        </Checkbox.Root>
      ));
      const indicator = screen.getByTestId('indicator');
      expect(indicator).not.toBe(null);
    });

    it('should keep indicator mounted when indeterminate', async () => {
      await render(() => (
        <Checkbox.Root indeterminate>
          <Checkbox.Indicator data-testid="indicator" keepMounted />
        </Checkbox.Root>
      ));
      const indicator = screen.getByTestId('indicator');
      expect(indicator).not.toBe(null);
    });
  });

  it('should remove the indicator when there is no exit animation defined', async ({ skip }) => {
    if (isJSDOM) {
      skip();
    }

    const [checked, setChecked] = createSignal(true);

    const { user } = await render(() => (
      <div>
        <button onClick={() => setChecked(false)}>Close</button>
        <Checkbox.Root checked={checked()}>
          <Checkbox.Indicator data-testid="indicator" />
        </Checkbox.Root>
      </div>
    ));

    expect(screen.getByTestId('indicator')).not.toBe(null);

    const closeButton = screen.getByText('Close');

    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('indicator')).toBe(null);
    });
  });

  // requires a real browser (CSS animations)
  it.skipIf(isJSDOM)('should remove the indicator when the animation finishes', async () => {
    (globalThis as any).BASE_UI_ANIMATIONS_DISABLED = false;

    let animationFinished = false;
    const notifyAnimationFinished = () => {
      animationFinished = true;
    };

    const style = `
      @keyframes test-anim {
        to {
          opacity: 0;
        }
      }

      .animation-test-indicator[data-ending-style] {
        animation: test-anim 1ms;
      }
    `;

    const [checked, setChecked] = createSignal(true);

    const { user } = await render(() => (
      <div>
        <style innerHTML={style} />
        <button onClick={() => setChecked(false)}>Close</button>
        <Checkbox.Root checked={checked()}>
          <Checkbox.Indicator
            class="animation-test-indicator"
            data-testid="indicator"
            onAnimationEnd={notifyAnimationFinished}
            keepMounted
          />
        </Checkbox.Root>
      </div>
    ));
    expect(screen.getByTestId('indicator')).not.toBe(null);

    const closeButton = screen.getByText('Close');
    await user.click(closeButton);

    await waitFor(() => {
      expect(animationFinished).toBe(true);
    });
  });

  describe.skipIf(isJSDOM)('animations', () => {
    afterEach(() => {
      (globalThis as any).BASE_UI_ANIMATIONS_DISABLED = true;
    });

    it('triggers enter animation via data-starting-style when mounting', async () => {
      (globalThis as any).BASE_UI_ANIMATIONS_DISABLED = false;

      let transitionFinished = false;
      const getAnimations = vi.fn((): Animation[] => []);

      function notifyTransitionFinished() {
        transitionFinished = true;
      }

      function handleIndicatorRef(element: HTMLSpanElement | null) {
        if (element) {
          element.getAnimations = getAnimations;
        }
      }

      const style = `
        .animation-test-indicator {
          transition: opacity 1ms;
        }

        .animation-test-indicator[data-starting-style],
        .animation-test-indicator[data-ending-style] {
          opacity: 0;
        }
      `;

      const [checked, setChecked] = createSignal(false);

      const { user } = await render(() => (
        <div>
          <style innerHTML={style} />
          <button onClick={() => setChecked(true)}>Check</button>
          <Checkbox.Root checked={checked()}>
            <Checkbox.Indicator
              class="animation-test-indicator"
              data-testid="indicator"
              onTransitionEnd={notifyTransitionFinished}
              ref={handleIndicatorRef}
            />
          </Checkbox.Root>
        </div>
      ));
      expect(screen.queryByTestId('indicator')).toBe(null);

      await user.click(screen.getByText('Check'));

      await waitFor(() => {
        expect(transitionFinished).toBe(true);
      });

      expect(screen.getByTestId('indicator')).not.toBe(null);
      expect(getAnimations).not.toHaveBeenCalled();
    });

    it('applies data-ending-style before unmount', async () => {
      (globalThis as any).BASE_UI_ANIMATIONS_DISABLED = false;

      const style = `
        @keyframes test-anim {
          to {
            opacity: 0;
          }
        }

        .animation-test-indicator[data-ending-style] {
          animation: test-anim 1ms;
        }
      `;

      const [checked, setChecked] = createSignal(true);

      const { user } = await render(() => (
        <div>
          <style innerHTML={style} />
          <button onClick={() => setChecked(false)}>Uncheck</button>
          <Checkbox.Root checked={checked()}>
            <Checkbox.Indicator class="animation-test-indicator" data-testid="indicator" />
          </Checkbox.Root>
        </div>
      ));
      expect(screen.getByTestId('indicator')).not.toBe(null);

      await user.click(screen.getByText('Uncheck'));

      await waitFor(() => {
        const indicator = screen.queryByTestId('indicator');
        expect(indicator).not.toBe(null);
        expect(indicator).toHaveAttribute('data-ending-style');
      });

      await waitFor(() => {
        expect(screen.queryByTestId('indicator')).toBe(null);
      });
    });

    it('removes all indicators in a single commit when multiple checkboxes are unchecked', async () => {
      (globalThis as any).BASE_UI_ANIMATIONS_DISABLED = false;

      const style = `
        @keyframes test-anim {
          to {
            opacity: 0;
          }
        }

        .animation-test-indicator[data-ending-style] {
          animation: test-anim 1ms;
        }
      `;

      // Port note: upstream records the indicator count on every React commit through
      // `React.Profiler`. Solid has no commits, so every DOM mutation is observed instead.
      const indicatorCounts: number[] = [];
      const observer = new MutationObserver(() => {
        indicatorCounts.push(document.querySelectorAll('[data-testid^="indicator-"]').length);
      });

      const [checked, setChecked] = createSignal(true);

      const { user } = await render(() => (
        <div>
          <style innerHTML={style} />
          <button onClick={() => setChecked(false)}>Uncheck</button>
          <For each={Array.from({ length: 10 }, (_, index) => index)}>
            {(index) => (
              <Checkbox.Root checked={checked()}>
                <Checkbox.Indicator
                  class="animation-test-indicator"
                  data-testid={`indicator-${index}`}
                />
              </Checkbox.Root>
            )}
          </For>
        </div>
      ));

      observer.observe(document.body, { childList: true, subtree: true });

      try {
        await user.click(screen.getByText('Uncheck'));

        await waitFor(() => {
          expect(screen.queryByTestId('indicator-0')).toBe(null);
        });
        expect(screen.queryByTestId('indicator-9')).toBe(null);
        expect(indicatorCounts).toContain(0);
        expect(indicatorCounts.every((count) => count === 0 || count === 10)).toBe(true);
      } finally {
        observer.disconnect();
      }
    });
  });
});
