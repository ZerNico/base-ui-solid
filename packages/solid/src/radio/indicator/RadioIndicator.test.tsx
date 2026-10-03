import { createSignal, flush } from 'solid-js';
import { Radio } from '..';
import { RadioGroup } from '../../radio-group';
import { fireEvent, isJSDOM, render, screen, waitFor, describeConformance } from '#test-utils';

describe('<Radio.Indicator />', () => {
  beforeEach(() => {
    (globalThis as any).BASE_UI_ANIMATIONS_DISABLED = true;
  });

  describeConformance(Radio.Indicator, {
    refInstanceof: window.HTMLSpanElement,
    wrap: (node) => <Radio.Root value="">{node()}</Radio.Root>,
  });

  it('should remove the indicator when there is no exit animation defined', async ({ skip }) => {
    if (isJSDOM) {
      skip();
    }

    const [value, setValue] = createSignal('a');

    const { user } = await render(() => (
      <div>
        <button onClick={() => setValue('b')}>Close</button>
        <RadioGroup value={value()}>
          <Radio.Root value="a">
            <Radio.Indicator class="animation-test-indicator" data-testid="indicator-a" />
          </Radio.Root>
          <Radio.Root value="a">
            <Radio.Indicator class="animation-test-indicator" />
          </Radio.Root>
        </RadioGroup>
      </div>
    ));

    expect(screen.getByTestId('indicator-a')).not.toBe(null);

    const closeButton = screen.getByText('Close');

    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('indicator-a')).toBe(null);
    });
  });

  it.skipIf(isJSDOM)('should remove the indicator when the animation finishes', async () => {
    // requires a real browser
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

    const [value, setValue] = createSignal('a');

    const { user } = await render(() => (
      <div>
        <style innerHTML={style} />
        <button onClick={() => setValue('b')}>Close</button>
        <RadioGroup value={value()}>
          <Radio.Root value="a">
            <Radio.Indicator
              class="animation-test-indicator"
              keepMounted
              onAnimationEnd={notifyAnimationFinished}
              data-testid="indicator-a"
            />
          </Radio.Root>
          <Radio.Root value="a">
            <Radio.Indicator class="animation-test-indicator" keepMounted />
          </Radio.Root>
        </RadioGroup>
      </div>
    ));

    expect(screen.getByTestId('indicator-a')).not.toBe(null);

    const closeButton = screen.getByText('Close');
    await user.click(closeButton);

    await waitFor(() => {
      expect(animationFinished).toBe(true);
    });
  });

  // requires a real browser
  describe.skipIf(isJSDOM)('animations', () => {
    afterEach(() => {
      (globalThis as any).BASE_UI_ANIMATIONS_DISABLED = true;
    });

    it('triggers enter animation via data-starting-style when mounting', async () => {
      (globalThis as any).BASE_UI_ANIMATIONS_DISABLED = false;

      let transitionFinished = false;
      function notifyTransitionFinished() {
        transitionFinished = true;
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

      const [value, setValue] = createSignal('b');

      const { user } = await render(() => (
        <div>
          <style innerHTML={style} />
          <button onClick={() => setValue('a')}>Select a</button>
          <RadioGroup value={value()}>
            <Radio.Root value="a">
              <Radio.Indicator
                class="animation-test-indicator"
                data-testid="indicator-a"
                onTransitionEnd={notifyTransitionFinished}
              />
            </Radio.Root>
            <Radio.Root value="b">
              <Radio.Indicator class="animation-test-indicator" data-testid="indicator-b" />
            </Radio.Root>
          </RadioGroup>
        </div>
      ));
      expect(screen.queryByTestId('indicator-a')).toBe(null);

      await user.click(screen.getByText('Select a'));

      await waitFor(() => {
        expect(transitionFinished).toBe(true);
      });

      expect(screen.getByTestId('indicator-a')).not.toBe(null);
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

      const [value, setValue] = createSignal('a');

      await render(() => (
        <div>
          <style innerHTML={style} />
          <button onClick={() => setValue('b')}>Select b</button>
          <RadioGroup value={value()}>
            <Radio.Root value="a">
              <Radio.Indicator class="animation-test-indicator" data-testid="indicator-a" />
            </Radio.Root>
            <Radio.Root value="b">
              <Radio.Indicator class="animation-test-indicator" data-testid="indicator-b" />
            </Radio.Root>
          </RadioGroup>
        </div>
      ));
      expect(screen.getByTestId('indicator-a')).not.toBe(null);

      fireEvent.click(screen.getByText('Select b'));
      // Upstream's `fireEvent` applies the update synchronously (`act`).
      flush();

      expect(screen.getByTestId('indicator-a')).toHaveAttribute('data-ending-style');

      await waitFor(() => {
        expect(screen.queryByTestId('indicator-a')).toBe(null);
      });
    });
  });
});
