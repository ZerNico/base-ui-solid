import type { JSX } from '@solidjs/web';

import { screen } from '#test-utils';
import { expect, vi, describe, it } from 'vitest';
import { Menu } from 'base-ui-solid/menu';
import { createRenderer } from '../../../test/menuPortHelpers';

import { describeMenuConformance } from '../../../test/menuConformance';

describe('Menu filter parts conformance', () => {
  const { render } = createRenderer();
  function renderInPopup(
    node: JSX.Element | (() => JSX.Element),
    filterProps?: Partial<Menu.FilterProvider.Props>,
    withInput = true,
  ) {
    return render(
      (testProps: any) => <Menu.FilterProvider {...testProps} />,
      () => ({
        ...filterProps,
        get children() {
          return (
            <>
              <Menu.Root open>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      {withInput && <Menu.Input aria-label="Filter" />}
                      {/* Port note: evaluate the Solid JSX factory under the popup owner. */}
                      {typeof node === 'function' ? node() : node}
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            </>
          );
        },
      }),
    );
  }
  function renderInList(node: JSX.Element | (() => JSX.Element)) {
    return renderInPopup(() => <Menu.List>{typeof node === 'function' ? node() : node}</Menu.List>);
  }
  describeMenuConformance(Menu.Trigger, {
    refInstanceof: window.HTMLButtonElement,
    render: (node: () => JSX.Element) =>
      render(
        (testProps: any) => <Menu.FilterProvider {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Root>{node()}</Menu.Root>
              </>
            );
          },
        }),
      ),
  });
  describeMenuConformance(Menu.Input, {
    refInstanceof: window.HTMLInputElement,
    render: (node: () => JSX.Element) => renderInPopup(() => node(), undefined, false),
  });
  describeMenuConformance(Menu.Clear, {
    refInstanceof: window.HTMLButtonElement,
    render: (node: () => JSX.Element) => renderInPopup(() => node(), { defaultValue: 'query' }),
  });
  it('excludes Clear from the tab order and accessibility tree', async () => {
    await renderInPopup(() => <Menu.Clear aria-label="Clear filter" />, { defaultValue: 'query' });
    const clear = screen.getByLabelText('Clear filter');
    expect(clear).toHaveAttribute('tabindex', '-1');
    expect(clear).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('button', { name: 'Clear filter' })).toBe(null);
  });
  describeMenuConformance(Menu.Empty, {
    refInstanceof: window.HTMLDivElement,
    render: (node: () => JSX.Element) => renderInPopup(() => node()),
  });
  describeMenuConformance(Menu.List, {
    refInstanceof: window.HTMLDivElement,
    render: (node: () => JSX.Element) => renderInPopup(() => node()),
  });
  describeMenuConformance(
    (props: any) => (
      <Menu.Popup {...props}>
        <Menu.Input aria-label="Filter" />
      </Menu.Popup>
    ),
    {
      refInstanceof: window.HTMLDivElement,
      render: (node: () => JSX.Element) =>
        render(
          (testProps: any) => <Menu.FilterProvider {...testProps} />,
          () => ({
            get children() {
              return (
                <>
                  <Menu.Root open>
                    <Menu.Portal>
                      <Menu.Positioner>{node()}</Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                </>
              );
            },
          }),
        ),
    },
  );
  describeMenuConformance(Menu.Item, {
    refInstanceof: window.HTMLDivElement,
    render: renderInList,
  });
  describeMenuConformance(Menu.LinkItem, {
    refInstanceof: window.HTMLAnchorElement,
    render: renderInList,
  });
  describeMenuConformance(Menu.CheckboxItem, {
    refInstanceof: window.HTMLDivElement,
    render: renderInList,
  });
  describeMenuConformance(
    (props: any) => (
      <Menu.RadioGroup {...props}>
        <Menu.RadioItem value="value" />
      </Menu.RadioGroup>
    ),
    {
      refInstanceof: window.HTMLDivElement,
      render: renderInList,
    },
  );
  describeMenuConformance(Menu.RadioItem, {
    refInstanceof: window.HTMLDivElement,
    render: (node: () => JSX.Element) =>
      renderInList(() => <Menu.RadioGroup defaultValue="value">{node()}</Menu.RadioGroup>),
  });
  describeMenuConformance(Menu.Group, {
    refInstanceof: window.HTMLDivElement,
    render: renderInList,
  });
  describeMenuConformance(Menu.Arrow, {
    refInstanceof: window.HTMLDivElement,
    render: (node: () => JSX.Element) => renderInPopup(() => node()),
  });
  describeMenuConformance(Menu.Backdrop, {
    refInstanceof: window.HTMLDivElement,
    render: (node: () => JSX.Element) =>
      render(
        (testProps: any) => <Menu.FilterProvider {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Root open>
                  <Menu.Portal>
                    {node()}
                    <Menu.Positioner>
                      <Menu.Popup>
                        <Menu.Input aria-label="Filter" />
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </>
            );
          },
        }),
      ),
  });
  describeMenuConformance(Menu.Separator, {
    refInstanceof: window.HTMLDivElement,
    render: renderInList,
  });
  describeMenuConformance(Menu.SubmenuTrigger, {
    refInstanceof: window.HTMLDivElement,
    render: (node: () => JSX.Element) =>
      renderInList(() => (
        <Menu.FilterProvider>
          <Menu.SubmenuRoot>{node()}</Menu.SubmenuRoot>
        </Menu.FilterProvider>
      )),
  });
  it('throws when Trigger is rendered without a root or handle', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(
        render(
          (testProps: any) => <Menu.Trigger {...testProps} />,
          () => ({}),
        ),
      ).rejects.toThrow(
        'Base UI: <Menu.Trigger> must be either used within a <Menu.Root> component or provided with a handle.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
  it.each([
    ['Input', () => <Menu.Input />],
    ['Clear', () => <Menu.Clear />],
    ['Empty', () => <Menu.Empty />],
  ])('throws when <Menu.%s> is rendered without a filter provider', async (part, element) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(render(() => element())).rejects.toThrow(
        `Base UI: <Menu.${part}> must be placed in a menu wrapped in <Menu.FilterProvider>.`,
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
