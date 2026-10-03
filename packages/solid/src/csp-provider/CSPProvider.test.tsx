import { ScrollArea } from '../scroll-area';
import { CSPProvider } from '.';
import { render } from '#test-utils';

function queryDisableScrollbarStyle() {
  const styles = Array.from(document.querySelectorAll('style'));
  return (
    styles.find((element) => element.textContent?.includes('.base-ui-disable-scrollbar')) ?? null
  );
}

describe('<CSPProvider />', () => {
  it('does not render inline style tags when disableStyleElements is true', async () => {
    await render(() => (
      <CSPProvider disableStyleElements>
        <ScrollArea.Root>
          <ScrollArea.Viewport />
        </ScrollArea.Root>
      </CSPProvider>
    ));

    expect(queryDisableScrollbarStyle()).toBeNull();
  });

  // TODO(port): needs Select
  it.skip('does not render Select inline style tags when disableStyleElements is true', async () => {
    // Upstream renders `<Select.Root defaultOpen>` with a popup inside `<CSPProvider
    // disableStyleElements>` and asserts that no disable-scrollbar style element is rendered.
  });

  it('applies nonce to inline style tags', async () => {
    await render(() => (
      <CSPProvider nonce="test-nonce">
        <ScrollArea.Root>
          <ScrollArea.Viewport />
        </ScrollArea.Root>
      </CSPProvider>
    ));

    const style = queryDisableScrollbarStyle();
    expect(style).not.toBeNull();
    expect(style).toHaveAttribute('nonce', 'test-nonce');
  });

  it('renders inline style tags by default', async () => {
    await render(() => (
      <ScrollArea.Root>
        <ScrollArea.Viewport />
      </ScrollArea.Root>
    ));

    // Style already exists from previous test due to React 19's hoisting,
    // but we can still verify it's present
    // Port note: Solid doesn't hoist; the style element is rendered by this ScrollArea.
    const style = queryDisableScrollbarStyle();
    expect(style).not.toBeNull();
  });
});
