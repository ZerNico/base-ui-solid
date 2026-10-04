import { createSignal, flush, untrack, onSettled } from 'solid-js';

import { expect, vi, describe, beforeEach, it } from 'vitest';
import { fireEvent, screen, waitFor, waitForPositioned, resetBrowserPointer } from '#test-utils';
import { Menu } from 'base-ui-solid/menu';
import { createRenderer } from '../../../test/menuPortHelpers';
import { act } from '../../../test/utils';

describe('filtered Menu items', () => {
  beforeEach(resetBrowserPointer);
  const { render } = createRenderer();
  // Port note: port-specific regressions for child materialization ownership and replacement.
  it('updates array-valued children in a plain menu (port regression)', async () => {
    const [label, setLabel] = createSignal(['Archive']);
    await render(() => (
      <Menu.Root open>
        <Menu.Portal>
          <Menu.Positioner anchor={document.body}>
            <Menu.Popup>
              <Menu.Item>{label()}</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));
    expect(screen.getByRole('menuitem', { name: 'Archive' })).toBeVisible();
    setLabel(['Delete']);
    flush();
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  });

  // Port note: Solid must keep reappearing descendant bindings under a live owner.
  it('updates descendant text after filtering an item out and back in (port regression)', async () => {
    const [count, setCount] = createSignal(1);
    const mounts = vi.fn();
    const disposals = vi.fn();
    function Label() {
      mounts();
      onSettled(() => disposals);
      return <span>Archive {count()}</span>;
    }
    const { user } = await render(() => (
      <Menu.FilterProvider>
        <Menu.Root open>
          <Menu.Portal>
            <Menu.Positioner anchor={document.body}>
              <Menu.Popup>
                <Menu.Input aria-label="Filter actions" />
                <Menu.List>
                  <Menu.Item>
                    <Label />
                  </Menu.Item>
                  <Menu.Item>Delete</Menu.Item>
                </Menu.List>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </Menu.FilterProvider>
    ));
    const input = screen.getByRole('searchbox');
    expect(mounts).toHaveBeenCalledOnce();
    await user.type(input, 'delete');
    expect(screen.queryByRole('menuitem', { name: 'Archive 1' })).toBe(null);
    expect(disposals).toHaveBeenCalledOnce();
    await user.clear(input);
    expect(mounts).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('menuitem', { name: 'Archive 1' })).toBeVisible();
    setCount(2);
    flush();
    expect(screen.getByRole('menuitem', { name: 'Archive 2' })).toBeVisible();
  });

  it('keeps focus on the input when items are pressed', async () => {
    const handleItemClick = vi.fn();
    const { user } = await render(
      (testProps: any) => <Menu.FilterProvider {...testProps} />,
      () => ({
        get children() {
          return (
            <>
              <Menu.Root open>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.Input aria-label="Filter actions" />
                      <Menu.List>
                        <Menu.Item closeOnClick={false} onClick={handleItemClick}>
                          Rename
                        </Menu.Item>
                        <Menu.LinkItem href="#details">Open details</Menu.LinkItem>
                        <Menu.CheckboxItem>Show details</Menu.CheckboxItem>
                        <Menu.RadioGroup>
                          <Menu.RadioItem value="date">Sort by date</Menu.RadioItem>
                        </Menu.RadioGroup>
                      </Menu.List>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            </>
          );
        },
      }),
    );
    const input = screen.getByRole('searchbox', { name: 'Filter actions' });
    await user.click(input);
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    expect(input).toHaveFocus();
    expect(handleItemClick).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('menuitem', { name: 'Open details' }));
    expect(input).toHaveFocus();
    const checkboxItem = screen.getByRole('menuitemcheckbox', { name: 'Show details' });
    await user.click(checkboxItem);
    expect(input).toHaveFocus();
    expect(checkboxItem).toHaveAttribute('aria-checked', 'true');
    const radioItem = screen.getByRole('menuitemradio', { name: 'Sort by date' });
    await user.click(radioItem);
    expect(input).toHaveFocus();
    expect(radioItem).toHaveAttribute('aria-checked', 'true');
  });
  describe('item text resolution', () => {
    it('matches text that a descendant rendered after the item registered', async () => {
      let setLabel: (label: string) => void = () => {};
      function AsyncLabel() {
        const [label, setLabelState] = createSignal(untrack(() => 'Loading'));
        setLabel = setLabelState;
        return <>{label()}</>;
      }
      // Port note: triggerless fixtures use a DOM anchor to exercise filtering with a positioned popup.
      const { user } = await render(
        (testProps: any) => <Menu.FilterProvider {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Root open>
                  <Menu.Portal>
                    <Menu.Positioner anchor={document.body}>
                      <Menu.Popup>
                        <Menu.Input aria-label="Filter actions" />
                        <Menu.List>
                          <Menu.Item>
                            <AsyncLabel />
                          </Menu.Item>
                          <Menu.Item>Delete</Menu.Item>
                        </Menu.List>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </>
            );
          },
        }),
      );
      // Port note: settle Solid positioning before asserting rendered visibility.
      await waitForPositioned(screen.getByRole('dialog').parentElement!);
      await act(async () => setLabel('Rename'));
      expect(screen.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
      await user.type(screen.getByRole('searchbox', { name: 'Filter actions' }), 'rename');
      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: 'Delete' })).toBe(null);
      });
      expect(screen.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
    });
    it('stops matching text that a descendant no longer renders', async () => {
      let setLabel: (label: string) => void = () => {};
      function AsyncLabel() {
        const [label, setLabelState] = createSignal(untrack(() => 'Rename'));
        setLabel = setLabelState;
        return <>{label()}</>;
      }
      const { user } = await render(
        (testProps: any) => <Menu.FilterProvider {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Root open>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup>
                        <Menu.Input aria-label="Filter actions" />
                        <Menu.List>
                          <Menu.Item data-testid="async-item">
                            <AsyncLabel />
                          </Menu.Item>
                          <Menu.Item>Delete</Menu.Item>
                        </Menu.List>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </>
            );
          },
        }),
      );
      await act(async () => setLabel(''));
      await user.type(screen.getByRole('searchbox', { name: 'Filter actions' }), 'rename');
      await waitFor(() => {
        expect(screen.queryByTestId('async-item')).toBe(null);
      });
    });
    it('matches an item whose children are an array while it is filtered out', async () => {
      const { user } = await render(
        (testProps: any) => <Menu.FilterProvider {...testProps} />,
        () => ({
          get children() {
            return (
              <>
                <Menu.Root defaultOpen>
                  <Menu.Trigger>Actions</Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner>
                      <Menu.Popup>
                        <Menu.Input aria-label="Filter actions" />
                        <Menu.List>
                          <Menu.Item>
                            {'Re'}
                            {'name'}
                          </Menu.Item>
                          <Menu.Item>Delete</Menu.Item>
                        </Menu.List>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </>
            );
          },
        }),
      );
      const input = screen.getByRole('searchbox', { name: 'Filter actions' });
      // Hide it, so its DOM node goes away and only the children remain as a text source.
      await user.type(input, 'del');
      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: 'Rename' })).toBe(null);
      });
      fireEvent.input(input, { target: { value: 'rena' } });
      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'Rename' })).toBeVisible();
      });
      expect(screen.queryByRole('menuitem', { name: 'Delete' })).toBe(null);
    });
    it('keeps the rendered text of a hidden item whose children render different text', async () => {
      const translations: Record<string, string> = { Rename: 'Zmień nazwę', Delete: 'Usuń' };
      function Translate(props: { children: string }) {
        return <>{translations[props.children]}</>;
      }
      function Test(props: { value: string; tick: number }) {
        return (
          // Port note: give this triggerless filtering fixture a DOM anchor so visibility can be asserted.
          <Menu.FilterProvider value={props.value}>
            <Menu.Root open>
              <Menu.Portal>
                <Menu.Positioner anchor={document.body}>
                  <Menu.Popup data-tick={props.tick}>
                    <Menu.Input aria-label="Filter actions" />
                    <Menu.List>
                      <Menu.Item>
                        <Translate>Rename</Translate>
                      </Menu.Item>
                      <Menu.Item>
                        <Translate>Delete</Translate>
                      </Menu.Item>
                    </Menu.List>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </Menu.FilterProvider>
        );
      }
      const { setProps } = await render(
        (testProps: any) => <Test {...testProps} />,
        () => ({
          value: '',
          tick: 0,
        }),
      );
      // Port note: settle Solid positioning before asserting rendered visibility.
      await waitForPositioned(screen.getByRole('dialog').parentElement!);
      await setProps({ value: 'usu', tick: 0 });
      expect(screen.queryByRole('menuitem', { name: 'Zmień nazwę' })).toBe(null);
      // Re-render the hidden item with the same children.
      await setProps({ value: 'usu', tick: 1 });
      await setProps({ value: 'zmie', tick: 1 });
      expect(screen.getByRole('menuitem', { name: 'Zmień nazwę' })).toBeVisible();
      expect(screen.queryByRole('menuitem', { name: 'Usuń' })).toBe(null);
    });
    it('matches the new children of an item that changed while it was filtered out', async () => {
      function Test(props: { value: string; label: string }) {
        return (
          // Port note: give this triggerless filtering fixture a DOM anchor so visibility can be asserted.
          <Menu.FilterProvider value={props.value}>
            <Menu.Root open>
              <Menu.Portal>
                <Menu.Positioner anchor={document.body}>
                  <Menu.Popup>
                    <Menu.Input aria-label="Filter actions" />
                    <Menu.List>
                      <Menu.Item>{props.label}</Menu.Item>
                      <Menu.Item>Delete</Menu.Item>
                    </Menu.List>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </Menu.FilterProvider>
        );
      }
      const { setProps } = await render(
        (testProps: any) => <Test {...testProps} />,
        () => ({
          value: '',
          label: 'Rename',
        }),
      );
      // Port note: settle Solid positioning before asserting rendered visibility.
      await waitForPositioned(screen.getByRole('dialog').parentElement!);
      await setProps({ value: 'del', label: 'Rename' });
      await setProps({ value: 'del', label: 'Duplicate' });
      await setProps({ value: 'dup', label: 'Duplicate' });
      expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toBeVisible();
    });
    it('matches the updated text of an item rendered through its render element', async () => {
      function Test(props: { value: string; name: string }) {
        return (
          // Port note: give this triggerless filtering fixture a DOM anchor so visibility can be asserted.
          <Menu.FilterProvider value={props.value}>
            <Menu.Root open>
              <Menu.Portal>
                <Menu.Positioner anchor={document.body}>
                  <Menu.Popup>
                    <Menu.Input aria-label="Filter actions" />
                    <Menu.List>
                      <Menu.Item
                        render={(renderProps) => <div {...renderProps}>{props.name}</div>}
                      />
                      <Menu.Item>Delete</Menu.Item>
                    </Menu.List>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </Menu.FilterProvider>
        );
      }
      const { setProps } = await render(
        (testProps: any) => <Test {...testProps} />,
        () => ({
          value: '',
          name: 'One',
        }),
      );
      await setProps({ value: '', name: 'Two' });
      await setProps({ value: 'two', name: 'Two' });
      expect(screen.getByRole('menuitem', { name: 'Two' })).toBeVisible();
    });
    // React-only: Solid render callbacks are opaque; hidden JSX cannot be inspected as a React element.
    it.skip('matches a render element whose text changed while the item was filtered out', async () => {
      function Test(props: { value: string; name: string }) {
        return (
          <Menu.FilterProvider value={props.value}>
            <Menu.Root open>
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup>
                    <Menu.Input aria-label="Filter actions" />
                    <Menu.List>
                      <Menu.Item
                        render={(renderProps) => <div {...renderProps}>{props.name}</div>}
                      />
                      <Menu.Item>Delete</Menu.Item>
                    </Menu.List>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </Menu.FilterProvider>
        );
      }
      const { setProps } = await render(
        (testProps: any) => <Test {...testProps} />,
        () => ({
          value: 'two',
          name: 'One',
        }),
      );
      expect(screen.queryByRole('menuitem', { name: 'One' })).toBe(null);
      await setProps({ value: 'two', name: 'Two' });
      expect(screen.getByRole('menuitem', { name: 'Two' })).toBeVisible();
    });
  });
  describe('disabled items', () => {
    let onDisabledClick = vi.fn();
    beforeEach(() => {
      onDisabledClick = vi.fn();
    });
    function DisabledItemMenu() {
      return (
        <Menu.FilterProvider>
          <Menu.Root defaultOpen>
            <Menu.Trigger>Actions</Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner>
                <Menu.Popup>
                  <Menu.Input aria-label="Filter actions" />
                  <Menu.List>
                    <Menu.Item>Rename</Menu.Item>
                    <Menu.Item disabled onClick={onDisabledClick}>
                      Archive
                    </Menu.Item>
                    <Menu.Item>Delete</Menu.Item>
                  </Menu.List>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </Menu.FilterProvider>
      );
    }
    it('keeps a disabled item reachable with the arrow keys', async () => {
      const { user } = await render(
        (testProps: any) => <DisabledItemMenu {...testProps} />,
        () => ({}),
      );
      const input = screen.getByRole('searchbox', { name: 'Filter actions' });
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
      await user.keyboard('[ArrowDown][ArrowDown]');
      // Menus keep disabled items discoverable rather than skipping them.
      expect(input).toHaveAttribute(
        'aria-activedescendant',
        screen.getByRole('menuitem', { name: 'Archive' }).id,
      );
    });
    it('does not activate a highlighted disabled item with Enter', async () => {
      const { user } = await render(
        (testProps: any) => <DisabledItemMenu {...testProps} />,
        () => ({}),
      );
      const input = screen.getByRole('searchbox', { name: 'Filter actions' });
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
      await user.keyboard('[ArrowDown][ArrowDown][Enter]');
      expect(onDisabledClick).not.toHaveBeenCalled();
      expect(screen.getByRole('menu')).toBeVisible();
    });
  });
});
