import { createSignal, flush, untrack } from 'solid-js';

import type { JSX } from '@solidjs/web';

import { expect, vi, describe, it } from 'vitest';
import { Menu } from 'base-ui-solid/menu';
import { isJSDOM, fireEvent, screen, waitFor } from '#test-utils';
import { describeMenuConformance } from '../../../test/menuConformance';
import { createRenderer } from '../../../test/menuPortHelpers';
import { act } from '../../../test/utils';

describe('<Menu.RadioItemIndicator />', () => {
  const { render } = createRenderer();
  describeMenuConformance((props) => <Menu.RadioItemIndicator keepMounted {...props} />, {
    refInstanceof: window.HTMLSpanElement,
    render: (node: () => JSX.Element) => {
      return render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.RadioGroup>
                        <Menu.RadioItem value="">{node()}</Menu.RadioItem>
                      </Menu.RadioGroup>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
    },
  });
  it('throws when rendered outside Menu.RadioItem', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(
        render(
          (testProps: any) => <Menu.RadioItemIndicator {...testProps} />,
          () => ({}),
        ),
      ).rejects.toThrow(
        'Base UI: MenuRadioItemContext is missing. MenuRadioItem parts must be placed within <Menu.RadioItem>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
  it.skipIf(isJSDOM)(
    'should remove the indicator when there is no exit animation defined',
    async (componentProps1) => {
      const frameCallbacks: FrameRequestCallback[] = [];
      const requestAnimationFrameSpy = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((callback) => {
          frameCallbacks.push(callback);
          return frameCallbacks.length;
        });
      componentProps1.onTestFinished(() => requestAnimationFrameSpy.mockRestore());
      function Test() {
        const [value, setValue] = createSignal(untrack(() => 'a'));
        return (
          <div>
            <button onClick={() => setValue('b')}>Close</button>
            <Menu.Root open modal={false}>
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup>
                    <Menu.Popup>
                      <Menu.RadioGroup value={value()}>
                        <Menu.RadioItem value="a">
                          <Menu.RadioItemIndicator data-testid="indicator" />
                        </Menu.RadioItem>
                        <Menu.RadioItem value="b">
                          <Menu.RadioItemIndicator keepMounted />
                        </Menu.RadioItem>
                      </Menu.RadioGroup>
                    </Menu.Popup>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>
        );
      }
      await render(
        (testProps: any) => <Test {...testProps} />,
        () => ({}),
      );
      expect(screen.queryByTestId('indicator')).not.toBe(null);
      await waitFor(() => expect(frameCallbacks.length).toBeGreaterThan(0));
      while (frameCallbacks.length > 0) {
        act(() => {
          const callbacks = frameCallbacks.splice(0);
          callbacks.forEach((callback) => callback(performance.now()));
        });
      }
      requestAnimationFrameSpy.mockRestore();
      fireEvent.click(screen.getByText('Close'));
      await waitFor(() => {
        expect(screen.queryByTestId('indicator')).toBe(null);
      });
    },
  );
  it.skipIf(isJSDOM)('should remove the indicator when the animation finishes', async () => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
    let animationFinished = false;
    const notifyAnimationFinished = () => {
      animationFinished = true;
    };
    function Test() {
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
      const [value, setValue] = createSignal(untrack(() => 'a'));
      return (
        <div>
          {}
          <style>{style}</style>
          <button onClick={() => setValue('b')}>Close</button>
          <Menu.Root open modal={false}>
            <Menu.Portal>
              <Menu.Positioner>
                <Menu.Popup>
                  <Menu.RadioGroup value={value()}>
                    <Menu.RadioItem value="a">
                      <Menu.RadioItemIndicator
                        class="animation-test-indicator"
                        data-testid="indicator"
                        keepMounted
                        onAnimationEnd={notifyAnimationFinished}
                      />
                    </Menu.RadioItem>
                    <Menu.RadioItem value="b">
                      <Menu.RadioItemIndicator keepMounted />
                    </Menu.RadioItem>
                  </Menu.RadioGroup>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      );
    }
    const { user } = await render(
      (testProps: any) => <Test {...testProps} />,
      () => ({}),
    );
    expect(screen.getByTestId('indicator')).not.toBe(null);
    const closeButton = screen.getByText('Close');
    await user.click(closeButton);
    await waitFor(() => {
      expect(animationFinished).toBe(true);
    });
  });
  it.skipIf(isJSDOM)(
    'keeps the indicator mounted to play its exit animation when unchecked without keepMounted',
    async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
      function Test() {
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
        const [value, setValue] = createSignal(untrack(() => 'a'));
        return (
          <div>
            {}
            <style>{style}</style>
            <button onClick={() => setValue('b')}>Select b</button>
            <Menu.Root open modal={false}>
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup>
                    <Menu.RadioGroup value={value()}>
                      <Menu.RadioItem value="a">
                        <Menu.RadioItemIndicator
                          class="animation-test-indicator"
                          data-testid="indicator"
                        />
                      </Menu.RadioItem>
                      <Menu.RadioItem value="b">
                        <Menu.RadioItemIndicator />
                      </Menu.RadioItem>
                    </Menu.RadioGroup>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>
        );
      }
      await render(
        (testProps: any) => <Test {...testProps} />,
        () => ({}),
      );
      expect(screen.getByTestId('indicator')).not.toBe(null);
      fireEvent.click(screen.getByText('Select b'));
      // Port note: native fireEvent does not flush Solid updates like React act.
      flush();
      expect(screen.getByTestId('indicator')).toHaveAttribute('data-ending-style');
      await waitFor(() => {
        expect(screen.queryByTestId('indicator')).toBe(null);
      });
    },
  );
});
