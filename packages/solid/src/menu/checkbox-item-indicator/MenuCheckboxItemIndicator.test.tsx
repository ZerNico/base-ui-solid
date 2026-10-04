import { createSignal, flush, untrack } from 'solid-js';

import { expect, vi, describe, beforeEach, it } from 'vitest';
import { Menu } from 'base-ui-solid/menu';
import { isJSDOM, fireEvent, screen, waitFor } from '#test-utils';
import { describeMenuConformance } from '../../../test/menuConformance';
import { createRenderer } from '../../../test/menuPortHelpers';
import { act } from '../../../test/utils';

describe('<Menu.CheckboxItemIndicator />', () => {
  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });
  const { render } = createRenderer();
  describeMenuConformance((props) => <Menu.CheckboxItemIndicator keepMounted {...props} />, {
    refInstanceof: window.HTMLSpanElement,
    render: (node) =>
      render(() => (
        <Menu.Root open>
          <Menu.Portal>
            <Menu.Positioner>
              <Menu.Popup>
                <Menu.CheckboxItem>{node()}</Menu.CheckboxItem>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      )),
  });
  it('throws when rendered outside Menu.CheckboxItem', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(
        render(
          (testProps: any) => <Menu.CheckboxItemIndicator {...testProps} />,
          () => ({}),
        ),
      ).rejects.toThrow(
        'Base UI: MenuCheckboxItemContext is missing. MenuCheckboxItem parts must be placed within <Menu.CheckboxItem>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
  it.skipIf(isJSDOM)(
    'should remove the indicator when there is no exit animation defined',
    async ({ onTestFinished }) => {
      const frameCallbacks: FrameRequestCallback[] = [];
      const requestAnimationFrameSpy = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((callback) => {
          frameCallbacks.push(callback);
          return frameCallbacks.length;
        });
      onTestFinished(() => requestAnimationFrameSpy.mockRestore());
      function Test() {
        const [checked, setChecked] = createSignal(untrack(() => true));
        return (
          <div>
            <button onClick={() => setChecked(false)}>Close</button>
            <Menu.Root open modal={false}>
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup>
                    <Menu.CheckboxItem checked={checked()}>
                      <Menu.CheckboxItemIndicator data-testid="indicator" />
                    </Menu.CheckboxItem>
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
      const [checked, setChecked] = createSignal(untrack(() => true));
      return (
        <div>
          {}
          <style>{style}</style>
          <button onClick={() => setChecked(false)}>Close</button>
          <Menu.Root open modal={false}>
            <Menu.Portal>
              <Menu.Positioner>
                <Menu.Popup>
                  <Menu.CheckboxItem checked={checked()}>
                    <Menu.CheckboxItemIndicator
                      class="animation-test-indicator"
                      data-testid="indicator"
                      keepMounted
                      onAnimationEnd={notifyAnimationFinished}
                    />
                  </Menu.CheckboxItem>
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
    expect(screen.getByTestId('indicator')).not.toHaveAttribute('hidden');
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
        const [checked, setChecked] = createSignal(untrack(() => true));
        return (
          <div>
            {}
            <style>{style}</style>
            <button onClick={() => setChecked(false)}>Close</button>
            <Menu.Root open modal={false}>
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup>
                    <Menu.CheckboxItem checked={checked()}>
                      <Menu.CheckboxItemIndicator
                        class="animation-test-indicator"
                        data-testid="indicator"
                      />
                    </Menu.CheckboxItem>
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
      fireEvent.click(screen.getByText('Close'));
      // Port note: native fireEvent does not flush Solid updates like React act.
      flush();
      expect(screen.getByTestId('indicator')).toHaveAttribute('data-ending-style');
      await waitFor(() => {
        expect(screen.queryByTestId('indicator')).toBe(null);
      });
    },
  );
});
