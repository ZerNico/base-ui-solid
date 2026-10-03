import { expect, vi, describe, it } from 'vitest';
import { createEffect, createSignal, flush, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Tabs } from 'base-ui-solid/tabs';
import {
  describeConformance,
  fireEvent,
  flushMicrotasks,
  isJSDOM,
  render,
  screen,
} from '#test-utils';

// Port note: upstream recreates a merged host ref on every React render. Solid components don't
// re-render, so this component composes the forwarded ref with an internal one once.
function UnstableRefTab(props: JSX.HTMLAttributes<HTMLAnchorElement> & { href?: string }) {
  let internalElement: HTMLAnchorElement | undefined;
  const elementProps = omit(props, 'ref');
  return (
    <a
      {...elementProps}
      ref={(element: HTMLAnchorElement) => {
        internalElement = element;
        (props.ref as ((element: HTMLAnchorElement) => void) | undefined)?.(element);
        return internalElement;
      }}
    />
  );
}

describe('<Tabs.Tab />', () => {
  describeConformance(Tabs.Tab, {
    refInstanceof: window.HTMLButtonElement,
    wrap: (node) => (
      <Tabs.Root>
        <Tabs.List>{node()}</Tabs.List>
      </Tabs.Root>
    ),
  });

  describe('prop: nativeButton', () => {
    it('renders as an anchor and toggles selection when `nativeButton` is false', async () => {
      // Port note: `render={<a href="…" />}` is a React element; render functions are used instead.
      const { user } = await render(() => (
        <Tabs.Root defaultValue="overview">
          <Tabs.List>
            <Tabs.Tab
              nativeButton={false}
              render={(props) => <a {...props} href="#overview" />}
              value="overview"
            >
              Overview
            </Tabs.Tab>
            <Tabs.Tab
              nativeButton={false}
              render={(props) => <a {...props} href="#details" />}
              value="details"
            >
              Details
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
      ));

      const tabs = screen.getAllByRole('tab');
      expect(tabs[0].tagName).toBe('A');
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'false');

      await user.click(tabs[1]);

      expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
      expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    });

    // React-only: renders react-router's `Link` (a React library).
    it.skip('renders a react-router Link', () => {});

    it('settles when the rendered component recreates its merged ref', async () => {
      await render(() => (
        <Tabs.Root defaultValue="overview">
          <Tabs.List>
            <Tabs.Tab
              nativeButton={false}
              render={(props) => <UnstableRefTab {...props} href="#overview" />}
              value="overview"
            >
              Overview
            </Tabs.Tab>
            <Tabs.Tab
              nativeButton={false}
              render={(props) => <UnstableRefTab {...props} href="#details" />}
              value="details"
            >
              Details
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
      ));

      expect(screen.getAllByRole('tab').map((tab) => tab.tabIndex)).toEqual([0, -1]);
    });
  });

  it('throws a descriptive error when rendered outside <Tabs.List>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Port note: when a part throws below another part's element, Solid rethrows the error that
    // `render` rejects with once more as an uncaught error (the browser reports it through
    // `window`'s `error` event). Swallow that duplicate report only.
    const handleWindowError = (event: ErrorEvent) => {
      if (event.message.includes('TabsListContext is missing')) {
        event.preventDefault();
      }
    };
    window.addEventListener('error', handleWindowError);

    try {
      await expect(
        render(() => (
          <Tabs.Root>
            <Tabs.Tab value="1" />
          </Tabs.Root>
        )),
      ).rejects.toThrow(
        'Base UI: TabsListContext is missing. TabsList parts must be placed within <Tabs.List>.',
      );
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
    } finally {
      window.removeEventListener('error', handleWindowError);
      errorSpy.mockRestore();
    }
  });

  describe('pointer interaction', () => {
    function TwoTabs(props: {
      onValueChange?: Tabs.Root.Props['onValueChange'];
      disabledSecond?: boolean;
    }) {
      return (
        <Tabs.Root defaultValue={0} onValueChange={props.onValueChange}>
          <Tabs.List activateOnFocus>
            <Tabs.Tab value={0}>One</Tabs.Tab>
            <Tabs.Tab value={1} disabled={props.disabledSecond}>
              Two
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
      );
    }

    it('does not re-commit the value when the active tab is pressed', async () => {
      const handleValueChange = vi.fn();
      const { user } = await render(() => <TwoTabs onValueChange={handleValueChange} />);

      const [firstTab] = screen.getAllByRole('tab');
      await user.pointer({ keys: '[MouseLeft]', target: firstTab });

      expect(handleValueChange).not.toHaveBeenCalled();
      expect(firstTab).toHaveAttribute('aria-selected', 'true');
    });

    it('does not activate a disabled tab that is pressed and focused', async () => {
      const handleValueChange = vi.fn();
      const { user } = await render(() => (
        <TwoTabs onValueChange={handleValueChange} disabledSecond />
      ));

      const [firstTab, secondTab] = screen.getAllByRole('tab');
      await user.pointer({ keys: '[MouseLeft]', target: secondTab });
      // Disabled tabs stay focusable, and `activateOnFocus` must not select them.
      secondTab.focus();
      await flushMicrotasks();

      expect(secondTab).toHaveFocus();
      expect(handleValueChange).not.toHaveBeenCalled();
      expect(firstTab).toHaveAttribute('aria-selected', 'true');
      expect(secondTab).toHaveAttribute('aria-selected', 'false');
    });

    it('does not activate a tab focused by a held secondary-button press', async () => {
      const handleValueChange = vi.fn();
      const { user } = await render(() => <TwoTabs onValueChange={handleValueChange} />);

      const [, secondTab] = screen.getAllByRole('tab');
      await user.pointer({ keys: '[MouseRight>]', target: secondTab });
      secondTab.focus();
      await flushMicrotasks();

      expect(handleValueChange).not.toHaveBeenCalled();
      expect(secondTab).toHaveAttribute('aria-selected', 'false');
    });

    it('activates on focus again once a secondary-button press has ended', async () => {
      const handleValueChange = vi.fn();
      const { user } = await render(() => <TwoTabs onValueChange={handleValueChange} />);

      const [firstTab, secondTab] = screen.getAllByRole('tab');
      await user.pointer({ keys: '[MouseRight]', target: secondTab });

      expect(handleValueChange).not.toHaveBeenCalled();

      firstTab.focus();
      await flushMicrotasks();
      await user.keyboard('{ArrowRight}');

      expect(handleValueChange).toHaveBeenCalledTimes(1);
      expect(secondTab).toHaveAttribute('aria-selected', 'true');
    });

    it('activates on focus again once a secondary-button press is cancelled', async () => {
      const handleValueChange = vi.fn();
      const { user } = await render(() => <TwoTabs onValueChange={handleValueChange} />);

      const [firstTab, secondTab] = screen.getAllByRole('tab');
      fireEvent.pointerDown(secondTab, { button: 2 });
      fireEvent.pointerCancel(secondTab);

      firstTab.focus();
      await flushMicrotasks();
      await user.keyboard('{ArrowRight}');

      expect(handleValueChange).toHaveBeenCalledTimes(1);
      expect(secondTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('keyboard activation', () => {
    it.each([
      ['Enter', '{Enter}'],
      ['Space', ' '],
    ])('activates the focused tab with %s when `activateOnFocus` is false', async (_label, key) => {
      const { user } = await render(() => (
        <Tabs.Root defaultValue={0}>
          <Tabs.List>
            <Tabs.Tab value={0}>One</Tabs.Tab>
            <Tabs.Tab value={1}>Two</Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
      ));

      const [firstTab, secondTab] = screen.getAllByRole('tab');
      firstTab.focus();
      await flushMicrotasks();
      await user.keyboard('{ArrowRight}');

      expect(secondTab).toHaveFocus();
      expect(secondTab).toHaveAttribute('aria-selected', 'false');

      await user.keyboard(key);

      expect(secondTab).toHaveAttribute('aria-selected', 'true');
      expect(firstTab).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('state', () => {
    it.skipIf(isJSDOM)('exposes tab activation direction through the render prop', async () => {
      const tabRenderMock = vi.fn();
      const [value, setValue] = createSignal(0);

      // Port note: Solid calls the render function once with a reactive `state`, so an effect
      // records each state the render prop sees (upstream records each render call).
      function renderTab(tabValue: number) {
        return (props: Record<string, any>, state: Tabs.Tab.State) => {
          createEffect(
            () => ({ ...state }),
            (snapshot) => {
              tabRenderMock({ value: tabValue, ...snapshot });
            },
          );
          return <button {...props} />;
        };
      }

      await render(() => (
        <Tabs.Root value={value()}>
          <Tabs.List>
            <Tabs.Tab value={0} render={renderTab(0)}>
              Tab 0
            </Tabs.Tab>
            <Tabs.Tab value={1} render={renderTab(1)}>
              Tab 1
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
      ));

      tabRenderMock.mockClear();

      setValue(1);
      flush();
      await flushMicrotasks();

      expect(
        tabRenderMock.mock.calls.some(
          ([state]) =>
            state.value === 1 && state.active === true && state.tabActivationDirection === 'right',
        ),
      ).toBe(true);
    });
  });
});
