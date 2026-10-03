import { afterEach, expect, vi, describe, it } from 'vitest';
import { Show, createSignal } from 'solid-js';
import { Tabs } from 'base-ui-solid/tabs';
import { describeConformance, isJSDOM, render, screen, waitFor } from '#test-utils';

describe('<Tabs.Panel />', () => {
  describeConformance(
    (props: Omit<Tabs.Panel.Props, 'value'>) => <Tabs.Panel value="1" keepMounted {...props} />,
    {
      wrap: (node) => <Tabs.Root>{node()}</Tabs.Root>,
      refInstanceof: window.HTMLDivElement,
    },
  );

  it('throws a descriptive error when rendered outside <Tabs.Root>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(() => <Tabs.Panel value="1" keepMounted />)).rejects.toThrow(
        'Base UI: TabsRootContext is missing. Tabs parts must be placed within <Tabs.Root>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  describe('panels sharing a value', () => {
    it('keeps the surviving registration when a shadowed panel unmounts', async () => {
      function App() {
        const [shadowedMounted, setShadowedMounted] = createSignal(true);

        return (
          <>
            <button type="button" onClick={() => setShadowedMounted(false)}>
              unmount shadowed
            </button>
            <Tabs.Root value="a">
              <Tabs.List>
                <Tabs.Tab value="a">A</Tabs.Tab>
                <Tabs.Tab value="b">B</Tabs.Tab>
              </Tabs.List>
              <Show when={shadowedMounted()}>
                <Tabs.Panel value="b" keepMounted data-testid="shadowed" />
              </Show>
              <Tabs.Panel value="b" keepMounted data-testid="owner" />
            </Tabs.Root>
          </>
        );
      }

      const { user } = await render(() => <App />);

      const tabB = screen.getAllByRole('tab')[1];
      const owner = screen.getByTestId('owner');

      // The last panel to register owns the value.
      expect(tabB).toHaveAttribute('aria-controls', owner.id);

      await user.click(screen.getByRole('button', { name: 'unmount shadowed' }));

      expect(screen.queryByTestId('shadowed')).toBe(null);
      expect(tabB).toHaveAttribute('aria-controls', owner.id);
    });
  });

  it('sets the panel index data attribute', async () => {
    await render(() => (
      <Tabs.Root defaultValue="one">
        <Tabs.List>
          <Tabs.Tab value="one" />
        </Tabs.List>
        <Tabs.Panel value="one" data-testid="panel" />
      </Tabs.Root>
    ));

    expect(screen.getByTestId('panel')).toHaveAttribute('data-index', '0');
  });

  describe('Suspense integration', () => {
    // React-only: React.Suspense + `React.use`. Solid's `<Loading>` keeps already rendered content
    // visible while a later async read is pending instead of showing the fallback again.
    it.skip('renders a panel that suspends when opened with the boundary outside the root', () => {});
  });

  describe.skipIf(isJSDOM)('animations', () => {
    afterEach(() => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
    });

    it('triggers enter animation via data-starting-style when mounting', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      let transitionFinished = false;
      const notifyTransitionFinished = () => {
        transitionFinished = true;
      };

      const style = `
        .animation-test-panel {
          transition: opacity 1ms;
        }

        .animation-test-panel[data-starting-style],
        .animation-test-panel[data-ending-style] {
          opacity: 0;
        }
      `;

      const { user } = await render(() => (
        <div>
          <style innerHTML={style} />
          <Tabs.Root defaultValue="one">
            <Tabs.List>
              <Tabs.Tab value="one">One</Tabs.Tab>
              <Tabs.Tab value="two">Two</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="one">Panel one</Tabs.Panel>
            <Tabs.Panel
              class="animation-test-panel"
              data-testid="panel-two"
              onTransitionEnd={notifyTransitionFinished}
              value="two"
            >
              Panel two
            </Tabs.Panel>
          </Tabs.Root>
        </div>
      ));

      expect(screen.queryByTestId('panel-two')).toBeNull();

      await user.click(screen.getByRole('tab', { name: 'Two' }));

      await waitFor(() => {
        expect(transitionFinished).toBe(true);
      });

      expect(screen.getByTestId('panel-two')).not.toBeNull();
    });

    it('applies data-ending-style before unmount', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const style = `
        @keyframes test-anim {
          to {
            opacity: 0;
          }
        }

        .animation-test-panel[data-ending-style] {
          animation: test-anim 100ms;
        }
      `;

      const { user } = await render(() => (
        <div>
          <style innerHTML={style} />
          <Tabs.Root defaultValue="one">
            <Tabs.List>
              <Tabs.Tab value="one">One</Tabs.Tab>
              <Tabs.Tab value="two">Two</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel class="animation-test-panel" data-testid="panel-one" value="one">
              Panel one
            </Tabs.Panel>
            <Tabs.Panel value="two">Panel two</Tabs.Panel>
          </Tabs.Root>
        </div>
      ));

      expect(screen.getByTestId('panel-one')).not.toBeNull();

      await user.click(screen.getByRole('tab', { name: 'Two' }));

      await waitFor(() => {
        const panel = screen.queryByTestId('panel-one');
        expect(panel).not.toBeNull();
        expect(panel).toHaveAttribute('data-ending-style');
      });

      await waitFor(() => {
        expect(screen.queryByTestId('panel-one')).toBeNull();
      });
    });
  });
});
