import { For } from 'solid-js';
import { expect, vi, describe, it } from 'vitest';
import { Toast } from 'base-ui-solid/toast';
import { createRenderer, describeConformance, isJSDOM, screen, waitFor } from '#test-utils';

const toast: Toast.Root.ToastObject = {
  id: 'test',
  title: 'Toast title',
};

describe('<Toast.Arrow />', () => {
  const { render } = createRenderer();

  describeConformance(Toast.Arrow, {
    refInstanceof: window.Element,
    wrap: (node) => (
      <Toast.Provider>
        <Toast.Positioner toast={toast}>{node()}</Toast.Positioner>
      </Toast.Provider>
    ),
  });

  it.skipIf(isJSDOM)('mirrors the resolved side of its positioner', async () => {
    function App() {
      let anchorRef: HTMLButtonElement | null = null;
      const toastManager = Toast.useToastManager();
      return (
        <>
          <button
            type="button"
            ref={(element) => {
              anchorRef = element;
            }}
            style={{
              position: 'absolute',
              top: '200px',
              left: '100px',
              width: '80px',
              height: '20px',
            }}
            onClick={() =>
              toastManager.add({
                title: 'title',
                positionerProps: { anchor: anchorRef, side: 'bottom' },
              })
            }
          >
            anchor
          </button>
          <Toast.Viewport>
            <For each={toastManager.toasts} keyed={(toastItem) => toastItem.id}>
              {(toastItem) => (
                <Toast.Positioner toast={toastItem()}>
                  <Toast.Root toast={toastItem()}>
                    <Toast.Arrow data-testid="arrow" />
                    <Toast.Title />
                  </Toast.Root>
                </Toast.Positioner>
              )}
            </For>
          </Toast.Viewport>
        </>
      );
    }

    const { user } = await render(() => (
      <Toast.Provider>
        <App />
      </Toast.Provider>
    ));

    await user.click(screen.getByRole('button', { name: 'anchor' }));

    const arrow = screen.getByTestId('arrow');
    await waitFor(() => expect(arrow).toHaveAttribute('data-side', 'bottom'));
    expect(arrow).toHaveAttribute('aria-hidden', 'true');
  });

  it('throws a descriptive error when rendered outside <Toast.Positioner>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Port note: when a part throws below another element, Solid rethrows the error that `render`
    // rejects with once more as an uncaught error (reported through `window`'s `error` event).
    // Swallow that duplicate report only.
    const handleWindowError = (event: ErrorEvent) => {
      if (event.message.includes('ToastPositionerContext is missing')) {
        event.preventDefault();
      }
    };
    window.addEventListener('error', handleWindowError);

    try {
      await expect(
        render(() => (
          <Toast.Provider>
            <Toast.Arrow />
          </Toast.Provider>
        )),
      ).rejects.toThrow(
        'Base UI: ToastPositionerContext is missing. ToastPositioner parts must be placed within <Toast.Positioner>.',
      );
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
    } finally {
      window.removeEventListener('error', handleWindowError);
      errorSpy.mockRestore();
    }
  });
});
