import { expect, describe, it } from 'vitest';
import { NavigationMenu } from 'base-ui-solid/navigation-menu';
import {
  createRenderer,
  describeConformance,
  fireEvent,
  flushMicrotasks,
  renderToString,
  screen,
  waitFor,
} from '#test-utils';
import { ContentWithKeepMounted } from './NavigationMenuContent.fixtures';

describe('<NavigationMenu.Content />', () => {
  const { render } = createRenderer();

  describeConformance.skip(NavigationMenu.Content, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <NavigationMenu.Root value="test">
        <NavigationMenu.Item>{node()}</NavigationMenu.Item>
        <NavigationMenu.Portal>
          <NavigationMenu.Positioner>
            <NavigationMenu.Popup>
              <NavigationMenu.Viewport />
            </NavigationMenu.Popup>
          </NavigationMenu.Positioner>
        </NavigationMenu.Portal>
      </NavigationMenu.Root>
    ),
  });

  describe('server-side rendering', () => {
    // Port note: the server-rendered tree is the `ContentWithKeepMounted` fixture (see PORTING.md).
    it('keeps the content mounted (hidden) in the DOM when keepMounted is true', async () => {
      await renderToString(ContentWithKeepMounted, { keepMounted: true });

      const contents = screen.queryAllByTestId('content-1');
      expect(contents.length).toBe(1);
    });

    it('does not keep the content mounted in the DOM when keepMounted is false', async () => {
      await renderToString(ContentWithKeepMounted, { keepMounted: false });

      const contents = screen.queryAllByTestId('content-1');
      expect(contents.length).toBe(0);
    });
  });

  it('keeps the content mounted (hidden) post-hydration when keepMounted is true', async () => {
    await render(() => (
      <NavigationMenu.Root>
        <NavigationMenu.List>
          <NavigationMenu.Item>
            <NavigationMenu.Trigger>Item 1</NavigationMenu.Trigger>
            <NavigationMenu.Content keepMounted data-testid="content-1">
              <NavigationMenu.Link href="#link-1">Link 1</NavigationMenu.Link>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        </NavigationMenu.List>
        <NavigationMenu.Portal>
          <NavigationMenu.Positioner>
            <NavigationMenu.Popup>
              <NavigationMenu.Viewport />
            </NavigationMenu.Popup>
          </NavigationMenu.Positioner>
        </NavigationMenu.Portal>
      </NavigationMenu.Root>
    ));

    const contents = screen.queryAllByTestId('content-1');
    expect(contents.length).toBe(1);
    expect(contents[0]).toHaveAttribute('hidden');
  });

  it('does not keep the content mounted post-hydration when keepMounted is false', async () => {
    await render(() => (
      <NavigationMenu.Root>
        <NavigationMenu.List>
          <NavigationMenu.Item>
            <NavigationMenu.Trigger>Item 1</NavigationMenu.Trigger>
            <NavigationMenu.Content data-testid="content-1">
              <NavigationMenu.Link href="#link-1">Link 1</NavigationMenu.Link>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        </NavigationMenu.List>
        <NavigationMenu.Portal>
          <NavigationMenu.Positioner>
            <NavigationMenu.Popup>
              <NavigationMenu.Viewport />
            </NavigationMenu.Popup>
          </NavigationMenu.Positioner>
        </NavigationMenu.Portal>
      </NavigationMenu.Root>
    ));

    const contents = screen.queryAllByTestId('content-1');
    expect(contents.length).toBe(0);
  });

  it('moves content into the popup and keeps it there when switching triggers', async () => {
    await render(() => (
      <NavigationMenu.Root>
        <NavigationMenu.List data-testid="list">
          <NavigationMenu.Item value="item-1">
            <NavigationMenu.Trigger>Item 1</NavigationMenu.Trigger>
            <NavigationMenu.Content keepMounted data-testid="content-1">
              <NavigationMenu.Link href="#link-1">Link 1</NavigationMenu.Link>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
          <NavigationMenu.Item value="item-2">
            <NavigationMenu.Trigger>Item 2</NavigationMenu.Trigger>
            <NavigationMenu.Content keepMounted data-testid="content-2">
              <NavigationMenu.Link href="#link-2">Link 2</NavigationMenu.Link>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        </NavigationMenu.List>
        <NavigationMenu.Portal>
          <NavigationMenu.Positioner>
            <NavigationMenu.Popup>
              <NavigationMenu.Viewport data-testid="viewport" />
            </NavigationMenu.Popup>
          </NavigationMenu.Positioner>
        </NavigationMenu.Portal>
      </NavigationMenu.Root>
    ));

    const list = screen.getByTestId('list');

    fireEvent.click(screen.getByRole('button', { name: 'Item 1' }));
    await flushMicrotasks();

    const viewport = screen.getByTestId('viewport');
    const content1 = screen.getByTestId('content-1');
    expect(viewport.contains(content1)).toBe(true);
    expect(list.contains(content1)).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Item 2' }));
    await flushMicrotasks();

    await waitFor(() => {
      expect(screen.queryByTestId('content-2')).not.toBe(null);
    });

    const content1After = screen.queryByTestId('content-1');
    const content2 = screen.queryByTestId('content-2');
    if (!content1After || !content2) {
      throw new Error('Expected both contents to remain mounted inside the viewport.');
    }
    expect(viewport.contains(content1After)).toBe(true);
    expect(viewport.contains(content2)).toBe(true);
  });

  it('keeps content mounted inside the popup when closed if the portal is kept mounted', async () => {
    const { user } = await render(() => (
      <NavigationMenu.Root>
        <NavigationMenu.List>
          <NavigationMenu.Item value="item-1">
            <NavigationMenu.Trigger>Item 1</NavigationMenu.Trigger>
            <NavigationMenu.Content keepMounted data-testid="content-1">
              <NavigationMenu.Link href="#link-1">Link 1</NavigationMenu.Link>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        </NavigationMenu.List>
        <NavigationMenu.Portal keepMounted>
          <NavigationMenu.Positioner>
            <NavigationMenu.Popup>
              <NavigationMenu.Viewport data-testid="viewport" />
            </NavigationMenu.Popup>
          </NavigationMenu.Positioner>
        </NavigationMenu.Portal>
      </NavigationMenu.Root>
    ));

    await user.click(screen.getByRole('button', { name: 'Item 1' }));
    await flushMicrotasks();

    const viewport = screen.getByTestId('viewport');
    expect(viewport.contains(screen.getByTestId('content-1'))).toBe(true);

    await user.keyboard('{Escape}');
    await flushMicrotasks();

    await waitFor(() => {
      expect(screen.getByTestId('content-1')).toHaveAttribute('hidden');
    });

    expect(viewport.contains(screen.getByTestId('content-1'))).toBe(true);
  });
});
